import shutil
import os
import io
import csv 
import uuid
import pandas as pd
import requests
import PyPDF2
from decimal import Decimal
from typing import Union, Optional, List

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import create_engine, text, inspect

from docx import Document

# --- IMPORTS DE SERVICIOS Y BASE DE DATOS ---
from database import get_db, engine
import models
import schemas

# Servicios de Inteligencia Artificial (Agentes)
from services.gemini_service import generate_description
from services.pinecone_service import upsert_asset_vector, delete_vectors_by_asset_id
from services.router_service import route_query
from services.chart_service import run_chart_agent
from services.rag_service import run_rag_agent
from services.sql_service import run_sql_agent
from services.llm_service import llm 

# Inicializar Base de Datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS PYDANTIC ---
class ConnectionRequest(BaseModel):
    name: str
    type: str 
    user: str
    password: str
    host: str
    port: str
    dbname: str
    user_id: str = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" # Hardcodeo Dev

class UpdateSourceRequest(BaseModel):
    name: str

# --- DATAFRAME A SQL ---
async def process_dataframe_to_sql(df, filename, user_id, db):
    # 1. Limpieza de columnas (Tu lógica original)
    df.columns = [str(c).replace('"', '').replace("'", "").strip() for c in df.columns]
    
    # 2. Normalización de nombres de columnas
    new_columns = []
    for c in df.columns:
        clean_col = str(c).strip().lower().replace('"', '').replace("'", "").replace(" ", "_").replace(".", "").replace("/", "_").replace("$", "")
        if not clean_col or clean_col == "nan": 
            clean_col = f"col_{len(new_columns)}"
        new_columns.append(clean_col)
    df.columns = new_columns
    
    # 3. Nombre de tabla único
    clean_filename = "".join(e for e in filename.split(".")[0].lower() if e.isalnum() or e == "_")
    table_name = f"u_{user_id.split('-')[0]}_{clean_filename}"
    
    # --- [NUEVO] PERFILADO DE DATOS (Data Profiling) ---
    stats = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns_list": list(df.columns),
        "missing_values": int(df.isnull().sum().sum()), # Total de celdas vacías
        "memory_usage_kb": round(df.memory_usage(deep=True).sum() / 1024, 2),
        "preview": df.head(3).to_dict(orient="records") # Pequeña muestra para UI
    }
    print(f"📊 [PROFILING] Tabla: '{table_name}' | Filas: {stats['total_rows']} | Nulos: {stats['missing_values']}")
    # ---------------------------------------------------

    # 4. Guardar en Postgres
    df.to_sql(table_name, con=engine, if_exists='replace', index=False)
    
    # 5. Generar descripción
    sample_data = df.head(5).to_markdown(index=False)
    description = await generate_description(sample_data, "STRUCTURED")
    
    # 6. Preparar Metadatos
    file_ext = os.path.splitext(filename)[1].replace(".", "").upper()
    name_clean = os.path.splitext(filename)[0]
    
    # 7. Guardar en DB
    ds_id = uuid.uuid4()
    new_source = models.DataSource(
        id=ds_id, 
        user_id=user_id, 
        name=name_clean, 
        type=file_ext, 
        connection_config={"table_name": table_name}
    )
    db.add(new_source)
    
    asset_id = uuid.uuid4()
    new_asset = models.DataAsset(
        id=asset_id, 
        data_source_id=ds_id, 
        name=filename, 
        description=description, 
        # [MODIFICADO] Guardamos los stats y el sample aquí dentro
        asset_metadata={
            "table_name": table_name,
            "profiling": stats,
            "sample": sample_data # Mantenemos el sample para el agente
        }, 
        is_indexed=True
    )
    db.add(new_asset)
    db.commit()
    
    await upsert_asset_vector(asset_id, description, {
        "filename": filename, 
        "type": "STRUCTURED",
        "asset_id": str(asset_id)
    })
    
    return table_name, description

# ==========================================
# ENDPOINTS GESTIÓN (DATA HUB)
# ==========================================

