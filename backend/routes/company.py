from flask import Blueprint, request, jsonify, current_app
from backend.db.connection import get_db_connection
from backend.auth.jwt_utils import token_required
from mysql.connector import Error
import jwt

company_bp = Blueprint('company', __name__)


@company_bp.route('/api/company', methods=['GET'])
@token_required
def get_current_company(current_user_id):
    try:
        auth_header = request.headers.get('Authorization', '')
        token_str = auth_header.split(' ')[1] if ' ' in auth_header else ''
        data = jwt.decode(token_str, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        company_id = data.get('company_id')
        role = data.get('role')
        if role not in ('admin', 'agent') or not company_id:
            return jsonify({'company': None}), 200
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, name, admin_username, admin_password, email, contact_no, payment_status, status FROM companies WHERE id = %s",
            (company_id,)
        )
        row = cursor.fetchone()
        return jsonify({'company': row}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()




