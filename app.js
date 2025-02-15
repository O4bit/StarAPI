require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const PastebinAPI = require('pastebin-js');
const si = require('systeminformation');
const path = require('path');
const crypto = require('crypto');
const mariadb = require('mariadb');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;

const pastebin = new PastebinAPI({
    'api_dev_key': process.env.PASTEBIN_API_KEY,
    'api_user_name': process.env.PASTEBIN_USER_NAME,
    'api_user_password': process.env.PASTEBIN_USER_PASSWORD
});

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('combined'));

app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
// incase some guy from india tries brute force the passwd
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);
// i don't think this is neccessary at all but i'll keep it here just in case
let ipWhitelist = ['127.0.0.1'];
const ensureIPWhitelist = (req, res, next) => {
    const clientIp = req.ip;
    if (ipWhitelist.includes(clientIp)) {
        next();
    } else {
        res.status(403).send('Access denied. IP not whitelisted.');
    }
};

const ensureJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).send('Access denied. Invalid token.');
            }
            req.user = decoded;
            next();
        });
    } else {
        res.status(401).send('Access denied. Token required.');
    }
};

const ensureBotToken = async (req, res, next) => {
    const botToken = req.headers['x-bot-token'];
    if (botToken) {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM bot_tokens WHERE token = ?', [botToken]);
        conn.release();
        if (rows.length > 0) {
            return next();
        }
    }
    ensureJWT(req, res, next);
};

const ensureRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).send('Access denied. Insufficient permissions.');
        }
    };
};

const logAudit = async (message) => {
    const conn = await pool.getConnection();
    await conn.query('INSERT INTO audit_logs (message) VALUES (?)', [message]);
    conn.release();
};

app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const secret = speakeasy.generateSecret({ length: 20 });

    try {
        const conn = await pool.getConnection();
        await conn.query('INSERT INTO users (username, password, secret, role) VALUES (?, ?, ?, ?)', [username, hashedPassword, secret.base32, role]);
        conn.release();
        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(500).send({ message: 'Registration failed', error });
    }
});
//TODO: Itergrate this with a dash board (i am too lazy to do it)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
        conn.release();
        if (rows.length > 0) {
            const user = rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                const token = jwt.sign({ username: user.username, role: user.role, secret: user.secret }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.status(200).send({ token, secret: user.secret });
            } else {
                res.status(401).send('Invalid credentials');
            }
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).send({ message: 'Login failed', error });
    }
});

app.post('/verify-2fa', ensureJWT, (req, res) => {
    const { token } = req.body;
    const verified = speakeasy.totp.verify({
        secret: req.user.secret,
        encoding: 'base32',
        token
    });
    if (verified) {
        res.status(200).send('2FA verified');
    } else {
        res.status(401).send('Invalid 2FA token');
    }
});
//This has been the cause of weeks of pain trying to secure this one fucking endpoint
app.post('/execute', ensureBotToken, ensureRole('admin'), async (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).send({ message: 'Command is required' });
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to execute command', error: stderr });
        }
        res.status(200).send({ output: stdout });
    });
});
// if this some how, in some way gets breached i am going to quit programming js
app.post('/verify', ensureBotToken, async (req, res) => {
    const { token } = req.body;
    const botToken = req.headers['x-bot-token'];

    if (botToken) {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM bot_tokens WHERE token = ?', [botToken]);
        conn.release();
        if (rows.length > 0) {
            return res.status(200).send('Bot token verified');
        }
    }

    const verified = speakeasy.totp.verify({
        secret: req.user.secret,
        encoding: 'base32',
        token
    });

    if (verified) {
        res.status(200).send('2FA verified');
    } else {
        res.status(401).send('Invalid 2FA token');
    }
});
//TODO: Fix this fucking mess of a code
app.get('/tokens', ensureJWT, ensureRole('admin'), async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM tokens');
        conn.release();
        res.status(200).send({ tokens: rows });
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch tokens', error });
    }
});

