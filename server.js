require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.API_RATE_LIMIT || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ 
            status: 'OK', 
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({ 
            status: 'Error', 
            database: 'Disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.get('/api', (req, res) => {
    res.json({
        message: 'StarAPI is running!',
        version: '1.0.0',
        documentation: '/api/docs'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

app.listen(PORT, () => {
    logger.info(`StarAPI server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
