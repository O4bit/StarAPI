const { Pool } = require('pg');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';
const isHeroku = !!process.env.DYNO;

// Use DATABASE_URL for Heroku, fallback to individual DB vars for local
const getDatabaseConfig = () => {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: isProduction ? { rejectUnauthorized: false } : false
        };
    }
    
    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'starapi',
        user: process.env.DB_USER || 'starapi',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true'
    };
};

// For now, export a simple connection helper
// You can integrate this with your existing database setup
const dbConfig = getDatabaseConfig();

logger.info('Database configuration loaded', { 
    isProduction, 
    isHeroku, 
    hasConnectionString: !!dbConfig.connectionString 
});

const config = {
    ...dbConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

pool.on('connect', () => {
    logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};