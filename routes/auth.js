const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');
const { authenticateToken, requireRole, encryptToken } = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const tokenId = crypto.randomUUID();
        
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                roles: user.roles,
                jti: tokenId
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        const encryptedToken = encryptToken(token);
        
        await pool.query(
            'INSERT INTO user_tokens (token_id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
            [tokenId, user.id]
        );
        
        res.json({ token: encryptedToken });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE user_tokens SET revoked = TRUE WHERE token_id = $1',
            [req.user.jti]
        );
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

router.get('/me', authenticateToken, (req, res) => {
    const { id, username, roles } = req.user;
    res.json({ id, username, roles });
});

router.post('/users', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, roles } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, roles) VALUES ($1, $2, $3) RETURNING id',
            [username, passwordHash, roles || ['user']]
        );
        
        res.status(201).json({ 
            id: result.rows[0].id,
            username,
            roles: roles || ['user']
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

module.exports = router;