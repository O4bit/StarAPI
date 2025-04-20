const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false
});

async function setupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('Setting up database tables...');
        
        await client.query('BEGIN');
        
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'system_metrics'
            )
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('Dropping existing system_metrics table to recreate with correct schema');
            await client.query('DROP TABLE system_metrics');
        }
        
        await client.query(`
            CREATE TABLE system_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cpu_usage FLOAT,
                memory_usage FLOAT,
                disk_usage FLOAT,
                temperature FLOAT,
                details JSONB
            )
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS bot_tokens (
                id SERIAL PRIMARY KEY,
                bot_id VARCHAR(50) NOT NULL,
                token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            )
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token_id UUID PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE
            )
        `);
        
        await client.query('COMMIT');
        
        console.log('Database setup completed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error setting up database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupDatabase().catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
});