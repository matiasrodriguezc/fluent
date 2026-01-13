import os
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.utilities import SQLDatabase
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from database import engine as local_engine
import models
import traceback

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_SMART = os.getenv("MODEL_SMART", "gemini-1.5-pro-001")

llm = ChatGoogleGenerativeAI(model=MODEL_SMART, temperature=0, google_api_key=GOOGLE_API_KEY)
SessionLocal = sessionmaker(bind=local_engine)

def get_datasources_with_metadata(user_id: str):
    """
    Recupera las fuentes Y sus descripciones (DataAssets) para que el LLM decida.
    """
    session = SessionLocal()
    try:
        results = []
        # Join entre DataSource y DataAsset para tener la info completa
        # Buscamos sources del usuario
        sources = session.query(models.DataSource).filter(models.DataSource.user_id == user_id).all()
        
        for src in sources:
            # Buscamos el asset asociado (que tiene la descripción/schema)
            asset = session.query(models.DataAsset).filter(models.DataAsset.data_source_id == src.id).first()
            description = asset.description if asset else "Sin información"
            
            results.append({
                "id": str(src.id),
                "name": src.name,
                "type": src.type,
                "db_url": src.connection_string,
                "description": description # <--- ESTO ES LO QUE LEE EL LLM
            })
            
        return results
    finally: session.close()

async def select_best_datasource(question: str, sources: list):
    # Generamos un contexto limpio texto
    context_str = ""
    for s in sources:
        # Ejemplo: "ID: 123 | TIPO: MYSQL | CONTENIDO: Base con tablas: clientes(id, nombre), pedidos..."
        context_str += f"- ID: {s['id']} | TIPO: {s['type']} | NOMBRE: {s['name']} | CONTENIDO: {s['description'][:500]}...\n" # Limitamos a 500 chars por fuente para no saturar

    print(f"🕵️ [ROUTER] Contexto para decisión:\n{context_str}")

    template = """
    Eres un enrutador de bases de datos inteligente.
    Tu misión: Seleccionar la fuente de datos correcta para responder la pregunta del usuario.

    FUENTES DISPONIBLES:
    {context}
    
    PREGUNTA: "{question}"
    
    INSTRUCCIONES:
    1. Lee el campo "CONTENIDO" de cada fuente.
    2. Si la pregunta pide "pedidos" y una fuente MySQL tiene la tabla "pedidos", elige esa.
    3. Si la pregunta pide "archivo" o "costos" y hay un CSV llamado "costos", elige ese.
    4. Responde SOLO un JSON: {{ "id": "uuid-ganador" }}
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm | JsonOutputParser()
    
    try:
        decision = await chain.ainvoke({"context": context_str, "question": question})
        return decision.get("id")
    except Exception as e:
        print(f"⚠️ Fallo Router: {e}")
        return sources[0]["id"] if sources else None

async def run_sql_agent(question: str, user_id: str = None) -> dict:
    try:
        # 1. Obtener inventario con metadata pre-escaneada
        sources = get_datasources_with_metadata(user_id)
        if not sources: return {"error": "No hay fuentes de datos conectadas."}
        
        # 2. El Router decide
        target_id = await select_best_datasource(question, sources)
        
        target_source = next((s for s in sources if s["id"] == target_id), sources[0])
        print(f"🎯 [ROUTER] Gana: {target_source['name']} ({target_source['type']})")

        # 3. Conexión
        if target_source["db_url"]:
            print(f"🔌 Intentando conectar a externa: {target_source['name']}")
            # pool_pre_ping=True ayuda a reconectar si Docker cortó el enlace
            active_engine = create_engine(target_source["db_url"], pool_pre_ping=True)
        else:
            print("🏠 Usando DB Local")
            active_engine = local_engine
        
        # --- DEBUG & FIX ---
        print("🕵️ Verificando conexión y esquema...")
        
        # LÓGICA CORREGIDA:
        # Solo usamos la lista de ignorados si estamos en la base LOCAL (donde existen esas tablas).
        # En bases externas, pasamos lista vacía para evitar ValueError de LangChain.
        if target_source.get("db_url"):
            ignore_list = [] 
        else:
            ignore_list = [
                "users", 
                "user_limits",       
                "data_sources", 
                "data_assets", 
                "usage_logs",        
                "chat_messages", 
                "dashboard_widgets",
                "alembic_version"   
            ]

        try:
            db = SQLDatabase(active_engine, ignore_tables=ignore_list)
            # Forzamos la lectura del esquema aquí
            schema_info = db.get_table_info()
            print("✅ Conexión establecida. Esquema leído.")
        except Exception as conn_error:
            print(f"❌ ERROR DE CONEXIÓN DB: {conn_error}")
            raise conn_error 

        # 4. Generación de SQL
        print("🤖 Generando Query...")
        template = """
        Genera SQL para: "{question}"
        ESQUEMA: {schema}
        DIALECTO: {dialect}
        REGLAS:
        1. Solo SQL limpio.
        2. CAST(columna AS NUMERIC) para dinero en texto.
        """
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser() 
        
        sql = await chain.ainvoke({
            "question": question, 
            "schema": schema_info, 
            "dialect": active_engine.dialect.name
        })
        sql = sql.replace("```sql", "").replace("```", "").strip()
        print(f"🚀 [SQL GENERADO]: {sql}")
        
        # 5. Ejecución
        with active_engine.connect() as conn:
            res = conn.execute(text(sql))
            result_dict = [dict(row._mapping) for row in res.fetchall()]
            for r in result_dict:
                for k,v in r.items(): 
                    if isinstance(v, Decimal): r[k] = float(v)

        print(f"📊 [RESULTADO]: {len(result_dict)} filas obtenidas.")
        return {"sql": sql, "result": result_dict}

    except Exception as e:
        print(f"❌ ERROR FATAL EN AGENTE SQL: {str(e)}")
        traceback.print_exc() 
        return {"error": str(e)}