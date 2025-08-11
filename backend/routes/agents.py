from flask import Blueprint, request, jsonify ,current_app
from backend.db.connection import get_db_connection
from backend.auth.jwt_utils import token_required
from mysql.connector import Error, errorcode
from datetime import datetime

agents_bp = Blueprint('agents', __name__)

@agents_bp.route('/api/agents', methods=['GET'])
@token_required
def get_agents(current_user_id):
    # ... (move the full get_agents logic here from app.py)
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, agent_number, name, email, password, status, is_admin FROM agents ORDER BY agent_number")
        agents = cursor.fetchall()
        return jsonify({'agents': agents}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents', methods=['POST'])
@token_required
def add_agent(current_user_id):
    # ... (move the full add_agent logic here from app.py)
    try:
        # Check admin
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        if role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        req = request.get_json()
        agent_number = req.get('agent_number')
        name = req.get('name')
        email = req.get('email')
        password = req.get('password')
        status = req.get('status', 'Active')
        is_admin = req.get('is_admin', False)
        if not agent_number or not name or not email or not password:
            return jsonify({'message': 'Missing required fields'}), 400
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO agents (agent_number, name, email, password, status, is_admin)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (agent_number, name, email, password, status, is_admin))
        connection.commit()
        return jsonify({'message': 'Agent added successfully'}), 201
    except Error as e:
        # Handle duplicate key violations with a user-friendly message
        if getattr(e, 'errno', None) == errorcode.ER_DUP_ENTRY:
            # Determine which unique key was violated, if possible
            message = 'Duplicate entry'
            try:
                err_msg = str(e)
                if 'agents.agent_number' in err_msg:
                    message = 'This agent number is already registered.'
                elif 'agents.email' in err_msg:
                    message = 'This email is already in use.'
                else:
                    message = 'A record with the same unique value already exists.'
            except Exception:
                message = 'A record with the same unique value already exists.'
            return jsonify({'message': message}), 409
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()


