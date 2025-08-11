# Configuration variables for Flask app and databases
SECRET_KEY = 'your-secret-key-here'  # Change this in production
DB_CONFIG = {
    'host': 'localhost',
    'database': 'call_center_db',
    'user': 'root',
    'password': 'test'
}
CDR_DB_CONFIG = {
    'host': '192.168.0.101',
    'database': 'asterisk_custom',
    'user': 'asterisk_user',
    'password': 'retro',
    'charset': 'utf8mb4',  
    'use_unicode': True
}