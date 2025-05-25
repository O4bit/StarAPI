require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        port: PORT
    });
});

// Basic API endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'StarAPI is running!',
        version: '1.0.0',
        api_url: process.env.API_URL,
        environment: process.env.NODE_ENV
    });
});

// API routes placeholder
app.get('/api', (req, res) => {
    res.json({
        message: 'StarAPI endpoints',
        endpoints: [
            'GET /health',
            'GET /api',
            'GET /'
        ]
    });
});

// Error handling
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    logger.info(`StarAPI server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`API URL: ${process.env.API_URL}`);
});

module.exports = app;
