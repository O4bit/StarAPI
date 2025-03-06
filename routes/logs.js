const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/audit-logger');


router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { 
            severity = 'all', 
            hours = 24,
            limit = 100,
            service = null
        } = req.query;
        
        let query = `
            SELECT * FROM system_logs 
            WHERE timestamp > NOW() - INTERVAL '${parseInt(hours)} hours'
        `;
        
        const queryParams = [];
        
        if (severity !== 'all') {
            query += ` AND severity = $1`;
            queryParams.push(severity);
        }
        
        if (service) {
            query += ` AND service = $${queryParams.length + 1}`;
            queryParams.push(service);
        }
        
        query += ` ORDER BY timestamp DESC LIMIT ${parseInt(limit)}`;
        
        const result = await db.query(query, queryParams);
        
        await logAudit(req.user.id, 'logs-access', {
            severity,
            hours,
            limit,
            service,
            count: result.rows.length
        }, req.ip);
        
        res.json({
            count: result.rows.length,
            logs: result.rows
        });
    } catch (error) {
        console.error('Error retrieving logs:', error);
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});


router.get('/audit', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { 
            userId,
            action,
            startDate,
            endDate,
            limit = 100
        } = req.query;
        
        const filters = {};
        
        if (userId) filters.userId = userId;
        if (action) filters.action = action;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);
        
        const logs = await getAuditLogs(filters, parseInt(limit));
        
        await logAudit(req.user.id, 'audit-logs-access', {
            filters,
            limit,
            count: logs.length
        }, req.ip);
        
        res.json({
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('Error retrieving audit logs:', error);
        res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
});

module.exports = router;