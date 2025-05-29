const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/audit-logger');
const { getRecentMetrics } = require('../config/appwrite');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

router.post('/commands', authenticateToken, async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }
        
        // Check if user has admin role for security
        if (!req.user.roles || !req.user.roles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required for command execution' });
        }
        
        console.log(`Executing command: ${command}`);
        
        let result;
        
        // Handle predefined safe commands
        switch (command) {
            case 'system-reboot':
                await logAudit(req.user.id || req.user.bot_id, 'system-reboot', {
                    timestamp: new Date(),
                    source: 'api'
                });
                result = await execAsync('sudo reboot');
                break;
                
            case 'disk-usage':
                result = await execAsync('df -h');
                break;
                
            case 'memory-info':
                result = await execAsync('free -h');
                break;
                
            case 'process-list':
                result = await execAsync('ps aux | head -20');
                break;
                
            case 'network-connections':
                result = await execAsync('netstat -tulpn | head -20');
                break;
                
            case 'uptime':
                result = await execAsync('uptime');
                break;
                
            case 'cpu-info':
                result = await execAsync('lscpu');
                break;
                
            default:
                // Execute raw command (security risk - only for admin users)
                console.log(`Executing raw command: ${command}`);
                
                // Basic security checks - prevent dangerous commands
                const dangerousCommands = [
                    'rm -rf',
                    'dd if=',
                    'mkfs',
                    'format',
                    'fdisk',
                    'deluser',
                    'userdel',
                    'shutdown',
                    'halt',
                    'poweroff',
                    '>/dev/',
                    'chmod 777',
                    'chown root'
                ];
                
                const isDangerous = dangerousCommands.some(dangerous => 
                    command.toLowerCase().includes(dangerous.toLowerCase())
                );
                
                if (isDangerous) {
                    return res.status(400).json({ 
                        error: 'Command contains potentially dangerous operations and is blocked',
                        blocked_command: command
                    });
                }
                
                // Log the raw command execution
                await logAudit(req.user.id || req.user.bot_id, 'raw-command', {
                    command,
                    timestamp: new Date(),
                    source: 'api'
                });
                
                // Execute the raw command with timeout
                result = await execAsync(command, { 
                    timeout: 30000, // 30 second timeout
                    maxBuffer: 1024 * 1024 // 1MB max output
                });
                break;
        }
        
        res.json({
            success: true,
            command,
            output: result.stdout,
            error: result.stderr || null,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Command execution error:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            command: req.body.command,
            timestamp: new Date()
        });
        
        // Log the error
        await logAudit(req.user.id || req.user.bot_id, 'command-error', {
            command: req.body.command,
            error: error.message,
            timestamp: new Date()
        });
    }
});

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

module.exports = router;