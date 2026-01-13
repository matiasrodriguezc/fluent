import pymysql
import random
from datetime import datetime, timedelta

# --- CONFIGURACIÓN CORREGIDA ---
# Coincide con tu docker-compose.yml
config = {
    'host': 'localhost',      # Desde tu Mac, entras por localhost
    'port': 3307,             # El puerto externo expuesto en Docker
    'user': 'root',           # Usuario por defecto de la imagen mysql
    'password': '',           # En docker pusiste MYSQL_ALLOW_EMPTY_PASSWORD: "yes"
    'database': 'tienda_ropa',# En docker pusiste MYSQL_DATABASE: tienda_ropa
    'cursorclass': pymysql.cursors.DictCursor
}
# -------------------------------

print("🔌 Conectando a MySQL simulado...")
try:
    connection = pymysql.connect(**config)
    with connection.cursor() as cursor:
        # 1. Crear Tablas
        print("🔨 Creando tablas...")
        cursor.execute("DROP TABLE IF EXISTS pedidos;")
        cursor.execute("DROP TABLE IF EXISTS clientes;")
        
        cursor.execute("""
            CREATE TABLE clientes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100),
                email VARCHAR(100),
                pais VARCHAR(50),
                fecha_registro DATE
            );
        """)
        
        cursor.execute("""
            CREATE TABLE pedidos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cliente_id INT,
                monto DECIMAL(10, 2),
                estado VARCHAR(20), -- 'Completado', 'Pendiente', 'Cancelado'
                fecha_pedido DATETIME,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id)
            );
        """)

        # 2. Insertar Datos Falsos
        print("🌱 Insertando datos falsos...")
        nombres = ["Carlos Pérez", "Ana Gómez", "Luis Rodríguez", "Marta Díaz", "Pedro Silva"]
        paises = ["Argentina", "México", "España", "Colombia", "Chile"]
        
        # Clientes
        for name in nombres:
            pais = random.choice(paises)
            cursor.execute("INSERT INTO clientes (nombre, email, pais, fecha_registro) VALUES (%s, %s, %s, %s)", 
                           (name, f"{name.split()[0].lower()}@email.com", pais, "2023-01-15"))
        
        # Pedidos
        estados = ["Completado", "Pendiente", "Cancelado"]
        for _ in range(50): # 50 pedidos random
            cid = random.randint(1, len(nombres))
            monto = round(random.uniform(10.0, 500.0), 2)
            estado = random.choice(estados)
            fecha = datetime.now() - timedelta(days=random.randint(0, 60))
            cursor.execute("INSERT INTO pedidos (cliente_id, monto, estado, fecha_pedido) VALUES (%s, %s, %s, %s)", 
                           (cid, monto, estado, fecha))

    connection.commit()
    print("✅ MySQL poblada con éxito: 5 clientes y 50 pedidos en 'tienda_ropa'.")

except Exception as e:
    print(f"❌ Error: {e}")
finally:
    if 'connection' in locals(): connection.close()