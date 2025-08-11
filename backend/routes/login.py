from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from backend.db.connection import get_db_connection
from mysql.connector import Error

login_bp = Blueprint('login', __name__)

@login_bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        password = data.get('password')
        agent_number = data.get('agentNumber')
        
        print("Login attempt:", user_id, agent_number, password)

        if not password or (not user_id and not agent_number):
            return jsonify({'message': 'User ID/Agent Number and password required'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        user = None
        agent = None
        # Try agent login first if userId looks like an agent number
        if user_id :
            cursor.execute("""
                SELECT id, agent_number, name, email, is_admin, status
                FROM agents 
                WHERE agent_number = %s AND password = %s
            """, (user_id, password))
            agent = cursor.fetchone()
            if agent:
                # Reject non-active accounts with specific messages
                if agent.get('status') == 'Removed':
                    return jsonify({'message': 'You are no longer an agent.'}), 403
                # if agent.get('status') != 'Active':
                #     return jsonify({'message': 'Your account is inactive. Please contact an administrator.'}), 403
                # Generate JWT token for agent
                role = 'admin' if agent['is_admin'] else 'agent'
                token = jwt.encode({
                    'user_id': agent['id'],
                    'agent_number': agent['agent_number'],
                    'role': role,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, current_app.config['SECRET_KEY'], algorithm='HS256')
                return jsonify({
                    'message': 'Login successful',
                    'token': token,
                    'user': {
                        'id': agent['id'],
                        'agent_number': agent['agent_number'],
                        'name': agent['name'],
                        'email': agent['email'],
                        'role': role
                    }
                }), 200

        # Otherwise, try user login
        if user_id:
            cursor.execute("""
                SELECT id, user_id, name, email 
                FROM users 
                WHERE user_id = %s AND password = %s
            """, (user_id, password))
            user = cursor.fetchone()
            if user:
                # Generate JWT token for user
                token = jwt.encode({
                    'user_id': user['id'],
                    'role': 'admin',
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
                        'role': 'admin'
                    }
                }), 200

        # fallback: try agentNumber if provided
        if agent_number:
            cursor.execute("""
                SELECT id, agent_number, name, email, is_admin, status
                FROM agents 
                WHERE agent_number = %s AND password = %s
            """, (agent_number, password))
            agent = cursor.fetchone()
            if agent:
                # Reject non-active accounts with specific messages
                if agent.get('status') == 'Removed':
                    return jsonify({'message': 'You are no longer an agent.'}), 403
                if agent.get('status') != 'Active':
                    return jsonify({'message': 'Your account is inactive. Please contact an administrator.'}), 403
                # Generate JWT token for agent
                role = 'admin' if agent['is_admin'] else 'agent'
                token = jwt.encode({
                    'user_id': agent['id'],
                    'agent_number': agent['agent_number'],
                    'role': role,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, current_app.config['SECRET_KEY'], algorithm='HS256')
                return jsonify({
                    'message': 'Login successful',
                    'token': token,
                    'user': {
                        'id': agent['id'],
                        'agent_number': agent['agent_number'],
                        'name': agent['name'],
                        'email': agent['email'],
                        'role': role
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