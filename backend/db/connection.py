import mysql.connector
from mysql.connector import Error
from backend.config import DB_CONFIG, CDR_DB_CONFIG

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def get_cdr_db_connection():
    try:
        print(f"Attempting to connect to CDR database at {CDR_DB_CONFIG['host']}:3306")
        connection = mysql.connector.connect(**CDR_DB_CONFIG)
        print("CDR Database connection successful!")
        return connection
    except Error as e:
        print(f"Error connecting to CDR MySQL: {e}")
        print(f"Connection details: {CDR_DB_CONFIG}")
        return None