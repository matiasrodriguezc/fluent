import uuid
import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# --- MODELOS DE USUARIO ---

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    # Sistema de Créditos (SaaS)
    credit_balance = Column(Float, default=5.00) # $5.00 gratis al inicio
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ❌ COMENTADO TEMPORALMENTE (Rompe la relación porque DataSource no tiene FK)
    # sources = relationship("DataSource", back_populates="owner")
    
    usage_logs = relationship("UsageLog", back_populates="user")
    limits = relationship("UserLimits", uselist=False, back_populates="user")

class UserLimits(Base):
    __tablename__ = "user_limits"
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)    
    # Almacenamiento
    used_storage_mb = Column(Float, default=0.0)
    limit_storage_mb = Column(Float, default=50.0) # 50MB Free tier
    # Vectores (Pinecone)
    used_vectors = Column(Integer, default=0)
    limit_vectors = Column(Integer, default=10000)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user = relationship("User", back_populates="limits")


# --- MODELOS DE DATOS (LA BIBLIA) ---

class DataSource(Base):
    """
    El PADRE: Representa la CONEXIÓN (Credenciales, Archivo físico, API Key).
    """
    __tablename__ = "data_sources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # CAMBIO 1: String sin ForeignKey para permitir usuario hardcodeado
    user_id = Column(String, index=True) 
    
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'MYSQL', 'POSTGRES', 'LOCAL'
    
    # CAMBIO 2: Guardamos la URL de conexión para SQLAlchemy
    connection_string = Column(String, nullable=True) 
    
    # Configuración técnica (Host, User, Pass para mostrar en UI)
    connection_config = Column(JSON, nullable=False) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ❌ COMENTADO TEMPORALMENTE (Lado inverso de la relación User)
    # owner = relationship("User", back_populates="sources")
    
    assets = relationship("DataAsset", back_populates="source", cascade="all, delete-orphan")

class DataAsset(Base):
    """
    EL HIJO: Representa lo que se puede CONSULTAR (Tablas, Documentos, Endpoints).
    Este ID es el que guardamos en PINECONE.
    """
    __tablename__ = "data_assets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id"))
    name = Column(String, nullable=False) # Ej: "tabla_clientes", "Capitulo 1"
    description = Column(Text)            # Generado por IA
    # Metadatos específicos (Esquema SQL, Path de API, etc)
    asset_metadata = Column(JSONB)
    # Estado de indexación
    is_indexed = Column(Boolean, default=False)
    last_synced_at = Column(DateTime(timezone=True))
    source = relationship("DataSource", back_populates="assets")

# --- LOGS Y AUDITORÍA ---

class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action_type = Column(String) # 'SQL', 'CHAT', 'RAG'
    model_used = Column(String)  # 'gpt-4o'
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="usage_logs")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id")) # O String si usas user_id como string en main
    role = Column(String) # "user" o "assistant"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True) # "a0eebc..."
    title = Column(String) # "Ventas por mes"
    chart_type = Column(String) # "bar", "line", "pie"
    sql_query = Column(String) # "SELECT ..."
    # Guardamos los datos cacheados para no re-consultar SQL cada vez (opcional, pero más rápido)
    chart_data = Column(JSON) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())