@app.get("/ingest/list")
async def list_sources(user_id: str = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", db: Session = Depends(get_db)):
    # Lista solo lo que está en DB
    db_sources = db.query(models.DataSource).filter(models.DataSource.user_id == user_id).all()
    
    response_list = []
    for s in db_sources:
        response_list.append({
            "id": str(s.id),
            "name": s.name,
            "type": s.type,
            "status": "active",
            "host": s.connection_config.get("host", "File") if s.connection_config else "File",
            "lastUpdate": "Live"
        })
    return {"connections": response_list}

@app.post("/ingest/connection")
async def create_connection(conn: ConnectionRequest, db: Session = Depends(get_db)):
    db_url = ""
    
    # --- ESTRATEGIA GOOGLE SHEETS: INGESTIÓN AUTOMÁTICA (Sin cambios) ---
    if conn.type == "gsheet":
        if "docs.google.com" not in conn.host: 
            raise HTTPException(status_code=400, detail="URL inválida. Debe ser un Google Sheet público.")
        
        base_url = conn.host.split("/edit")[0]
        csv_url = f"{base_url}/export?format=csv"
        
        try:
            print(f"📥 Descargando Google Sheet: {csv_url}")
            response = requests.get(csv_url)
            response.raise_for_status()
            
            df = pd.read_csv(io.BytesIO(response.content))
            
            fake_filename = f"{conn.name.replace(' ', '_')}.csv"
            table_name, description = await process_dataframe_to_sql(df, fake_filename, conn.user_id, db)
            
            return {"status": "success", "message": "Google Sheet ingestada correctamente", "table": table_name}

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error procesando Google Sheet: {str(e)}")

    # --- ESTRATEGIA BASES DE DATOS (MySQL / Postgres) ---
    elif conn.type == "mysql":
        db_url = f"mysql+pymysql://{conn.user}:{conn.password}@{conn.host}:{conn.port}/{conn.dbname}"
    elif conn.type == "postgresql":
        db_url = f"postgresql+psycopg2://{conn.user}:{conn.password}@{conn.host}:{conn.port}/{conn.dbname}"
    else:
        raise HTTPException(status_code=400, detail="Tipo no soportado")

    # Validación de conexión DB Real + INSPECCIÓN DE SCHEMA
    schema_summary = "Sin información de esquema."
    
    if conn.type in ["mysql", "postgresql"]:
        try:
            # 1. Probamos conexión
            engine_test = create_engine(db_url, connect_args={"connect_timeout": 5})
            
            # 2. ESCANEO INTELIGENTE
            inspector = inspect(engine_test)
            tables = inspector.get_table_names()[:50] # Limitamos a 50 tablas
            
            schema_parts = []
            for table in tables:
                columns = [col["name"] for col in inspector.get_columns(table)]
                schema_parts.append(f"{table}({', '.join(columns)})")
            
            schema_summary = f"Base de datos {conn.type} externa. Contiene tablas: " + "; ".join(schema_parts)
            print(f"✅ Esquema escaneado para router: {schema_summary[:100]}...")

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No se pudo conectar a la DB: {str(e)}")

    # --- CORRECCIÓN CLAVE: Generación de ID explícito ---
    source_id = uuid.uuid4() 

    # Guardamos la conexión externa (DataSource) usando el ID generado
    new_source = models.DataSource(
        id=source_id, # <--- ASIGNADO MANUALMENTE
        user_id=conn.user_id,
        name=conn.name,
        type=conn.type.upper(),
        connection_string=db_url,
        connection_config={"host": conn.host, "port": conn.port, "dbname": conn.dbname, "user": conn.user}
    )
    db.add(new_source)
    
    # Guardamos el DataAsset vinculado a ese ID seguro
    new_asset = models.DataAsset(
        id=uuid.uuid4(),
        data_source_id=source_id, # <--- USAMOS LA VARIABLE SEGURA, NO new_source.id
        name=f"Schema de {conn.name}",
        description=schema_summary,   # La metadata para el Router
        asset_metadata={"tables": schema_parts if 'schema_parts' in locals() else []},
        is_indexed=False 
    )
    db.add(new_asset)
    
    db.commit()
    return {"status": "success", "id": str(source_id), "schema_preview": schema_summary[:200]}

@app.put("/ingest/connection/{source_id}")
async def update_source(source_id: str, payload: UpdateSourceRequest, db: Session = Depends(get_db)):
    source = db.query(models.DataSource).filter(models.DataSource.id == source_id).first()
    if not source: raise HTTPException(status_code=404, detail="Fuente no encontrada")
    source.name = payload.name
    db.commit()
    return {"status": "updated", "name": source.name}

@app.delete("/ingest/connection/{source_id}")
async def delete_connection(source_id: str, db: Session = Depends(get_db)):
    # Buscamos la fuente como lo hacíamos antes (tu lógica que andaba 10 puntos)
    source = db.query(models.DataSource).filter(models.DataSource.id == source_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Fuente no encontrada")
    
    # --- LO ÚNICO NUEVO: BORRADO DE PINECONE ---
    # Buscamos los assets de esta fuente para obtener sus IDs y limpiar Pinecone
    assets = db.query(models.DataAsset).filter(models.DataAsset.data_source_id == source.id).all()
    for asset in assets:
        if asset.is_indexed:
            await delete_vectors_by_asset_id(str(asset.id))
    # -------------------------------------------

    # Borrado de tabla SQL (si existe)
    table_name = source.connection_config.get("table_name")
    if table_name:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
                conn.commit()
        except Exception:
            pass

    # Borrado de la DB
    db.delete(source)
    db.commit()
    
    return {"status": "deleted"}

@app.post("/ingest/test/{source_id}")
async def test_existing_connection(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.DataSource).filter(models.DataSource.id == source_id).first()
    if not source: raise HTTPException(status_code=404, detail="Fuente no encontrada")
    if source.type in ["GSHEET", "LOCAL_FILE"]: return {"status": "ok", "message": "Fuente accesible."}
    try:
        engine_test = create_engine(source.connection_string, connect_args={"connect_timeout": 5})
        with engine_test.connect() as connection: pass 
        return {"status": "ok", "message": "Conexión Exitosa"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falló la conexión: {str(e)}")


# ==========================================
# ENDPOINT UPLOAD (EN MEMORIA -> DB/Pinecone)
# ==========================================
@app.post("/ingest/upload-file")
async def upload_file(
    file: UploadFile = File(...), 
    user_id: str = Form(...), 
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename
    file_ext = os.path.splitext(filename.lower())[1]
    
    if file_ext in [".csv", ".xlsx"]:
        try:
            if file_ext == ".csv":
                # Detectar encoding
                try: 
                    text_content = content.decode('utf-8-sig')
                except: 
                    try:
                        text_content = content.decode('utf-8')
                    except:
                        text_content = content.decode('latin-1', errors='replace')
                
                # Limpiar líneas vacías
                lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                
                # PARSING MANUAL ROBUSTO
                if not lines:
                    raise HTTPException(status_code=400, detail="El archivo CSV está vacío")
                
                # Separar header y data
                header_line = lines[0]
                data_lines = lines[1:]
                
                # Detectar el separador real contando ocurrencias
                separators = {',': 0, ';': 0, '\t': 0, '|': 0}
                for sep in separators:
                    separators[sep] = header_line.count(sep)
                
                # Usar el separador más común
                detected_sep = max(separators, key=separators.get)
                
                print(f"📊 Separadores detectados: {separators}")
                print(f"✓ Usando separador: '{detected_sep}'")
                
                # Parsear con el separador detectado
                header = [col.strip().strip('"').strip("'") for col in header_line.split(detected_sep)]

                
                data_rows = []
                for line in data_lines:
                    if line.strip():
                        row = [cell.strip().strip('"').strip("'") for cell in line.split(detected_sep)]
                        data_rows.append(row)
                
                # Crear DataFrame
                df = pd.DataFrame(data_rows, columns=header)
                
                print(f"✓ CSV parseado: {len(df.columns)} columnas -> {df.columns.tolist()}")
                print(f"✓ Filas: {len(df)}")
                print(f"✓ Primeras 2 filas:\n{df.head(2)}")
                
            else:
                df = pd.read_excel(io.BytesIO(content))
            
            table_name, description = await process_dataframe_to_sql(df, filename, user_id, db)
            
            return {
                "status": "success", 
                "table": table_name,
                "columns": list(df.columns),
                "rows": len(df),
                "ai_description": description
            }
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    elif file_ext in [".pdf", ".docx", ".txt"]:
        try:
            full_text = ""
            if file_ext == ".pdf":
                pdf = PyPDF2.PdfReader(io.BytesIO(content))
                for p in pdf.pages: 
                    full_text += (p.extract_text() or "") + "\n"
            elif file_ext == ".docx":
                doc = Document(io.BytesIO(content))
                full_text = "\n".join([p.text for p in doc.paragraphs])
            elif file_ext == ".txt":
                full_text = content.decode('utf-8', errors='ignore')
            
            description = await generate_description(full_text[:1000], "DOCUMENT")
            name_clean = os.path.splitext(filename)[0]
            type_clean = file_ext.replace(".", "").upper()
            ds_id = uuid.uuid4()
            new_source = models.DataSource(
                id=ds_id, 
                user_id=user_id, 
                name=name_clean, 
                type=type_clean, 
                connection_config={}
            )
            db.add(new_source)
            
            asset_id = uuid.uuid4()
            new_asset = models.DataAsset(
                id=asset_id, 
                data_source_id=ds_id, 
                name=filename, 
                description=description, 
                asset_metadata={"sample": full_text[:200]}, 
                is_indexed=True
            )
            db.add(new_asset)
            db.commit()
            
            await upsert_asset_vector(asset_id, full_text, {
                "filename": filename, 
                "type": "DOCUMENT", 
                "asset_id": str(asset_id)
            })
            
            return {"status": "success", "message": "Documento indexado."}
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error: {str(e)}")
    
    return {"status": "error", "message": "Formato no soportado"}


# ==========================================
# ENDPOINT CHAT (ROUTER + CHAT MODE)
# ==========================================
@app.post("/chat")
async def chat_endpoint(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    user_id = str(data.get("user_id", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"))
    user_message = data.get("message", "")
    
    try:
        # Guardar mensaje usuario
        db.add(models.ChatMessage(user_id=user_id, role="user", content=user_message))
        db.commit()

        route_decision = await route_query(user_message)
        res_text = ""
        data_res = None

        if route_decision in ["SQL", "DATABASE"]:
            sql_res = await run_sql_agent(user_message, user_id=user_id)
            if "error" in sql_res:
                res_text = "No pude procesar los datos."
            else:
                res_text = await llm.ainvoke({"messages": [("user", f"Datos: {sql_res['result']}. Pregunta: {user_message}")]})
                data_res = sql_res

        elif route_decision == "CHART":
            from services.chart_service import run_chart_agent
            chart_res = await run_chart_agent(user_message, user_id=user_id)
            
            if "error" in chart_res:
                res_text = chart_res["error"]
                data_res = None
            else:
                res_text = "He generado el gráfico solicitado."
                
                # --- FIX CRÍTICO DE LLAVES ---
                data_res = {
                    "result": chart_res.get("result"), # Los datos (filas)
                    "chart_type": chart_res.get("chart_config", {}).get("type", "bar"),
                    "sql": chart_res.get("sql_used"), # <--- ESTE ERA EL ERROR (sql vs sql_used)
                    "suggested_title": chart_res.get("chart_config", {}).get("title")
                }
                
                # --- DEBUG: IMPRIMIR LO QUE MANDAMOS AL FRONT ---
                print(f"📦 [DEBUG DATA] Enviando al Canvas: {len(data_res['result'])} filas.")
                print(f"📦 [DEBUG SAMPLE] Primera fila: {data_res['result'][0] if data_res['result'] else 'VACIO'}")

        elif route_decision == "CHAT":
            res_text = await llm.ainvoke({"messages": [("user", user_message)]})

        else: # RAG
            rag = await run_rag_agent(user_message)
            res_text = rag.get("result", "No hay info.")

        final_response_string = str(res_text) # Forzamos string limpio
        
        # Guardar respuesta IA (Siempre como String)
        db.add(models.ChatMessage(user_id=user_id, role="assistant", content=str(res_text)))
        db.commit()

        return {"response": final_response_string, "tool_used": route_decision, "data": data_res}

    except Exception as e:
        db.rollback()
        return {"response": "Error interno.", "tool_used": "ERROR"}

# ==========================================
# ENDPOINTS DASHBOARD
# ==========================================

@app.post("/dashboard/pin")
async def pin_widget(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    new_widget = models.DashboardWidget(
        user_id=data.get("user_id"), title=data.get("title"), chart_type=data.get("chart_type"),
        sql_query=data.get("sql"), chart_data=data.get("data")
    )
    db.add(new_widget)
    db.commit()
    return {"status": "success", "id": str(new_widget.id)}

@app.get("/dashboard/list")
async def get_dashboard(user_id: str, db: Session = Depends(get_db)):
    widgets = db.query(models.DashboardWidget).filter(models.DashboardWidget.user_id == user_id).order_by(models.DashboardWidget.created_at.desc()).all()
    return {"widgets": [{"id": str(w.id), "title": w.title, "chart_type": w.chart_type, "data": w.chart_data, "sql": w.sql_query} for w in widgets]}

@app.delete("/dashboard/widget/{widget_id}")
async def delete_widget(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(models.DashboardWidget).filter(models.DashboardWidget.id == widget_id).first()
    if widget:
        db.delete(widget)
        db.commit()
    return {"status": "deleted"}

@app.put("/dashboard/widget/{widget_id}/refresh")
async def refresh_widget(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(models.DashboardWidget).filter(models.DashboardWidget.id == widget_id).first()
    if not widget: raise HTTPException(status_code=404, detail="Widget no encontrado")
    try:
        from database import engine as local_engine
        with local_engine.connect() as connection:
            result = connection.execute(text(widget.sql_query))
            new_data = [dict(row._mapping) for row in result]
            for row in new_data:
                for k, v in row.items():
                    if isinstance(v, Decimal): row[k] = float(v)
        widget.chart_data = new_data
        db.commit()
        return {"status": "refreshed", "data": new_data}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))