from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from backend.db.connection import get_db_connection
from backend.db.company_tables import get_company_table_name
from mysql.connector import Error
import re

login_bp = Blueprint('login', __name__)

@login_bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        password = data.get('password')
        agent_number = data.get('agentNumber')
        login_type = data.get('loginType', 'admin_or_agent')  # 'master' or default
        
        print("Login attempt:", user_id, agent_number, password)

        if not password or (not user_id and not agent_number):
            return jsonify({'message': 'User ID/Agent Number and password required'}), 400

        # Enforce numeric-only for non-master logins
        if login_type != 'master':
            if user_id is not None:
                if not isinstance(user_id, str):
                    user_id = str(user_id)
                if not re.fullmatch(r"\d+", user_id):
                    return jsonify({'message': 'User ID must contain numbers only'}), 400
            if agent_number is not None:
                if not isinstance(agent_number, str):
                    agent_number = str(agent_number)
                if not re.fullmatch(r"\d+", agent_number):
                    return jsonify({'message': 'Agent number must contain numbers only'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)

        # Master login path
        if login_type == 'master':
            cursor.execute(
                """
                SELECT id, username, name, email FROM master_users
                WHERE username = %s AND password = %s
                """,
                (user_id, password)
            )
            master = cursor.fetchone()
            if master:
                token = jwt.encode({
                    'user_id': master['id'],
                    'role': 'master',
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, current_app.config['SECRET_KEY'], algorithm='HS256')
                return jsonify({
                    'message': 'Login successful',
                    'token': token,
                    'user': {
                        'id': master['id'],
                        'user_id': master['username'],
                        'name': master['name'],
                        'email': master['email'],
                        'role': 'master'
                    }
                }), 200
        user = None
        agent = None
        # Resolve company and login against per-company agents table when possible
        def try_login_in_company(company_id: int, agent_or_user_id: str, pwd: str):
            table = get_company_table_name('agents', company_id)
            c2 = connection.cursor(dictionary=True)
            try:
                c2.execute(
                    f"""
                    SELECT id, agent_number, name, email, is_admin, status
                    FROM `{table}`
                    WHERE agent_number = %s AND password = %s
                    """,
                    (agent_or_user_id, pwd)
                )
                row = c2.fetchone()
                return row
            finally:
                c2.close()

        # If userId provided, first check if it matches a company's admin_username
        resolved_company_id = None
        if user_id:
            cursor.execute(
                "SELECT id, admin_password FROM companies WHERE admin_username = %s",
                (user_id,)
            )
            comp_row = cursor.fetchone()
            if comp_row:
                resolved_company_id = comp_row['id']
                # Validate admin credentials against per-company table
                row = try_login_in_company(resolved_company_id, user_id, password)
                if row and row.get('is_admin'):
                    if row.get('status') == 'Removed':
                        return jsonify({'message': 'You are no longer an agent.'}), 403
                    role = 'admin'
                    token = jwt.encode({
                        'user_id': row['id'],
                        'agent_number': row['agent_number'],
                        'role': role,
                        'company_id': resolved_company_id,
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, current_app.config['SECRET_KEY'], algorithm='HS256')
                    return jsonify({
                        'message': 'Login successful',
                        'token': token,
                        'user': {
                            'id': row['id'],
                            'agent_number': row['agent_number'],
                            'name': row['name'],
                            'email': row['email'],
                            'role': role,
                            'company_id': resolved_company_id
                        }
                    }), 200

        # If not an admin username, try resolve company via shared agents mapping
        if user_id and not resolved_company_id:
            cursor.execute(
                """
                SELECT id, agent_number, name, email, is_admin, status, company_id
                FROM agents
                WHERE agent_number = %s AND password = %s
                """,
                (user_id, password)
            )
            agent = cursor.fetchone()
            if agent and agent.get('company_id'):
                resolved_company_id = agent['company_id']
                row = try_login_in_company(resolved_company_id, user_id, password)
                if row:
                    if row.get('status') == 'Removed':
                        return jsonify({'message': 'You are no longer an agent.'}), 403
                    role = 'admin' if row['is_admin'] else 'agent'
                    token = jwt.encode({
                        'user_id': row['id'],
                        'agent_number': row['agent_number'],
                        'role': role,
                        'company_id': resolved_company_id,
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, current_app.config['SECRET_KEY'], algorithm='HS256')
                    return jsonify({
                        'message': 'Login successful',
                        'token': token,
                        'user': {
                            'id': row['id'],
                            'agent_number': row['agent_number'],
                            'name': row['name'],
                            'email': row['email'],
                            'role': role,
                            'company_id': resolved_company_id
                        }
                    }), 200

        # As a final attempt, if user_id is present, try it as an agent_number across all companies
        if user_id and not resolved_company_id:
            cursor.execute("SELECT id FROM companies")
            for comp in cursor.fetchall():
                cid = comp['id'] if isinstance(comp, dict) else comp[0]
                row = try_login_in_company(int(cid), user_id, password)
                if row:
                    if row.get('status') == 'Removed':
                        return jsonify({'message': 'You are no longer an agent.'}), 403
                    if row.get('status') != 'Active' and not row.get('is_admin'):
                        return jsonify({'message': 'Your account is inactive. Please contact an administrator.'}), 403
                    role = 'admin' if row['is_admin'] else 'agent'
                    token = jwt.encode({
                        'user_id': row['id'],
                        'agent_number': row['agent_number'],
                        'role': role,
                        'company_id': int(cid),
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, current_app.config['SECRET_KEY'], algorithm='HS256')
                    return jsonify({
                        'message': 'Login successful',
                        'token': token,
                        'user': {
                            'id': row['id'],
                            'agent_number': row['agent_number'],
                            'name': row['name'],
                            'email': row['email'],
                            'role': role,
                            'company_id': int(cid)
                        }
                    }), 200

        # Otherwise, try user login
        if user_id:
            cursor.execute("""
                SELECT id, user_id, name, email, company_id 
                FROM users 
                WHERE user_id = %s AND password = %s
            """, (user_id, password))
            user = cursor.fetchone()
            if user:
                # Generate JWT token for user
                token = jwt.encode({
                    'user_id': user['id'],
                    'role': 'admin',
                    'company_id': user.get('company_id'),
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, current_app.config['SECRET_KEY'], algorithm='HS256')
                return jsonify({
                    'message': 'Login successful',
                    'token': token,
                    'user': {
                        'id': user['id'],
                        'user_id': user['user_id'],
                        'name': user['name'],
                        'email': user['email'],
                        'role': 'admin',
                        'company_id': user.get('company_id')
                    }
                }), 200

        # fallback: try agentNumber if provided
        if agent_number:
            # Try resolve via shared mapping first
            cursor.execute(
                """
                SELECT id, agent_number, name, email, is_admin, status, company_id
                FROM agents
                WHERE agent_number = %s AND password = %s
                """,
                (agent_number, password)
            )
            agent = cursor.fetchone()
            if agent and agent.get('company_id'):
                resolved_company_id = agent['company_id']
                row = try_login_in_company(resolved_company_id, agent_number, password)
                if row:
                    if row.get('status') == 'Removed':
                        return jsonify({'message': 'You are no longer an agent.'}), 403
                    if row.get('status') != 'Active':
                        return jsonify({'message': 'Your account is inactive. Please contact an administrator.'}), 403
                    role = 'admin' if row['is_admin'] else 'agent'
                    token = jwt.encode({
                        'user_id': row['id'],
                        'agent_number': row['agent_number'],
                        'role': role,
                        'company_id': resolved_company_id,
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, current_app.config['SECRET_KEY'], algorithm='HS256')
                    return jsonify({
                        'message': 'Login successful',
                        'token': token,
                        'user': {
                            'id': row['id'],
                            'agent_number': row['agent_number'],
                            'name': row['name'],
                            'email': row['email'],
                            'role': role,
                            'company_id': resolved_company_id
                        }
                    }), 200

            # Fallback: brute-force check across companies (lightweight approach)
            cursor.execute("SELECT id FROM companies")
            for comp in cursor.fetchall():
                cid = comp['id'] if isinstance(comp, dict) else comp[0]
                row = try_login_in_company(int(cid), agent_number, password)
                if row:
                    if row.get('status') == 'Removed':
                        return jsonify({'message': 'You are no longer an agent.'}), 403
                    if row.get('status') != 'Active':
                        return jsonify({'message': 'Your account is inactive. Please contact an administrator.'}), 403
                    role = 'admin' if row['is_admin'] else 'agent'
                    token = jwt.encode({
                        'user_id': row['id'],
                        'agent_number': row['agent_number'],
                        'role': role,
                        'company_id': int(cid),
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, current_app.config['SECRET_KEY'], algorithm='HS256')
                    return jsonify({
                        'message': 'Login successful',
                        'token': token,
                        'user': {
                            'id': row['id'],
                            'agent_number': row['agent_number'],
                            'name': row['name'],
                            'email': row['email'],
                            'role': role,
                            'company_id': int(cid)
                        }
                    }), 200

        return jsonify({'message': 'Invalid credentials'}), 401
            
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()