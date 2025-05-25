const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function migrate() {
    try {
        logger.info('Starting database migration...');
        
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                key_hash VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS api_usage (
                id SERIAL PRIMARY KEY,
                api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                status_code INTEGER NOT NULL,
                response_time INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        logger.info('Database migration completed successfully');
    } catch (error) {
        logger.error('Database migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = migrate;
