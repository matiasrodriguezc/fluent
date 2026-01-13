import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configuración
PINE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_SMART", "gemini-1.5-pro-001")

embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

llm = ChatGoogleGenerativeAI(
    model=MODEL_NAME,
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

async def run_rag_agent(question: str):
    """
    Busca contexto en Pinecone con DEBUGGING EXTREMO.
    """
    try:
        print(f"🔍 [RAG] Iniciando búsqueda para: '{question}'")
        
        # 1. Conexión a Pinecone
        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=INDEX_NAME,
            embedding=embeddings
        )
        
        # 2. BÚSQUEDA EXPLÍCITA (Para ver qué trae)
        # k=5 para traer más contexto por si acaso
        docs = vectorstore.similarity_search(question, k=5)
        
        print(f"📄 [DEBUG RAG] Encontré {len(docs)} fragmentos relevantes.")
        
        # SI NO ENCUENTRA NADA, ALERTA
        if not docs:
            return {"result": "Error: No se encontraron documentos en la base de datos vectorial.", "source_documents": []}

        # IMPRIMIR LO QUE ENCONTRÓ (Esto saldrá en tu terminal)
        context_text = ""
        for i, doc in enumerate(docs):
            clean_content = doc.page_content.replace("\n", " ")[:150] # Primeros 150 chars
            print(f"   👉 Fragmento {i+1}: {clean_content}...")
            context_text += f"\n\n---\n{doc.page_content}"

        # 3. Prompt Manual
        template = """
        Eres un asistente inteligente. Usa los siguientes fragmentos de contexto recuperados para contestar la pregunta del usuario.
        
        CONTEXTO RECUPERADO:
        {context}

        PREGUNTA DEL USUARIO: {question}
        
        REGLAS:
        1. Si la respuesta está en el contexto, responde directamente.
        2. Si el contexto no tiene la respuesta, di "No encuentro esa información en los documentos disponibles".
        3. Cita el documento si es posible.
        
        RESPUESTA:
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()

        print("🤖 [RAG] Consultando a Gemini con el contexto encontrado...")
        response = await chain.ainvoke({"context": context_text, "question": question})
        
        return {"result": response, "source_documents": "Pinecone Index"}

    except Exception as e:
        print(f"❌ Error en RAG Service: {e}")
        return {"error": str(e)}