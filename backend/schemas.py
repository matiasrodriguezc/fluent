from pydantic import BaseModel
from typing import Optional, List, Any

class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    tool_used: str  # 'SQL', 'RAG', 'CHAT', 'ROUTER'
    data: Optional[Any] = None # Para gráficos o tablas

class IngestURLRequest(BaseModel): 
    url: str
    user_id: str

class ConnectionRequest(BaseModel):
    user_id: str
    name: str          # Ej: "Producción AWS"
    type: str          # "MYSQL" o "POSTGRES"
    host: str          # Ej: "external_mysql" (nombre del servicio docker)
    port: int          # Ej: 3306
    username: str
    password: str
    database: str