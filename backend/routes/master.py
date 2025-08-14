from flask import Blueprint, request, jsonify, current_app
from backend.db.connection import get_db_connection
from backend.db.company_tables import create_company_tables, get_company_table_name
from backend.auth.jwt_utils import token_required
from mysql.connector import Error
import re
import jwt

master_bp = Blueprint('master', __name__)


def require_master(token_str):
    try:
        data = jwt.decode(token_str, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if data.get('role') != 'master':
            return None, jsonify({'message': 'Unauthorized'}), 403
        return data, None, None
    except Exception:
        return None, jsonify({'message': 'Invalid token'}), 401


@master_bp.route('/api/master/login', methods=['POST'])
def master_login():
    try:
        payload = request.get_json()
        username = payload.get('username')
        password = payload.get('password')
        if not username or not password:
            return jsonify({'message': 'Username and password required'}), 400
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, username, name, email
            FROM master_users
            WHERE username = %s AND password = %s
            """,
            (username, password)
        )
        master = cursor.fetchone()
        if not master:
            return jsonify({'message': 'Invalid credentials'}), 401
        token = jwt.encode({
            'user_id': master['id'],
            'role': 'master'
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': master['id'],
                'username': master['username'],
                'name': master['name'],
                'email': master['email'],
                'role': 'master'
            }
        }), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@master_bp.route('/api/master/companies', methods=['GET'])
@token_required
def list_companies(current_user_id):
    try:
        # Validate master
        auth_header = request.headers.get('Authorization', '')
        token_str = auth_header.split(' ')[1] if ' ' in auth_header else ''
        data, err_resp, err_code = require_master(token_str)
        if err_resp:
            return err_resp, err_code
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, name, admin_username, admin_password, email, contact_no, payment_status, status, created_at
            FROM companies
            WHERE created_by_master_id = %s
            ORDER BY created_at DESC
            """,
            (data['user_id'],)
        )
        rows = cursor.fetchall()
        return jsonify({'companies': rows}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@master_bp.route('/api/master/companies', methods=['POST'])
@token_required
def create_company(current_user_id):
    try:
        # Validate master
        auth_header = request.headers.get('Authorization', '')
        token_str = auth_header.split(' ')[1] if ' ' in auth_header else ''
        data, err_resp, err_code = require_master(token_str)
        if err_resp:
            return err_resp, err_code
        body = request.get_json()
        name = body.get('name')
        admin_username = body.get('admin_username')
        admin_password = body.get('admin_password')
        email = body.get('email')
        contact_no = body.get('contact_no')
        payment_status = body.get('payment_status', 'Paid')
        if not all([name, admin_username, admin_password, email]):
            return jsonify({'message': 'Missing required fields'}), 400
        # Enforce numeric-only admin_username
        if not isinstance(admin_username, str):
            admin_username = str(admin_username)
        # Normalize possible +91/0/91 prefixes and validate 10-digit Indian mobile starting 6-9
        digits = re.sub(r"\D", "", admin_username)
        if len(digits) == 11 and digits.startswith('0'):
            digits = digits[1:]
        if len(digits) == 12 and digits.startswith('91'):
            digits = digits[2:]
        if not (len(digits) == 10 and digits[0] in ('6','7','8','9')):
            return jsonify({'message': 'Admin username must be a valid 10-digit Indian mobile number'}), 400
        admin_username = digits
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        # Create company
        cursor.execute(
            """
            INSERT INTO companies (name, admin_username, admin_password, email, contact_no, payment_status, status, created_by_master_id)
            VALUES (%s, %s, %s, %s, %s, %s, 'Active', %s)
            """,
            (name, admin_username, admin_password, email, contact_no, payment_status, data['user_id'])
        )
        company_id = cursor.lastrowid

        # Create per-company tables
        create_company_tables(connection, company_id)

        # Seed admin user in both per-company agents_{company_id} and shared agents table (mapping)
        admin_name = f"Admin - {name}"
        per_company_agents = get_company_table_name('agents', company_id)

        # Insert into per-company table
        cursor.execute(
            f"""
            INSERT INTO `{per_company_agents}` (agent_number, name, email, password, status, is_admin)
            VALUES (%s, %s, %s, %s, 'Active', TRUE)
            """,
            (admin_username, admin_name, email, admin_password)
        )

        # Do not write to shared 'agents' mapping to avoid unique/index conflicts

        connection.commit()
        return jsonify({'message': 'Company created successfully', 'company_id': company_id}), 201
    except Error as e:
        if 'connection' in locals():
            connection.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@master_bp.route('/api/master/companies/<int:company_id>', methods=['PUT'])
@token_required
def edit_company(current_user_id, company_id):
    try:
        auth_header = request.headers.get('Authorization', '')
        token_str = auth_header.split(' ')[1] if ' ' in auth_header else ''
        data, err_resp, err_code = require_master(token_str)
        if err_resp:
            return err_resp, err_code
        body = request.get_json()
        fields = []
        params = []
        for key in ['name', 'admin_username', 'admin_password', 'email', 'contact_no', 'payment_status', 'status']:
            # Only update password if a non-empty string is provided
            if key == 'admin_password' and (key not in body or not body[key]):
                continue # Skip if password is empty or not provided

            if key in body and body[key] is not None:
                fields.append(f"{key} = %s")
                params.append(body[key])
        # If admin_username provided, validate numeric-only
        if 'admin_username' in body and body['admin_username'] is not None:
            au = body['admin_username']
            if not isinstance(au, str):
                au = str(au)
            digits = re.sub(r"\D", "", au)
            if len(digits) == 11 and digits.startswith('0'):
                digits = digits[1:]
            if len(digits) == 12 and digits.startswith('91'):
                digits = digits[2:]
            if not (len(digits) == 10 and digits[0] in ('6','7','8','9')):
                return jsonify({'message': 'Admin username must be a valid 10-digit Indian mobile number'}), 400
            # Overwrite body param to normalized value so DB stays consistent
            body['admin_username'] = digits
            # Update params to use normalized value
            try:
                idx = [i for i,k in enumerate(['name','admin_username','admin_password','email','contact_no','payment_status','status']) if k in body and body[k] is not None].index(1)  # not reliable; recompute below
            except Exception:
                pass
            # Rebuild fields/params to ensure normalized value is used
            fields = []
            params = []
            for key in ['name', 'admin_username', 'admin_password', 'email', 'contact_no', 'payment_status', 'status']:
                if key in body and body[key] is not None:
                    fields.append(f"{key} = %s")
                    params.append(body[key])
        if not fields:
            return jsonify({'message': 'No fields to update'}), 400
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        params.append(company_id)
        cursor.execute(f"UPDATE companies SET {', '.join(fields)} WHERE id = %s", tuple(params))

        # Keep per-company admin agent in sync with company admin fields
        per_company_agents = get_company_table_name('agents', company_id)
        admin_updates = []
        admin_params = []
        if 'admin_username' in body and body['admin_username'] is not None:
            admin_updates.append("agent_number = %s")
            admin_params.append(body['admin_username'])
        if 'admin_password' in body and body['admin_password'] is not None:
            admin_updates.append("password = %s")
            admin_params.append(body['admin_password'])
        if 'email' in body and body['email'] is not None:
            admin_updates.append("email = %s")
            admin_params.append(body['email'])
        if 'name' in body and body['name'] is not None:
            admin_updates.append("name = %s")
            admin_params.append(f"Admin - {body['name']}")
        if admin_updates:
            cursor.execute(
                f"UPDATE `{per_company_agents}` SET {', '.join(admin_updates)} WHERE is_admin = TRUE",
                tuple(admin_params)
            )
        connection.commit()
        return jsonify({'message': 'Company updated successfully'}), 200
    except Error as e:
        if 'connection' in locals():
            connection.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@master_bp.route('/api/master/companies/<int:company_id>/stop', methods=['POST'])
@token_required
def stop_company(current_user_id, company_id):
    try:
        auth_header = request.headers.get('Authorization', '')
        token_str = auth_header.split(' ')[1] if ' ' in auth_header else ''
        data, err_resp, err_code = require_master(token_str)
        if err_resp:
            return err_resp, err_code
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        cursor.execute("UPDATE companies SET status = 'Fully Close' WHERE id = %s", (company_id,))
        connection.commit()
        return jsonify({'message': 'Company service stopped (Fully Close)'}), 200
    except Error as e:
        if 'connection' in locals():
            connection.rollback()
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()



