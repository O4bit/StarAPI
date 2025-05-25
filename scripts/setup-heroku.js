const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function setupHeroku() {
    console.log('Setting up StarAPI for Heroku deployment...');
    
    try {
        // Use DATABASE_URL for Heroku Postgres
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false
            } : false
        });
        
        console.log('Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        
        await createDatabaseSchema(pool);
        await createAdminUser(pool);
        
        console.log('✅ Heroku setup completed successfully!');
        await pool.end();
    } catch (error) {
        console.error('Heroku setup failed:', error);
        process.exit(1);
    }
}

async function createDatabaseSchema(pool) {
    console.log('Setting up database schema...');
    
    // Check if tables exist to avoid errors on re-deployment
    const tableExists = await pool.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        )
    `);
    
    if (tableExists.rows[0].exists) {
        console.log('Database tables already exist, skipping schema creation');
        return;
    }
    
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
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_tokens (
            token_id UUID PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            revoked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bot_tokens (
            bot_id VARCHAR(50) PRIMARY KEY,
            token TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `);
    
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
    
    console.log('Database schema created successfully');
}

async function createAdminUser(pool) {
    console.log('Checking for admin user...');
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
        console.log('Creating default admin user...');
        
        const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query(
            'INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3)',
            ['admin', hashedPassword, ['admin', 'user']]
        );
        
        console.log('\n================================================');
        console.log('Created admin user with credentials:');
        console.log('Username: admin');
        console.log(`Password: ${password}`);
        console.log('================================================\n');
        console.log('IMPORTANT: Save these credentials securely!');
        console.log('Set ADMIN_PASSWORD env var to use a custom password');
    } else {
        console.log('Admin user already exists, skipping creation');
    }
}

if (require.main === module) {
    setupHeroku();
}

module.exports = { setupHeroku };
