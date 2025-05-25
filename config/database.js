const { Pool } = require('pg');
const logger = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
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