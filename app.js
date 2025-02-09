require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const PastebinAPI = require('pastebin-js');
const si = require('systeminformation');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;

const pastebin = new PastebinAPI({
    'api_dev_key': process.env.PASTEBIN_API_KEY,
    'api_user_name': process.env.PASTEBIN_USER_NAME,
    'api_user_password': process.env.PASTEBIN_USER_PASSWORD
});

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

app.use(helmet());
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
  },
  async (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
    try {
        await pool.query('INSERT INTO tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [accessToken]);
    } catch (error) {
        console.error('Error storing token:', error);
    }
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.use((req, res, next) => {
    req.anonymousId = crypto.randomBytes(16).toString('hex');
    next();
});

app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

let requestCount = 0;
app.use((req, res, next) => {
    requestCount++;
    next();
});

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        const phoneNumbers = req.user._json.phoneNumbers;
        if (phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0].metadata.verified) {
            return next();
        } else {
            return res.status(403).send('Access denied. Verified phone number required.');
        }
    } else {
        res.status(401).send('Access denied. Please authenticate.');
    }
};

const ensureBearerToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const result = await pool.query('SELECT * FROM tokens WHERE token = $1', [token]);
            if (result.rows.length > 0) {
                req.accessToken = token;
                next();
            } else {
                res.status(401).send('Access denied. Invalid bearer token.');
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            res.status(500).send({ message: 'Verification failed', error });
        }
    } else {
        res.status(401).send('Access denied. Bearer token required.');
    }
};

app.post('/execute', ensureBearerToken, async (req, res) => {
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

app.post('/verify', async (req, res) => {
    const { token } = req.body;
    try {
        const result = await pool.query('SELECT * FROM tokens WHERE token = $1', [token]);
        if (result.rows.length > 0) {
            res.status(200).send({ verified: true });
        } else {
            res.status(401).send({ verified: false, message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).send({ message: 'Verification failed', error });
    }
});

app.get('/tokens', ensureBearerToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tokens');
        res.status(200).send({ tokens: result.rows });
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).send({ message: 'Failed to fetch tokens', error });
    }
});

app.delete('/tokens/:id', ensureBearerToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tokens WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            res.status(200).send({ message: 'Token deleted successfully' });
        } else {
            res.status(404).send({ message: 'Token not found' });
        }
    } catch (error) {
        console.error('Error deleting token:', error);
        res.status(500).send({ message: 'Failed to delete token', error });
    }
});

app.patch('/tokens/:id/lock', ensureBearerToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE tokens SET locked = true WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            res.status(200).send({ message: 'Token locked successfully' });
        } else {
            res.status(404).send({ message: 'Token not found' });
        }
    } catch (error) {
        console.error('Error locking token:', error);
        res.status(500).send({ message: 'Failed to lock token', error });
    }
});

app.get('/apihealth', ensureBearerToken, (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        requestCount: requestCount,
        status: 'OK'
    };
    res.status(200).send(healthData);
});

app.get('/health', ensureBearerToken, (req, res) => {
    exec('uptime -p', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to get server uptime', error: stderr });
        }
        res.status(200).send({ uptime: stdout.trim(), status: 'Server is running' });
    });
});

app.get('/systeminfo', ensureBearerToken, async (req, res) => {
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

app.get('/neofetch', ensureBearerToken, (req, res) => {
    exec('neofetch --stdout', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to run neofetch', error: stderr });
        }
        res.status(200).send({ output: stdout });
    });
});

app.get('/websiteStatus', ensureBearerToken, async (req, res) => {
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

app.get('/logs', ensureBearerToken, async (req, res) => {
    const logFiles = ['/var/log/syslog', '/var/log/syslog.1']; // Add more log files if needed
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const severityLevels = ['warning', 'error', 'critical'];

    let logs = '';

    for (const logFile of logFiles) {
        try {
            const data = fs.readFileSync(logFile, 'utf8');
            const filteredLogs = data.split('\n').filter(line => {
                // Adjust date parsing as needed
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
        console.log('No relevant logs found for the past hour');
        return res.status(400).send({ message: 'No relevant logs found for the past hour' });
    }

    console.log('Logs to be sent to Pastebin:', logs);

    try {
        const pastebinResponse = await pastebin.createPaste({
            text: logs,
            title: 'Server Logs',
            format: null,
            privacy: 2, // Unlisted
            expiration: '1H'
        });
        console.log('Pastebin URL:', pastebinResponse);
        res.status(200).send({ url: pastebinResponse });
    } catch (err) {
        console.error('Failed to create Pastebin:', err);
        res.status(500).send({ message: 'Failed to create Pastebin', error: err });
    }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', (req, res) => {
    const accessToken = req.user.accessToken;
    res.send(`Access Token: ${accessToken}`);
});

app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        process.exit(1);
    } else {
        throw err;
    }
});