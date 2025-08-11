# backend/routes/breaks.py

from flask import Blueprint, request, jsonify
from mysql.connector import Error
from datetime import datetime
from dateutil import parser
import sys
import os

# Fix relative import error when running directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from backend.db.connection import get_db_connection

breaks_bp = Blueprint('breaks', __name__, url_prefix='/api/breaks')

@breaks_bp.route('', methods=['POST'])
def insert_agent_break():
    try:
        data = request.json

        agent_number = data.get('agentNumber', 'A001')
        from_time = data.get('fromTime')
        to_time = data.get('toTime')
        remark = data.get('remark', '')

        if not from_time or not to_time:
            return jsonify({'error': 'fromTime and toTime are required'}), 400

        # Proper ISO parsing including timezone support
        break_start_dt = parser.isoparse(from_time).replace(tzinfo=None)
        break_end_dt = parser.isoparse(to_time).replace(tzinfo=None)

        if break_end_dt <= break_start_dt:
            return jsonify({'error': 'toTime must be after fromTime'}), 400

        break_start = break_start_dt.strftime('%Y-%m-%d %H:%M:%S')
        break_end = break_end_dt.strftime('%Y-%m-%d %H:%M:%S')
        duration_seconds = int((break_end_dt - break_start_dt).total_seconds())

        connection = get_db_connection()
        connection.database = 'call_center_db'
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO agent_breaks (agent_number, status, break_start, break_end, duration_seconds, remark)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (agent_number, 'Break', break_start, break_end, duration_seconds, remark))

        connection.commit()
        return jsonify({'message': 'Break inserted successfully'})

    except Error as db_err:
        return jsonify({'error': f'Database error: {db_err}'}), 500
    except Exception as err:
        return jsonify({'error': str(err)}), 500
    finally:
        try:
            cursor.close()
            connection.close()
        except:
            pass