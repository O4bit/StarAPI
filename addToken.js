require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});


async function addToken() {
    try {
        await pool.query('INSERT INTO tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [token]);
        console.log('Token added successfully');
    } catch (error) {
        console.error('Error adding token:', error);
    } finally {
        pool.end();
    }
}

addToken();