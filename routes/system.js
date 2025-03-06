const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/audit-logger');
const { getRecentMetrics } = require('../config/appwrite');

router.get('/health', authenticateToken, async (req, res) => {
    try {
        const uptime = process.uptime();
        const loadAvg = require('os').loadavg();
        
        res.json({
            status: 'online',
            uptime: uptime,
            loadAverage: loadAvg,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Failed to retrieve system health' });
    }
});

router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const metrics = await Promise.all([
            si.cpu(),
            si.mem(),
            si.currentLoad(),
            si.fsSize(),
            si.networkStats(),
            si.cpuTemperature()
        ]);
        
        res.json({
            cpu: metrics[0],
            memory: metrics[1],
            load: metrics[2],
            disk: metrics[3],
            network: metrics[4],
            temperature: metrics[5],
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Metrics retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve system metrics' });
    }
});

router.get('/metrics/history', authenticateToken, async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        
        let hours;
        switch (timeframe) {
            case '1h': hours = 1; break;
            case '6h': hours = 6; break;
            case '24h': hours = 24; break;
            case '7d': hours = 168; break;
            default: hours = 24;
        }
        
        const metrics = await getRecentMetrics(hours);
        res.json(metrics);
    } catch (error) {
        console.error('Historical metrics error:', error);
        res.status(500).json({ error: 'Failed to retrieve historical metrics' });
    }
});

router.post('/commands', authenticateToken, requireRole('admin'), async (req, res) => {
    const { command } = req.body;
    
    const allowedCommands = {
        'disk-usage': 'df -h',
        'memory-info': 'free -m',
        'process-list': 'ps aux | head -20',
        'network-connections': 'netstat -tuln'
    };
    
    if (!command || !allowedCommands[command]) {
        return res.status(400).json({ error: 'Invalid or unsupported command' });
    }
    
    try {
        await logAudit(req.user.id, 'system-command', { command });
        
        const { exec } = require('child_process');
        
        exec(allowedCommands[command], { timeout: 5000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command execution error: ${error}`);
                return res.status(500).json({ error: 'Command execution failed' });
            }
            
            res.json({ output: stdout });
        });
    } catch (error) {
        console.error('Command execution error:', error);
        res.status(500).json({ error: 'Failed to execute command' });
    }
});

module.exports = router;