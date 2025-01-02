require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const helmet = require('helmet');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const PastebinAPI = require('pastebin-js');

const app = express();
const port = 3000;

const pastebin = new PastebinAPI({
    'api_dev_key': process.env.PASTEBIN_API_KEY,
    'api_user_name': process.env.PASTEBIN_USER_NAME,
    'api_user_password': process.env.PASTEBIN_USER_PASSWORD
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
  (accessToken, refreshToken, profile, done) => {
    profile.accessToken = accessToken;
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

const ensureBearerToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        req.accessToken = token;
        next();
    } else {
        res.status(401).send('Access denied. Bearer token required.');
    }
};

const encryptData = (data) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return { iv: iv.toString('hex'), key: key.toString('hex'), encryptedData: encrypted };
};

app.post('/receive', ensureAuthenticated, (req, res) => {
    const data = req.body.data;
    const encrypted = encryptData(data);
    console.log(`Received encrypted data: ${encrypted.encryptedData} from anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ message: 'Data received anonymously and securely', encryptedData: encrypted.encryptedData });
});

app.get('/send', ensureAuthenticated, (req, res) => {
    const data = "This is some anonymous data";
    const encrypted = encryptData(data);
    console.log(`Sending encrypted data: ${encrypted.encryptedData} to anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ encryptedData: encrypted.encryptedData });
});

app.get('/health', ensureBearerToken, (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        requestCount: requestCount,
        status: 'OK'
    };
    res.status(200).send(healthData);
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

app.post('/reboot', ensureBearerToken, (req, res) => {
    exec('sudo reboot', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ message: 'Failed to reboot the server', error: stderr });
        }
        res.status(200).send({ message: 'Server is rebooting...', output: stdout });
    });
});

app.get('/logs', ensureBearerToken, (req, res) => {
    const logFilePath = '/var/log/syslog'; // Adjust the log file path as needed
    const twelveHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send({ message: 'Failed to read logs', error: err });
        }

        const logs = data.split('\n').filter(line => {
            const logDate = new Date(line.substring(0, 15)); // Adjust date parsing as needed
            return logDate >= twelveHoursAgo;
        }).join('\n');

        if (logs.length === 0) {
            return res.status(400).send({ message: 'No logs found for the past 12 hours' });
        }

        console.log('Logs to be sent to Pastebin:', logs);

        pastebin.createPaste({
            text: logs,
            title: 'Server Logs',
            format: null,
            privacy: 2, // Unlisted
            expiration: '1H'
        }).then((data) => {
            res.status(200).send({ url: data });
        }).fail((err) => {
            console.error('Failed to create Pastebin:', err);
            res.status(500).send({ message: 'Failed to create Pastebin', error: err });
        });
    });
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
});