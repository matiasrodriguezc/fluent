import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
MODEL_FAST = os.getenv("MODEL_FAST", "gemini-1.5-flash")

SYSTEM_PROMPT = """
Eres el motor de inteligencia de Fluent AI. 
REGLAS:
1. IDENTIDAD: Eres Fluent AI. 
2. BREVEDAD: Ve directo al grano.
3. SALUDOS: NO te presentes ni saludes en cada mensaje. Solo si el usuario te saluda primero.
"""

_model = ChatGoogleGenerativeAI(model=MODEL_FAST, temperature=0.2, google_api_key=api_key)

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="messages"),
])

# Función para extraer SOLO el texto y limpiar la basura de Google
def _extract_text(msg):
    if isinstance(msg.content, str): return msg.content
    if isinstance(msg.content, list):
        for part in msg.content:
            if isinstance(part, dict) and "text" in part: return part["text"]
    return str(msg.content)

llm = prompt | _model | _extract_text