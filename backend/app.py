import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import hashlib
import jwt
import datetime
from functools import wraps
import os
from backend.config import SECRET_KEY
from backend.db.connection import get_db_connection, get_cdr_db_connection
from backend.routes.login import login_bp
from backend.routes.calls import calls_bp
from backend.routes.agents import agents_bp
from backend.routes.health import health_bp
from backend.routes.breaks import breaks_bp  # Import the new breaks blueprint

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set Flask secret key from config
app.config['SECRET_KEY'] = SECRET_KEY

# JWT token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        
        if not token:
            return jsonify({'message': 'Token missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# Initialize database tables
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
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create agents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                password VARCHAR(64) NOT NULL,
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create calls table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) NOT NULL,
                customer_number VARCHAR(20) NOT NULL,
                duration INT,
                call_status VARCHAR(50),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT,
                name TEXT,
                remarks_status TEXT,
                recordings TEXT,
                alternative_numbers TEXT,
                FOREIGN KEY (agent_number) REFERENCES agents(agent_number)
            )
        """)
        
        # Create agent_breaks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_breaks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) NOT NULL,
                status ENUM('Working', 'Break') NOT NULL,
                break_start DATETIME,
                break_end DATETIME,
                duration_seconds INT,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_number) REFERENCES agents(agent_number)
            )
        """)
        
        # Insert sample data if tables are empty
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            # Insert sample user
            sample_password = 'password'
            cursor.execute("""
                INSERT INTO users (user_id, password, name, email) 
                VALUES (%s, %s, %s, %s)
            """, ('admin', sample_password, 'Administrator', 'admin@company.com'))
        
        cursor.execute("SELECT COUNT(*) FROM agents")
        if cursor.fetchone()[0] == 0:
            # Insert sample agents
            agents_data = [
                ('A001', 'John Doe', 'john.doe@company.com', 'agentpass1', 'Active', False),
                ('A002', 'Jane Smith', 'jane.smith@company.com', 'agentpass2', 'Active', True),
                ('A003', 'Bob Johnson', 'bob.johnson@company.com', 'agentpass3', 'Inactive', False)
            ]
            cursor.executemany("""
                INSERT INTO agents (agent_number, name, email, password, status, is_admin) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, agents_data)
        
        cursor.execute("SELECT COUNT(*) FROM calls")
        if cursor.fetchone()[0] == 0:
            # Insert sample calls
            calls_data = [
                ('A001', '+1234567890', 180, 'Completed'),
                ('A002', '+1987654321', 245, 'Completed'),
                ('A001', '+1122334455', 0, 'Missed'),
                ('A002', '+1555666777', 320, 'Completed'),
                ('A003', '+1888999000', 150, 'Completed')
            ]
            cursor.executemany("""
                INSERT INTO calls (agent_number, customer_number, duration, call_status) 
                VALUES (%s, %s, %s, %s)
            """, calls_data)
        
        # Insert sample agent break data if table is empty
        cursor.execute("SELECT COUNT(*) FROM agent_breaks")
        if cursor.fetchone()[0] == 0:
            sample_breaks = [
                ('A001', 'Break', '2025-08-07 10:30:00', '2025-01-07 10:45:00', 900, 'Coffee break'),
                ('A002', 'Break', '2025-08-07 12:00:00', '2025-01-07 13:00:00', 3600, 'Lunch break'),
                ('A001', 'Break', '2025-08-07 15:00:00', '2025-08-07 15:15:00', 900, 'Team meeting'),
            ]
            cursor.executemany("""
                INSERT INTO agent_breaks (agent_number, status, break_start, break_end, duration_seconds, remark) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, sample_breaks)
        
        connection.commit()
        print("Database initialized successfully")
        
    except Error as e:
        print(f"Error creating tables: {e}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

# Register blueprints
app.register_blueprint(login_bp)
app.register_blueprint(calls_bp)
app.register_blueprint(agents_bp)
app.register_blueprint(health_bp)
app.register_blueprint(breaks_bp)  # Register the new breaks blueprint

if __name__ == '__main__':
    # Initialize database on startup
    init_database()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)