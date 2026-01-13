import os
from decimal import Decimal
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.utilities import SQLDatabase
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from database import engine as local_engine
import models

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_SMART = os.getenv("MODEL_SMART", "gemini-1.5-pro-001")

llm = ChatGoogleGenerativeAI(model=MODEL_SMART, temperature=0, google_api_key=GOOGLE_API_KEY)
SessionLocal = sessionmaker(bind=local_engine)

def get_user_datasources(user_id: str):
    session = SessionLocal()
    try:
        sources = [{"id": "local", "name": "Archivos Subidos", "type": "LOCAL_POSTGRES", "db_url": None}]
        dbs = session.query(models.DataSource).filter(models.DataSource.user_id == user_id).all()
        for db in dbs:
            sources.append({"id": str(db.id), "db_url": db.connection_string})
        return sources
    finally: session.close()

async def run_sql_agent(question: str, history: list = [], user_id: str = None) -> dict:
    try:
        sources = get_user_datasources(user_id)
        # Buscar fuente externa si existe, sino usar local
        target = sources[0] 
        for s in sources:
            if s["id"] != "local": 
                target = s
                break
        
        active_engine = local_engine if (target["db_url"] is None) else create_engine(target["db_url"])
        db = SQLDatabase(active_engine, ignore_tables=["users", "chat_messages", "dashboard_widgets"])

        # PROMPT BLINDADO: Obliga a castear texto a número
        template = """
        Eres un experto en SQL (PostgreSQL). Genera una query para: "{question}"
        
        ESQUEMA: 
        {schema}
        
        REGLAS OBLIGATORIAS:
        1. Las columnas de dinero o cantidad suelen ser TEXTO.
        2. SIEMPRE usa casting explícito: CAST(REPLACE(REPLACE(columna, '$', ''), ',', '') AS NUMERIC).
        3. Si usas SUM, envuélvelo en COALESCE(SUM(...), 0) para evitar nulos.
        4. Devuelve SOLO el código SQL limpio.
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        
        chain = prompt | llm | StrOutputParser() 
        sql = await chain.ainvoke({"question": question, "schema": db.get_table_info()})
        
        sql = sql.replace("```sql", "").replace("```", "").strip()
        print(f"🚀 [SQL GENERADO]: {sql}")

        with active_engine.connect() as conn:
            res = conn.execute(text(sql))
            result_dict = [dict(row._mapping) for row in res.fetchall()]
            # Conversión final de Decimal a float para JSON
            for r in result_dict:
                for k,v in r.items(): 
                    if isinstance(v, Decimal): r[k] = float(v)
        print(f"📊 [SQL RESULT] Filas obtenidas: {len(result_dict)}")
        return {"sql": sql, "result": result_dict}

    except Exception as e:
        print(f"❌ Error SQL: {e}")
        return {"error": str(e)}