@agents_bp.route('/api/agents/<agent_number>', methods=['PUT'])
@token_required
def edit_agent(current_user_id, agent_number):
    try:
        # Auth context
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        token_agent_number = data.get('agent_number')

        req = request.get_json()
        name = req.get('name')
        email = req.get('email')
        password = req.get('password')
        status = req.get('status')
        is_admin = req.get('is_admin')

        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500

        # If admin, allow full edit
        if role == 'admin':
            cursor = connection.cursor()
            update_fields = []
            params = []
            if name:
                update_fields.append('name = %s')
                params.append(name)
            if email:
                update_fields.append('email = %s')
                params.append(email)
            if password:
                update_fields.append('password = %s')
                params.append(password)
            if status:
                update_fields.append('status = %s')
                params.append(status)
            if is_admin is not None:
                update_fields.append('is_admin = %s')
                params.append(is_admin)
            if not update_fields:
                return jsonify({'message': 'No fields to update'}), 400
            params.append(agent_number)
            sql = f"UPDATE agents SET {', '.join(update_fields)} WHERE agent_number = %s"
            cursor.execute(sql, tuple(params))
            connection.commit()
            return jsonify({'message': 'Agent updated successfully'}), 200

        # If agent, allow only self password change
        if role == 'agent' and token_agent_number == agent_number:
            if not password:
                return jsonify({'message': 'Password required'}), 400
            cursor = connection.cursor()
            cursor.execute("UPDATE agents SET password = %s WHERE agent_number = %s", (password, agent_number))
            connection.commit()
            return jsonify({'message': 'Password updated successfully'}), 200

        return jsonify({'message': 'Unauthorized'}), 403
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents/<agent_number>', methods=['DELETE'])
@token_required
def delete_agent(current_user_id, agent_number):
    # ... (move the full delete_agent logic here from app.py)
    try:
        # Check admin
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        if role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        cursor.execute("DELETE FROM agents WHERE agent_number = %s", (agent_number,))
        connection.commit()
        return jsonify({'message': 'Agent deleted successfully'}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents/breaks', methods=['POST'])
@token_required
def add_agent_break(current_user_id):
    """Agent posts their break or working status record."""
    try:
        req = request.get_json()
        agent_number = req.get('agent_number')
        status = req.get('status')  # 'Working' or 'Break'
        break_start = req.get('break_start')
        break_end = req.get('break_end')
        duration_seconds = req.get('duration_seconds')
        remark = req.get('remark')
        if not agent_number or not status:
            return jsonify({'message': 'Missing required fields'}), 400
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO agent_breaks (agent_number, status, break_start, break_end, duration_seconds, remark)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (agent_number, status, break_start, break_end, duration_seconds, remark))
        connection.commit()
        return jsonify({'message': 'Break/working status recorded successfully'}), 201
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents/breaks/close', methods=['PUT'])
@token_required
def close_latest_agent_break(current_user_id):
    """Close the latest ongoing break for an agent by setting break_end and duration_seconds."""
    try:
        req = request.get_json()
        agent_number = req.get('agent_number')
        break_end = req.get('break_end')  # Expect '%Y-%m-%d %H:%M:%S'
        if not agent_number:
            return jsonify({'message': 'agent_number is required'}), 400
        # If break_end not provided, use current time in DB server timezone
        if not break_end:
            break_end = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        # Find latest break with no end
        cursor.execute(
            """
            SELECT id, break_start FROM agent_breaks
            WHERE agent_number = %s AND status = 'Break' AND break_end IS NULL
            ORDER BY break_start DESC
            LIMIT 1
            """,
            (agent_number,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'message': 'No ongoing break found'}), 404
        # Update with break_end and duration in seconds
        cursor2 = connection.cursor()
        cursor2.execute(
            """
            UPDATE agent_breaks
            SET break_end = %s,
                duration_seconds = TIMESTAMPDIFF(SECOND, break_start, %s)
            WHERE id = %s
            """,
            (break_end, break_end, row['id'])
        )
        connection.commit()
        return jsonify({'message': 'Break closed successfully'}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents/breaks', methods=['GET'])
@token_required
def get_agent_breaks(current_user_id):
    """Admin gets all agent break/working status records, with optional search and grouping by date."""
    try:
        # Only admin can view all
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        if role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        # Optional search params
        search = request.args.get('search', '')
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT ab.*, a.name, a.email FROM agent_breaks ab
            JOIN agents a ON ab.agent_number = a.agent_number
        """
        params = []
        if search:
            query += " WHERE a.name LIKE %s OR ab.agent_number LIKE %s "
            params.extend([f"%{search}%", f"%{search}%"])
        query += " ORDER BY ab.break_start DESC"
        cursor.execute(query, tuple(params))
        breaks = cursor.fetchall()
        # Group by date
        from collections import defaultdict
        grouped = defaultdict(list)
        for b in breaks:
            date_key = b['break_start'].date() if b['break_start'] else b['created_at'].date()
            grouped[str(date_key)].append(b)
        return jsonify({'breaks': grouped}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@agents_bp.route('/api/agents/current-status', methods=['GET'])
@token_required
def get_agents_current_status(current_user_id):
    """Return the current working status for each agent based on the latest agent_breaks row.
    Admins see all agents; agents see only their own status.
    """
    try:
        # Auth context
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        token_agent_number = data.get('agent_number')

        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)

        # Build query: latest break/work row per agent
        base = """
            SELECT a.agent_number,
                   CASE WHEN ab.status = 'Break' AND ab.break_end IS NULL THEN 'Break' ELSE 'Working' END AS current_status,
                   ab.break_start,
                   ab.break_end
            FROM agents a
            LEFT JOIN (
                SELECT x.* FROM agent_breaks x
                JOIN (
                    SELECT agent_number, MAX(COALESCE(break_start, created_at)) AS max_dt
                    FROM agent_breaks
                    GROUP BY agent_number
                ) m ON m.agent_number = x.agent_number AND COALESCE(x.break_start, x.created_at) = m.max_dt
            ) ab ON ab.agent_number = a.agent_number
        """
        params = []
        if role == 'agent' and token_agent_number:
            base += " WHERE a.agent_number = %s"
            params.append(token_agent_number)
        elif role == 'admin':
            # For admin view: exclude inactive agents and admin accounts from current status mapping
            base += " WHERE a.status = 'Active' AND a.is_admin = 0"
        base += " ORDER BY a.agent_number"
        cursor.execute(base, tuple(params))
        rows = cursor.fetchall()
        # Return as mapping agent_number -> status
        mapping = {row['agent_number']: row['current_status'] for row in rows}
        return jsonify({'current_status': mapping, 'rows': rows}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()