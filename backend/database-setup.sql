-- Create database
CREATE DATABASE IF NOT EXISTS call_center_db;
USE call_center_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(64) NOT NULL,  -- Changed from password_hash to password
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    status ENUM('Active', 'Inactive', 'Removed') DEFAULT 'Active',
    is_admin TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(64) NOT NULL -- Additional field not present in your original script
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_number VARCHAR(20) NOT NULL,
    customer_number VARCHAR(20) NOT NULL,
    duration INT,
    call_status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    name TEXT,
    remarks_status TEXT,
    meeting_datetime DATETIME NULL,
    meeting_description TEXT,
    FOREIGN KEY (agent_number) REFERENCES agents(agent_number)
);
