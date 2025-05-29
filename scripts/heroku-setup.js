require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
    console.log('Setting up database schema for Heroku...');
    
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                roles TEXT[] NOT NULL DEFAULT '{"user"}',
                mfa_enabled BOOLEAN DEFAULT FALSE,
                mfa_secret VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        // Create user_tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_tokens (
                token_id UUID PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                revoked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        `);

        // Create bot_tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_tokens (
                bot_id VARCHAR(50) PRIMARY KEY,
                token TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        `);

        // Create system_logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                severity VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                service VARCHAR(50),
                details JSONB
            )
        `);

        // Create audit_logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                action VARCHAR(100) NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ip_address VARCHAR(50),
                details JSONB
            )
        `);

        // Create system_metrics table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_metrics (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                cpu_usage FLOAT,
                memory_usage FLOAT,
                disk_usage FLOAT,
                temperature FLOAT,
                details JSONB
            )
        `);

        // Create refresh_tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token_id UUID PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE
            )
        `);

        console.log('✅ Database schema created successfully');
        
        // Create admin user if it doesn't exist
        await createAdminUser();
        
        console.log('✅ Heroku database setup completed');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

async function createAdminUser() {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
        console.log('Creating admin user...');
        
        const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query(
            'INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3)',
            ['admin', hashedPassword, ['admin', 'user']]
        );
        
        console.log('\n================================================');
        console.log('Created admin user:');
        console.log('Username: admin');
        console.log(`Password: ${password}`);
        console.log('================================================\n');
        console.log('IMPORTANT: Save these credentials securely!');
    } else {
        console.log('Admin user already exists');
    }
}

if (require.main === module) {
    setupDatabase().catch(err => {
        console.error('Setup failed:', err);
        process.exit(1);
    });
}

module.exports = { setupDatabase };
