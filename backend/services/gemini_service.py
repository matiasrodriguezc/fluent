# backend/services/gemini_service.py
import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# Configuración
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_EMBEDDING = os.getenv("MODEL_EMBEDDING", "models/text-embedding-004")
MODEL_FAST = os.getenv("MODEL_FAST", "gemini-1.5-flash")

# 1. Cliente de Embeddings (Genera vectores de 768 dimensiones)
embeddings_client = GoogleGenerativeAIEmbeddings(
    model=MODEL_EMBEDDING,
    google_api_key=GOOGLE_API_KEY
)

# 2. Cliente de Chat (Gemini Flash para descripciones rápidas)
chat_client = ChatGoogleGenerativeAI(
    model=MODEL_FAST,
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

def get_embedding(text: str):
    """Convierte texto en vector de 768 dimensiones"""
    # Gemini prefiere que no haya saltos de línea raros en embeddings
    text = text.replace("\n", " ")
    return embeddings_client.embed_query(text)

async def generate_description(content_sample: str, asset_type: str) -> str:
    """Usa Gemini para describir qué hay en el archivo"""
    prompt = f"""
    Eres un Bibliotecario de Datos experto. 
    Analiza la siguiente muestra de un archivo de tipo {asset_type} y genera una descripción breve (máx 2 frases).
    La descripción debe servir para saber qué preguntas se pueden responder con estos datos.
    MUESTRA:
    {content_sample[:3000]} 
    DESCRIPCIÓN:
    """
    response = await chat_client.ainvoke([HumanMessage(content=prompt)])
    if isinstance(response.content, list):
        # Unimos todos los fragmentos de texto
        texto_limpio = "".join([bloque.get("text", "") for bloque in response.content if bloque.get("type") == "text"])
        return texto_limpio
    # Si ya es string, lo devolvemos directo
    return str(response.content)