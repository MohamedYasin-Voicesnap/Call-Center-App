from flask import Blueprint, request, jsonify, send_file
from backend.db.connection import get_db_connection
from backend.auth.jwt_utils import token_required
from mysql.connector import Error
import datetime
from flask import current_app
import io
import csv
import tempfile
from openpyxl import load_workbook, Workbook

calls_bp = Blueprint('calls', __name__)

@calls_bp.route('/api/calls', methods=['GET'])
@token_required
def get_calls(current_user_id):
    # ... (move the full get_calls logic here from app.py)
    try:
        print("=== DEBUG: Calls endpoint called ===")
        # Get role and agent_number from JWT
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
        agent_number = data.get('agent_number', None)

        # Date filter
        from_date = request.args.get('from')
        to_date = request.args.get('to')

        connection = get_db_connection()
        # connection = get_cdr_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)

        # Ensure recordings column is LONGBLOB
        try:
            check_cursor = connection.cursor(dictionary=True)
            check_cursor.execute(
                """
                SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND COLUMN_NAME = 'recordings'
                """
            )
            col = check_cursor.fetchone()
            if col and col.get('DATA_TYPE', '').lower() != 'longblob':
                fix_cursor = connection.cursor()
                fix_cursor.execute("ALTER TABLE calls MODIFY recordings LONGBLOB")
                connection.commit()
        except Exception:
            pass

        # Build base query
        base_query = (
            "SELECT id, agent_number, customer_number, duration, call_status, timestamp, "
            "remarks, name, remarks_status, (recordings IS NOT NULL) AS has_recording, alternative_numbers, "
            "meeting_datetime, meeting_description FROM calls"
        )
        where_clauses = []
        params = []
        if role == 'agent' and agent_number:
            where_clauses.append('agent_number = %s')
            params.append(agent_number)
        if from_date:
            where_clauses.append('timestamp >= %s')
            params.append(from_date + ' 00:00:00')
        if to_date:
            where_clauses.append('timestamp <= %s')
            params.append(to_date + ' 23:59:59')
        if where_clauses:
            base_query += ' WHERE ' + ' AND '.join(where_clauses)
        base_query += ' ORDER BY timestamp DESC'
        cursor.execute(base_query, tuple(params))
        calls = cursor.fetchall()
        # Normalize timestamps and unify customer names within the same customer_number group
        latest_name_by_customer = {}
        for call in calls:
            if call['timestamp']:
                call['timestamp'] = call['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            if call.get('meeting_datetime'):
                try:
                    call['meeting_datetime'] = call['meeting_datetime'].strftime('%Y-%m-%d %H:%M:%S')
                except Exception:
                    pass
            cust = call.get('customer_number')
            name = (call.get('name') or '').strip()
            if cust:
                # Because we ordered DESC by timestamp, the first seen name per customer is the latest
                if cust not in latest_name_by_customer and name:
                    latest_name_by_customer[cust] = name
        for call in calls:
            cust = call.get('customer_number')
            if cust and latest_name_by_customer.get(cust):
                call['name'] = latest_name_by_customer[cust]
        return jsonify({'calls': calls}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        try:
            if 'cursor' in locals() and cursor:
                cursor.close()
            if 'connection' in locals() and connection:
                connection.close()
        except Exception as e:
            print(f"Error closing resources: {e}")

@calls_bp.route('/api/calls/<int:call_id>/custom', methods=['PUT'])
@token_required
def update_call_custom_fields(current_user_id, call_id):
    # ... (move the full update_call_custom_fields logic here from app.py)
    try:
        data = request.get_json()
        remarks = data.get('remarks', '')
        name = data.get('name', '')
        remarks_status = data.get('remarks_status', '')
        recordings = None  # recordings blob handled via separate endpoint
        alternative_numbers = data.get('alternative_numbers', '')
        meeting_datetime = data.get('meeting_datetime')
        meeting_description = data.get('meeting_description')

        connection = get_db_connection()
        # connection = get_cdr_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)

        # Fetch current values
        cursor.execute("SELECT customer_number, remarks, name, remarks_status, alternative_numbers FROM calls WHERE id = %s", (call_id,))
        call = cursor.fetchone()
        if not call:
            return jsonify({'message': 'Call not found'}), 404

        now = datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        def concat(old, new):
            old = old or ''
            if new:
                return (old + ' | ' if old else '') + f"{new} <span style='font-size:10px;color:gray;'>[{now}]</span>"
            return old

        updated_remarks = concat(call.get('remarks', ''), remarks)
        # For name: single canonical value per customer. If provided, replace and propagate to all calls for this customer.
        updated_name = call.get('name', '')
        if name and name.strip():
            updated_name = name.strip()
        updated_remarks_status = concat(call.get('remarks_status', ''), remarks_status)
        updated_alternative_numbers = alternative_numbers if alternative_numbers else call.get('alternative_numbers', '')
        
        cursor.execute(
            """
            UPDATE calls SET remarks=%s, name=%s, remarks_status=%s, alternative_numbers=%s,
                   meeting_datetime=%s, meeting_description=%s
            WHERE id=%s
            """,
            (
                updated_remarks,
                updated_name,
                updated_remarks_status,
                updated_alternative_numbers,
                meeting_datetime,
                meeting_description,
                call_id,
            ),
        )
        # If name changed, propagate to all rows for that customer
        if name and name.strip():
            cursor.execute(
                "UPDATE calls SET name=%s WHERE customer_number=%s",
                (updated_name, call['customer_number']),
            )
        connection.commit()
        return jsonify({'message': 'Custom fields updated successfully'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()  # Print full stack trace to console
        print("Updated Remarks:", updated_remarks)
        print("Updated Name:", updated_name)
        print("Updated Remarks Status:", updated_remarks_status)
        # recordings handled separately
        print("Updated Alternative Numbers:", updated_alternative_numbers)
        print("Call ID:", call_id)
        return jsonify({'message': f'Server error: {str(e)}'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@calls_bp.route('/api/calls/<int:call_id>/recording', methods=['GET'])
@token_required
def download_call_recording(current_user_id, call_id):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        cursor.execute("SELECT recordings FROM calls WHERE id=%s", (call_id,))
        row = cursor.fetchone()
        if not row or row[0] is None:
            return jsonify({'message': 'Recording not found'}), 404
        blob = row[0]
        # Try to infer audio MIME type from file header
        mime = 'audio/mpeg'
        try:
            header = bytes(blob[:4]) if isinstance(blob, (bytes, bytearray)) else b''
            if header.startswith(b'RIFF'):
                mime = 'audio/wav'
            elif header.startswith(b'OggS'):
                mime = 'audio/ogg'
            elif header[:3] == b'ID3' or header[:2] == b'\xff\xfb':
                mime = 'audio/mpeg'
        except Exception:
            pass
        resp = send_file(io.BytesIO(blob), mimetype=mime)
        try:
            resp.headers['Accept-Ranges'] = 'bytes'
        except Exception:
            pass
        return resp
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@calls_bp.route('/api/calls/<int:call_id>/recording', methods=['PUT'])
@token_required
def upload_call_recording(current_user_id, call_id):
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file provided'}), 400
        f = request.files['file']
        data = f.read()
        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()
        # Ensure column type
        try:
            cursor.execute("ALTER TABLE calls MODIFY recordings LONGBLOB")
            connection.commit()
        except Exception:
            pass
        cursor.execute("UPDATE calls SET recordings=%s WHERE id=%s", (data, call_id))
        connection.commit()
        return jsonify({'message': 'Recording uploaded'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@calls_bp.route('/api/calls/upload-template', methods=['GET'])
@token_required
def download_calls_template(current_user_id):
    """Provide an Excel template for uploading call details."""
    wb = Workbook()
    ws = wb.active
    ws.title = 'CallsTemplate'
    ws.append(['customer_number', 'name', 'remarks'])
    # Add an example row (optional)
    ws.append(['9876543210', 'Customer Name', 'Optional initial remark'])
    tmp = io.BytesIO()
    wb.save(tmp)
    tmp.seek(0)
    return send_file(tmp, as_attachment=True, download_name='calls_upload_template.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@calls_bp.route('/api/calls/upload', methods=['POST'])
@token_required
def upload_calls_excel(current_user_id):
    """Admin uploads calls for a specific agent; rows are created with status 'Uploaded'.
    Expected form fields: agent_number, file (Excel .xlsx)
    Columns: customer_number, name, remarks
    """
    try:
        # Ensure admin
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Token format invalid'}), 401
        import jwt
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        role = data.get('role', 'admin')
        if role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403

        if 'agent_number' not in request.form:
            return jsonify({'message': 'agent_number is required'}), 400
        agent_number = request.form['agent_number']
        if 'file' not in request.files:
            return jsonify({'message': 'Excel file is required'}), 400
        f = request.files['file']
        if not f.filename.lower().endswith('.xlsx'):
            return jsonify({'message': 'Please upload an .xlsx Excel file'}), 400

        wb = load_workbook(filename=io.BytesIO(f.read()))
        ws = wb.active

        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor()

        inserted = 0
        # Expect header row: customer_number, name, remarks
        first = True
        for row in ws.iter_rows(values_only=True):
            if first:
                first = False
                continue
            if not row:
                continue
            customer_number = (row[0] or '').strip() if isinstance(row[0], str) else str(row[0] or '').strip()
            name = (row[1] or '').strip() if isinstance(row[1], str) else str(row[1] or '').strip()
            remarks = (row[2] or '').strip() if isinstance(row[2], str) else str(row[2] or '').strip()
            if not customer_number:
                continue
            cursor.execute(
                """
                INSERT INTO calls (agent_number, customer_number, duration, call_status, timestamp, remarks, name, remarks_status)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s)
                """,
                (agent_number, customer_number, 0, 'Uploaded', remarks, name, '')
            )
            inserted += 1
        connection.commit()
        return jsonify({'message': f'Uploaded {inserted} records successfully'}), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()

@calls_bp.route('/api/calls/<int:call_id>/alternative-numbers', methods=['PUT'])
@token_required
def update_alternative_numbers(current_user_id, call_id):
    # ... (move the full update_alternative_numbers logic here from app.py)
    try:
        data = request.get_json()
        alternative_numbers = data.get('alternative_numbers', '')

        connection = get_db_connection()
        if connection is None:
            return jsonify({'message': 'Database connection failed'}), 500
        cursor = connection.cursor(dictionary=True)

        # Update alternative numbers
        cursor.execute("""
            UPDATE calls SET alternative_numbers=%s WHERE id=%s
        """, (alternative_numbers, call_id))
        connection.commit()
        return jsonify({'message': 'Alternative numbers updated successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()