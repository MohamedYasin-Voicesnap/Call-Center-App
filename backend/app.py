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
from backend.routes.master import master_bp  # Master user and companies
from backend.routes.company import company_bp
from backend.db.company_tables import create_company_tables

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                company_id INT NULL
            )
        """)

        # Create master_users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS master_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(64) NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create companies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                admin_username VARCHAR(50) NOT NULL,
                admin_password VARCHAR(64) NOT NULL,
                email VARCHAR(100) NOT NULL,
                contact_no VARCHAR(30),
                payment_status ENUM('Paid','Unpaid') DEFAULT 'Paid',
                status ENUM('Active','Partially Close','Fully Close') DEFAULT 'Active',
                created_by_master_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migrations: add company_id columns if missing
        try:
            # users.company_id
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'company_id'
            """)
            if cursor.fetchone()[0] == 0:
                cursor.execute("ALTER TABLE users ADD COLUMN company_id INT NULL AFTER email")

            # agents.company_id
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'company_id'
            """)
            if cursor.fetchone()[0] == 0:
                cursor.execute("ALTER TABLE agents ADD COLUMN company_id INT NULL AFTER email")
                # If companies table exists and there is only one company, backfill all existing agents to that company
                try:
                    cursor.execute("SELECT id FROM companies LIMIT 2")
                    companies = cursor.fetchall()
                    if len(companies) == 1:
                        only_company_id = companies[0][0]
                        cursor.execute("UPDATE agents SET company_id = %s WHERE company_id IS NULL", (only_company_id,))
                except Exception:
                    pass

            # Ensure a composite unique index on (company_id, agent_number) instead of global unique on agent_number
            try:
                cursor.execute(
                    """
                    SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
                    GROUP BY INDEX_NAME, NON_UNIQUE
                    """
                )
                indexes = cursor.fetchall()
                # Drop single-column unique index on agent_number if present
                for idx in indexes:
                    idx_name = idx[0]
                    non_unique = idx[1]
                    cols = (idx[2] or '').lower()
                    if non_unique == 0 and cols == 'agent_number':
                        cursor.execute(f"ALTER TABLE agents DROP INDEX `{idx_name}`")
                        break
                # Create composite unique if not exists
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
                      AND INDEX_NAME = 'uniq_agents_company_agent'
                    """
                )
                if cursor.fetchone()[0] == 0:
                    cursor.execute(
                        "ALTER TABLE agents ADD UNIQUE KEY `uniq_agents_company_agent` (`company_id`,`agent_number`)"
                    )
            except Exception as _:
                pass
        except Error as e:
            print(f"Warning: migration for company_id failed: {e}")
        
        # Create calls table (with all columns the app expects)
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
                recordings LONGBLOB,
                alternative_numbers TEXT,
                meeting_datetime DATETIME NULL,
                meeting_description TEXT,
                company_id INT NULL,
                FOREIGN KEY (agent_number) REFERENCES agents(agent_number)
            )
        """)

        # Ensure existing databases are migrated to include any missing columns
        try:
            # Add missing columns if they don't exist
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls'
            """)
            cols = {row[0].lower(): row[1].lower() for row in cursor.fetchall()}

            if 'meeting_datetime' not in cols:
                cursor.execute("ALTER TABLE calls ADD COLUMN meeting_datetime DATETIME NULL AFTER alternative_numbers")
            if 'meeting_description' not in cols:
                cursor.execute("ALTER TABLE calls ADD COLUMN meeting_description TEXT AFTER meeting_datetime")
            if 'recordings' not in cols:
                cursor.execute("ALTER TABLE calls ADD COLUMN recordings LONGBLOB AFTER remarks_status")
            else:
                # Make sure recordings is large enough to store audio
                if cols.get('recordings') != 'longblob':
                    cursor.execute("ALTER TABLE calls MODIFY recordings LONGBLOB")

            if 'alternative_numbers' not in cols:
                cursor.execute("ALTER TABLE calls ADD COLUMN alternative_numbers TEXT AFTER recordings")

            # Add company_id to calls and backfill from agents
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND COLUMN_NAME = 'company_id'
            """)
            if cursor.fetchone()[0] == 0:
                cursor.execute("ALTER TABLE calls ADD COLUMN company_id INT NULL AFTER meeting_description")
                # Backfill using agents table
                cursor.execute(
                    """
                    UPDATE calls c
                    JOIN agents a ON a.agent_number = c.agent_number
                    SET c.company_id = a.company_id
                    WHERE c.company_id IS NULL
                    """
                )

            connection.commit()
        except Error as e:
            print(f"Warning: could not migrate calls table columns: {e}")
        
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
                company_id INT NULL,
                FOREIGN KEY (agent_number) REFERENCES agents(agent_number)
            )
        """)

        # Ensure agent_breaks has company_id and backfill it from agents
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_breaks' AND COLUMN_NAME = 'company_id'
            """)
            if cursor.fetchone()[0] == 0:
                cursor.execute("ALTER TABLE agent_breaks ADD COLUMN company_id INT NULL AFTER created_at")
                cursor.execute(
                    """
                    UPDATE agent_breaks b
                    JOIN agents a ON a.agent_number = b.agent_number
                    SET b.company_id = a.company_id
                    WHERE b.company_id IS NULL
                    """
                )
        except Exception:
            pass
        
        # Ensure per-company tables exist for all companies
        try:
            cursor.execute("SELECT id FROM companies")
            company_rows = cursor.fetchall()
            # cursor.fetchall returns list of tuples by default here
            for row in company_rows:
                cid = row[0]
                try:
                    create_company_tables(connection, int(cid))
                except Exception:
                    # Do not fail init on one company; continue
                    pass
        except Exception:
            pass

        # No longer modifying shared 'agents' indexes dynamically to avoid FK conflicts

        # Migration: drop unique index on companies.admin_username if present
        try:
            cursor.execute(
                """
                SELECT INDEX_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'admin_username'
                """
            )
            for idx_name, non_unique in cursor.fetchall():
                if non_unique == 0:
                    cursor.execute(f"ALTER TABLE companies DROP INDEX `{idx_name}`")
                    break
        except Exception:
            pass

        # Insert sample data if tables are empty
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            # Insert sample user
            sample_password = 'password'
            cursor.execute("""
                INSERT INTO users (user_id, password, name, email) 
                VALUES (%s, %s, %s, %s)
            """, ('admin', sample_password, 'Administrator', 'admin@company.com'))

        # Insert a sample master user if none exists
        cursor.execute("SELECT COUNT(*) FROM master_users")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO master_users (username, password, name, email)
                VALUES (%s, %s, %s, %s)
                """,
                ('master', 'masterpass', 'Master User', 'master@example.com')
            )
        
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
app.register_blueprint(master_bp)
app.register_blueprint(company_bp)

if __name__ == '__main__':
    # Initialize database on startup
    init_database()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)