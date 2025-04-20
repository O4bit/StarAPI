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


router.get('/info', authenticateToken, async (req, res) => {
    try {
        const si = require('systeminformation');
        const os = require('os');
        
        const [osInfo, cpuInfo, memInfo, systemInfo] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.mem(),
            si.system()
        ]);
        
        let ipAddress = 'N/A';
        try {
            const networkStats = await si.networkStats();
            if (networkStats && networkStats.length > 0) {
                const primaryInterface = networkStats.find(net => 
                    net.operstate === 'up' && 
                    net.iface && 
                    !net.iface.includes('lo')
                );
                
                if (primaryInterface && primaryInterface.ip4) {
                    ipAddress = primaryInterface.ip4;
                } else {
                    const interfaces = os.networkInterfaces();
                    for (const name of Object.keys(interfaces)) {
                        for (const iface of interfaces[name]) {
                            if (!iface.internal && iface.family === 'IPv4') {
                                ipAddress = iface.address;
                                break;
                            }
                        }
                        if (ipAddress !== 'N/A') break;
                    }
                }
            }
        } catch (netError) {
            console.error('Error getting network info:', netError);
        }
        
        res.json({
            hostname: systemInfo.hostname || os.hostname(),
            ipAddress: ipAddress,
            os: {
                platform: osInfo.platform || os.platform(),
                distro: osInfo.distro || 'N/A',
                release: osInfo.release || os.release(),
                kernel: osInfo.kernel || 'N/A',
                arch: osInfo.arch || os.arch()
            },
            cpu: {
                manufacturer: cpuInfo.manufacturer || 'N/A',
                brand: cpuInfo.brand || 'N/A',
                speed: cpuInfo.speed || 'N/A',
                cores: cpuInfo.cores || os.cpus().length,
                physicalCores: cpuInfo.physicalCores || 'N/A'
            },
            memory: {
                total: memInfo.total || os.totalmem(),
                free: memInfo.free || os.freemem(),
                used: memInfo.used || (os.totalmem() - os.freemem())
            },
            uptime: os.uptime()
        });
    } catch (error) {
        console.error('Error fetching system info:', error);
        res.status(500).json({ error: 'Failed to fetch system information' });
    }
});

router.get('/network', authenticateToken, async (req, res) => {
    try {
        const si = require('systeminformation');
        
        let interfaces = [];
        let stats = [];
        
        try {
            [interfaces, stats] = await Promise.all([
                si.networkInterfaces(),
                si.networkStats()
            ]);
        } catch (netError) {
            console.error('Error getting detailed network info:', netError);
            const osInterfaces = require('os').networkInterfaces();
            interfaces = Object.entries(osInterfaces).map(([name, addrs]) => {
                const ipv4 = addrs.find(addr => addr.family === 'IPv4');
                return {
                    iface: name,
                    ip4: ipv4 ? ipv4.address : 'N/A',
                    mac: ipv4 ? ipv4.mac : 'N/A',
                    type: ipv4 && ipv4.internal ? 'internal' : 'external'
                };
            });
        }
        
        const networkData = interfaces.map(iface => {
            const stat = stats && stats.length ? stats.find(s => s.iface === iface.iface) : null;
            return {
                ...iface,
                ...(stat || {
                    rx_bytes: 0,
                    tx_bytes: 0,
                    rx_sec: 0,
                    tx_sec: 0,
                    ms: 0
                })
            };
        });
        
        res.json({
            interfaces: networkData
        });
    } catch (error) {
        console.error('Error fetching network info:', error);
        res.status(500).json({ error: 'Failed to fetch network information' });
    }
});