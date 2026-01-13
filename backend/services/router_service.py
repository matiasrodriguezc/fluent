import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_ROUTER = os.getenv("MODEL_SMART", "gemini-1.5-pro-001")

llm = ChatGoogleGenerativeAI(
   model=MODEL_ROUTER,
   temperature=0,
   google_api_key=GOOGLE_API_KEY
)

async def route_query(query: str):
   """
   Clasifica la intención del usuario con reglas estrictas para evitar falsos positivos de CHART.
   """
   print(f"🚦 [ROUTER] Analizando intención para: '{query}'")
   
   template = """
   Eres un clasificador de intenciones experto para Fluent AI. 
   Tu misión es decidir qué herramienta usar según el mensaje del usuario.

   CATEGORÍAS:
   1. **SQL**: Consultas de datos, números, sumas, promedios o información puntual en tablas.
      - IMPORTANTE: Si el usuario pregunta "cuánto", "cuáles", "cuándo" o pide un dato específico, elige SQL.
      - Ejemplos: "¿Cuáles fueron los costos de febrero?", "¿Cuánto se vendió?", "Dame la lista de precios".

   2. **CHART**: ÚNICAMENTE si el usuario pide explícitamente una representación VISUAL.
      - Palabras clave obligatorias: "grafica", "haz un gráfico", "visualiza", "plot", "barras", "torta", "tendencia".
      - Si NO pide explícitamente un gráfico, NUNCA elijas esta categoría.

   3. **RAG**: Preguntas sobre contenido de texto en documentos (PDF, DOCX, TXT).
      - Ejemplos: "¿Qué dice el contrato?", "¿Cuál es la política de privacidad?", "Resume este texto".

   4. **CHAT**: Saludos o charla casual.
      - Ejemplos: "Hola", "Gracias", "¿Quién eres?".

   MENSAJE DEL USUARIO: "{query}"

   REGLA CRÍTICA: Si el usuario pregunta por un dato numérico o una celda de una tabla SIN pedir un dibujo/gráfico, responde 'SQL'. No elijas 'CHART' por defecto solo porque hay datos involucrados.

   RESPUESTA (SOLO LA PALABRA):
   """
   prompt = ChatPromptTemplate.from_template(template)
   chain = prompt | llm | StrOutputParser()
   
   try:
      intention = await chain.ainvoke({"query": query})
      intention = intention.strip().upper().replace(".", "").replace("*", "")
      
      # Mapeo de seguridad
      if "CHART" in intention: 
         # Triple check: si no hay palabras de visualización, lo bajamos a SQL
         visual_words = ["GRAF", "VISUALIZ", "PLOT", "BARRAS", "TORTA", "LINEA", "CHART"]
         if not any(word in query.upper() for word in visual_words):
             intention = "SQL"
         else:
             intention = "CHART"
      elif "SQL" in intention or "DATABASE" in intention: 
         intention = "SQL"
      elif "RAG" in intention or "TEXT" in intention: 
         intention = "RAG"
      elif "CHAT" in intention: 
         intention = "CHAT"
      else: 
         intention = "SQL" # Fallback a SQL por ser lo más común
      
      print(f"🚦 [ROUTER] Decisión Final: {intention}")
      return intention

   except Exception as e:
      print(f"❌ Error en Router: {e}")
      return "SQL"