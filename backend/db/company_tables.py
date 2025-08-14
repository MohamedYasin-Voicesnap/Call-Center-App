from mysql.connector import Error


def get_company_table_name(base_name: str, company_id: int) -> str:
    """Return a safe per-company table name like 'agents_5' or 'calls_12'.

    base_name must be an identifier consisting of letters/underscores only.
    company_id must be a positive integer.
    """
    if not isinstance(base_name, str) or not base_name.isidentifier():
        raise ValueError("Invalid base table name")
    if not isinstance(company_id, int) or company_id <= 0:
        raise ValueError("Invalid company_id")
    return f"{base_name}_{company_id}"


def create_company_tables(connection, company_id: int) -> None:
    """Create per-company agents and calls tables if they don't exist.

    The schema mirrors the shared 'agents' and 'calls' tables, without cross-table FKs.
    """
    agents_table = get_company_table_name("agents", company_id)
    calls_table = get_company_table_name("calls", company_id)
    breaks_table = get_company_table_name("agent_breaks", company_id)
    cursor = connection.cursor()
    try:
        # Agents table per company
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS `{agents_table}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                password VARCHAR(64) NOT NULL,
                status ENUM('Active', 'Inactive', 'Removed') DEFAULT 'Active',
                is_admin TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `uniq_agent_number` (`agent_number`),
                UNIQUE KEY `uniq_email` (`email`)
            )
            """
        )

        # Calls table per company
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS `{calls_table}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) NOT NULL,
                customer_number VARCHAR(20) NOT NULL,
                duration INT,
                call_status VARCHAR(50),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT,
                name TEXT,
                remarks_status TEXT,
                recordings LONGBLOB,
                alternative_numbers TEXT,
                meeting_datetime DATETIME NULL,
                meeting_description TEXT,
                INDEX `idx_agent_number` (`agent_number`),
                INDEX `idx_timestamp` (`timestamp`)
            )
            """
        )
        # Agent breaks per company
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS `{breaks_table}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_number VARCHAR(20) NOT NULL,
                status ENUM('Working', 'Break') NOT NULL,
                break_start DATETIME,
                break_end DATETIME,
                duration_seconds INT,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_agent_number` (`agent_number`),
                INDEX `idx_break_start` (`break_start`)
            )
            """
        )
        connection.commit()
    except Error:
        connection.rollback()
        raise
    finally:
        cursor.close()


def ensure_agents_mapping_index(connection) -> None:
    """Ensure shared 'agents' table has (company_id, agent_number) composite unique key
    and no leftover unique key on 'agent_number'. Also adds company_id column if missing.
    """
    cursor = connection.cursor()
    try:
        # Ensure company_id column exists
        cursor.execute(
            """
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'company_id'
            """
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE agents ADD COLUMN company_id INT NULL AFTER email")

        # Drop single-column unique on agent_number if present
        cursor.execute(
            """
            SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
            GROUP BY INDEX_NAME, NON_UNIQUE
            """
        )
        indexes = cursor.fetchall()
        for idx in indexes:
            idx_name = idx[0]
            non_unique = idx[1]
            cols_concat = (idx[2] or '').lower()
            if non_unique == 0 and cols_concat == 'agent_number':
                cursor.execute(f"ALTER TABLE agents DROP INDEX `{idx_name}`")
                break

        # Create composite unique if not exists
        cursor.execute(
            """
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
              AND INDEX_NAME = 'uniq_agents_company_agent'
            """
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "ALTER TABLE agents ADD UNIQUE KEY `uniq_agents_company_agent` (`company_id`,`agent_number`)"
            )
        connection.commit()
    except Error:
        connection.rollback()
        raise
    finally:
        cursor.close()


