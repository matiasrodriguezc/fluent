import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from services.sql_service import run_sql_agent

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_SMART", "gemini-1.5-pro-001")

llm = ChatGoogleGenerativeAI(
    model=MODEL_NAME,
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

async def run_chart_agent(question: str, user_id: str = None):
    try:
        print(f"📊 [CHART] Iniciando generación de gráfico para: '{question}'")
        
        # 1. Obtener datos crudos
        sql_response = await run_sql_agent(question, user_id=user_id)
        
        if "error" in sql_response:
            return {"error": sql_response["error"]}
            
        data_str = str(sql_response["result"]) 
        if not data_str or "[]" in data_str:
             return {"error": "Sin datos para graficar."}

        # 2. Generar Configuración y Normalizar Datos
        # Pedimos al LLM que nos identifique explícitamente qué es X y qué es Y
        template = """
        Eres un experto en visualización de datos.
        Tus tareas son:
        1. Identificar el mejor tipo de gráfico (bar, line, pie).
        2. Generar las listas de ETIQUETAS (eje X) y VALORES (eje Y) a partir de los datos.
        
        DATOS CRUDOS: {data}
        PREGUNTA: {question}
        
        FORMATO JSON ESPERADO:
        {{
          "type": "bar",
          "title": "Título del gráfico",
          "labels": ["Enero", "Febrero", ...],
          "values": [100, 200, ...], 
          "series_name": "Ventas"
        }}
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | JsonOutputParser()
        config = await chain.ainvoke({"data": data_str, "question": question})
        
        # 3. NORMALIZACIÓN CRÍTICA PARA EL FRONTEND
        # Convertimos los datos dinámicos a formato estándar: [{name: 'Enero', value: 100}, ...]
        normalized_result = []
        labels = config.get("labels", [])
        values = config.get("values", [])
        
        # Mapeo seguro asegurando que las listas tengan el mismo largo
        for i in range(min(len(labels), len(values))):
            normalized_result.append({
                "name": labels[i],  # Estandarizado para Eje X
                "value": values[i], # Estandarizado para Eje Y
                # Mantenemos las llaves originales por si acaso, usando la primera fila del SQL como referencia
                "original_data": sql_response["result"][i] if i < len(sql_response["result"]) else {}
            })

        print(f"✅ [CHART] Datos normalizados para frontend: {normalized_result[0] if normalized_result else 'Vacío'}")
        
        return {
            "chart_config": config,
            "sql_used": sql_response["sql"], # Usamos 'sql_used' para mantener compatibilidad interna si se requiere
            "sql": sql_response["sql"],      # Agregamos 'sql' para que main.py lo encuentre fácil
            "result": normalized_result      # <--- AQUÍ ESTÁ LA MAGIA (Datos estandarizados)
        }

    except Exception as e:
        print(f"❌ Error en Chart Agent: {e}")
        return {"error": str(e)}