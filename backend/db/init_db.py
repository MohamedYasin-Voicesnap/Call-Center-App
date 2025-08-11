from backend.db.connection import get_db_connection

def init_database():
    connection = get_db_connection()
    if connection is None:
        print("Failed to connect to database")
        return
    cursor = connection.cursor()
    try:
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(64) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'agent',
                name VARCHAR(100),
                extension VARCHAR(10),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Add other table creation logic here as needed
        connection.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        cursor.close()
        connection.close()