import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
# ELIMINADO: from operator import index (Esto causaba conflicto con la lógica de Pinecone)

# Configuración
PINE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

# Embeddings
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

async def upsert_asset_vector(asset_id: str, text: str, metadata: dict = None):
    """
    Sube el texto vectorizado a Pinecone.
    """
    try:
        if metadata is None:
            metadata = {}
            
        # Aseguramos que el asset_id esté en la metadata para el borrado posterior
        metadata["asset_id"] = str(asset_id)
        
        doc = Document(page_content=text, metadata=metadata)
        
        # Conectamos al índice
        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=INDEX_NAME,
            embedding=embeddings
        )
        
        # Subimos el documento
        vectorstore.add_documents([doc])
        
        print(f"✅ Asset {asset_id} vectorizado en Pinecone.")
        return True
        
    except Exception as e:
        print(f"❌ Error Pinecone Upsert: {e}")
        return False

async def delete_vectors_by_asset_id(asset_id: str):
    """
    Borra quirúrgicamente usando el filtro por asset_id.
    """
    try:
        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=INDEX_NAME,
            embedding=embeddings
        )
        # Pinecone requiere que el filtro coincida exactamente con la metadata guardada
        vectorstore.delete(filter={"asset_id": {"$eq": str(asset_id)}})
        print(f"✅ Vectores con asset_id {asset_id} eliminados de Pinecone.")
        return True
    except Exception as e:
        print(f"❌ Error en Pinecone al borrar por asset_id: {e}")
        return False