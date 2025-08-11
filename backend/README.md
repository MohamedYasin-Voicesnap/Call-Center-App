# Backend Setup (Flask API)

## Prerequisites
- Python 3.7+
- MySQL Server

## 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

## 2. Database Setup
- Start MySQL and create the database:

```sql
CREATE DATABASE call_center_db;
```
- (Or use the provided `database-setup.sql` script)

## 3. Configure Environment Variables
- Copy `.env.example` to `.env` and fill in your MySQL credentials and secret key.

## 4. Run the Backend Server

```bash
python app.py
```
- The server will run at http://localhost:5000

## API Endpoints
- `POST /api/login` - User login
- `GET /api/calls` - Get call details (auth required)
- `GET /api/agents` - Get agent details (auth required)
- `GET /api/health` - Health check

## Default Credentials
- User ID: `admin`
- Password: `password` 