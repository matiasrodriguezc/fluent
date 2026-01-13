import asyncio
from database import engine, Base
from models import User, DataSource, DataAsset, UserLimits, UsageLog

async def create_tables():
    print("⏳ Creando tablas en la base de datos Fluent (Modo Async)...")
    # Usamos el engine asíncrono
    async with engine.begin() as conn:
        # 'run_sync' ejecuta la función síncrona 'create_all' dentro del contexto asíncrono.
        await conn.run_sync(Base.metadata.create_all)
    print("✅ ¡Tablas creadas exitosamente!")
    # Cerramos la conexión del engine al terminar
    await engine.dispose()

if __name__ == "__main__":
    # Ejecutamos la función asíncrona
    asyncio.run(create_tables())