app.delete('/tokens/:id', ensureJWT, ensureRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('DELETE FROM tokens WHERE id = ?', [id]);
        conn.release();
        if (result.affectedRows > 0) {
            res.status(200).send({ message: 'Token deleted successfully' });
        } else {
            res.status(404).send({ message: 'Token not found' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Failed to delete token', error });
    }
});

app.patch('/tokens/:id/lock', ensureJWT, ensureRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('UPDATE tokens SET locked = true WHERE id = ?', [id]);
        conn.release();
        if (result.affectedRows > 0) {
            res.status(200).send({ message: 'Token locked successfully' });
        } else {
            res.status(404).send({ message: 'Token not found' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Failed to lock token', error });
    }
});

app.get('/apihealth', ensureBotToken, (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        requestCount: requestCount,
        status: 'OK'
    };
    res.status(200).send(healthData);
});

app.get('/health', ensureBotToken, (req, res) => {
    exec('uptime -p', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to get server uptime', error: stderr });
        }
        res.status(200).send({ uptime: stdout.trim(), status: 'Server is running' });
    });
});

app.get('/systeminfo', ensureBotToken, async (req, res) => {
    try {
        const systemInfo = await si.get({
            cpu: 'manufacturer, brand, speed, cores',
            mem: 'total, free',
            osInfo: 'platform, distro, release, kernel',
            currentLoad: 'currentLoad',
            networkInterfaces: 'ip4'
        });
        res.status(200).send(systemInfo);
    } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve system information', error });
    }
});

app.get('/neofetch', ensureBotToken, (req, res) => {
    exec('neofetch --stdout', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to run neofetch', error: stderr });
        }
        res.status(200).send({ output: stdout });
    });
});

app.get('/websiteStatus', ensureBotToken, async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send({ message: 'URL query parameter is required' });
    }

    try {
        const response = await axios.get(url);
        res.status(200).send({ status: 'up', statusCode: response.status });
    } catch (error) {
        res.status(200).send({ status: 'down', statusCode: error.response ? error.response.status : 'unknown' });
    }
});

app.get('/logs', ensureJWT, ensureRole('admin'), async (req, res) => {
    const logFiles = ['/var/log/syslog', '/var/log/syslog.1'];
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const severityLevels = ['warning', 'error', 'critical'];

    let logs = '';

    for (const logFile of logFiles) {
        try {
            const data = fs.readFileSync(logFile, 'utf8');
            const filteredLogs = data.split('\n').filter(line => {
                const logDateMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
                if (!logDateMatch) return false;

                const logDate = new Date(logDateMatch[0]);
                const severity = severityLevels.some(level => line.toLowerCase().includes(level));
                return logDate >= oneHourAgo && severity;
            }).join('\n');

            logs += filteredLogs;
        } catch (err) {
            console.error(`Failed to read log file ${logFile}:`, err);
        }
    }

    if (logs.length === 0) {
        return res.status(400).send({ message: 'No relevant logs found for the past hour' });
    }

    try {
        const pastebinResponse = await pastebin.createPaste({
            text: logs,
            title: 'Server Logs',
            format: null,
            privacy: 2,
            expiration: '1H'
        });
        res.status(200).send({ url: pastebinResponse });
    } catch (err) {
        res.status(500).send({ message: 'Failed to create Pastebin', error: err });
    }
});

app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        process.exit(1);
    } else {
        throw err;
    }
});

if (process.argv.includes('/2fa')) {
    const secret = speakeasy.generateSecret({ length: 20 });
    const otpauthUrl = speakeasy.otpauthURL({ secret: secret.ascii, label: 'P.U.L.S.E.D-API', issuer: 'P.U.L.S.E.D' });

    qrcode.toString(otpauthUrl, { type: 'terminal' }, (err, url) => {
        if (err) {
            console.error('Failed to generate QR code:', err);
        } else {
            console.log('Scan this QR code with your authenticator app:');
            console.log(url);
            console.log(`Secret: ${secret.base32}`);
        }
    });
}

if (process.argv.includes('/botoken')) {
    const botToken = crypto.randomBytes(32).toString('hex');
    console.log(`Generated Bot Token: ${botToken}`);
    pool.query('INSERT INTO bot_tokens (token) VALUES (?)', [botToken])
        .then(() => console.log('Bot token saved to database'))
        .catch(err => console.error('Failed to save bot token to database:', err));
}

if (process.argv.includes('/whitelist')) {
    const ip = process.argv[process.argv.indexOf('/whitelist') + 1];
    if (ip) {
        ipWhitelist.push(ip);
        console.log(`IP ${ip} added to whitelist`);
    } else {
        console.error('No IP address provided');
    }
}