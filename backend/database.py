from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Construir la URL SÍNCRONA
# Nota: Usamos psycopg2 en lugar de asyncpg
DB_USER = os.getenv("POSTGRES_USER", "fluent_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "fluent_pass")
DB_HOST = os.getenv("POSTGRES_SERVER", "db") 
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "fluent_db")

# Si en tu .env ya tienes DATABASE_URL, úsala, si no, constrúyela:
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

# 1. Usar create_engine estándar (Síncrono)
engine = create_engine(
    DATABASE_URL,
    echo=False
)

# 2. SessionLocal estándar
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia Síncrona
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()