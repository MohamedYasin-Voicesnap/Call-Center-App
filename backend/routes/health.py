from flask import Blueprint, jsonify
from backend.db.connection import get_cdr_db_connection

health_bp = Blueprint('health', __name__)

@health_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@health_bp.route('/api/test-cdr', methods=['GET'])
def test_cdr_connection():
    try:
        print("=== TESTING CDR CONNECTION ===")
        connection = get_cdr_db_connection()
        if connection is None:
            return jsonify({'status': 'ERROR', 'message': 'CDR Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Test basic query
        cursor.execute("SELECT COUNT(*) as total FROM calls")
        result = cursor.fetchone()
        total_calls = result['total'] if result else 0
        
        # Test sample data
        cursor.execute("SELECT * FROM calls LIMIT 3")
        sample_calls = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'status': 'SUCCESS',
            'message': 'CDR Database connection successful',
            'total_calls': total_calls,
            'sample_calls': sample_calls
        }), 200
        
    except Exception as e:
        return jsonify({'status': 'ERROR', 'message': f'CDR Test failed: {str(e)}'}), 500
