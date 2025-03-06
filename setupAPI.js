require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');
const { generateEncryptionKey } = require('../utils/encryption');

async function setup() {
    const checkOnly = process.argv.includes('--check');
    console.log(checkOnly ? 'Checking StarAPI setup...' : 'Running StarAPI setup...');
    
    try {
        if (!fs.existsSync('.env')) {
            if (checkOnly) {
                console.error('.env file not found. Please run setup first.');
                process.exit(1);
            }
            await createEnvFile();
        }
        
        const pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 5432,
        });
        
        try {
            await pool.query('SELECT NOW()');
            console.log('✅ Database connection successful');
        } catch (err) {
            console.error('❌ Database connection failed:', err);
            process.exit(1);
        }
        
        await createDatabaseSchema(pool, checkOnly);
        
        if (!checkOnly) {
            await createAdminUser(pool);
            await setupBotToken(pool);
        }
        
        console.log(checkOnly ? '✅ Setup check completed' : '✅ Setup completed successfully!');
        
        if (checkOnly) process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

async function createEnvFile() {
    console.log('Creating .env file with defaults...');
    
    const envContent = `# StarAPI Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=starapi
DB_USER=postgres
DB_PASSWORD=postgres_password
DB_SSL=false

# Security
JWT_SECRET=${crypto.randomBytes(32).toString('hex')}
ENCRYPTION_KEY=${generateEncryptionKey()}

# APIs
FRONTEND_URL=http://localhost:3000

# Discord Bot
DISCORD_TOKEN=your_discord_token
CLIENT_ID=your_client_id
DISCORD_ADMIN_IDS=admin_id_1,admin_id_2
BOT_SECRET=${crypto.randomBytes(16).toString('hex')}

# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
METRICS_DATABASE_ID=your_database_id
LOGS_COLLECTION_ID=your_collection_id
METRICS_COLLECTION_ID=your_metrics_collection_id
`;

    fs.writeFileSync('.env', envContent);
    console.log('.env file created with secure defaults');
    console.log('Please update the values with your actual configuration');
    
    require('dotenv').config();
}

async function createDatabaseSchema(pool) {
    console.log('Setting up database schema...');
    
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
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
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
            cpu JSONB,
            memory JSONB,
            disk JSONB,
            temperature JSONB,
            load JSONB,
            network JSONB
        )
    `);
    
    console.log('Database schema created successfully');
}

async function createAdminUser(pool) {
    console.log('Checking for admin user...');
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
        console.log('Creating default admin user...');
        
        const password = crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query(
            'INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3)',
            ['admin', hashedPassword, ['admin', 'user']]
        );
        
        console.log('\n================================================');
        console.log('Created admin user with the following credentials:');
        console.log('Username: admin');
        console.log(`Password: ${password}`);
        console.log('================================================\n');
        console.log('IMPORTANT: Save these credentials securely!');
    } else {
        console.log('Admin user already exists, skipping creation');
    }
}

async function setupBotToken(pool) {
    console.log('Setting up bot token...');
    
    const botId = 'discord_bot';
    const botSecret = process.env.BOT_SECRET;
    
    if (!botSecret) {
        console.log('BOT_SECRET not found in .env file');
        return;
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const encryptedToken = await require('../utils/encryption')
        .encrypt(token, process.env.ENCRYPTION_KEY);
    
    await pool.query(
        'INSERT INTO bot_tokens (bot_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\') ' +
        'ON CONFLICT (bot_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL \'30 days\'',
        [botId, encryptedToken]
    );
    
    console.log('Bot token setup complete');
}

setup();