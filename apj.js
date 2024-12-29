require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const helmet = require('helmet');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();
const port = 3000;

// Use Helmet to help secure Express apps with various HTTP headers
app.use(helmet());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET, // Use environment variable
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport to use Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, // Use environment variable
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Use environment variable
    callbackURL: process.env.CALLBACK_URL, // Use environment variable
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
  },
  (accessToken, refreshToken, profile, done) => {
    // Store the access token in the session
    profile.accessToken = accessToken;
    return done(null, profile);
  }
));

// Serialize user into the sessions
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the sessions
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Middleware to anonymize requests
app.use((req, res, next) => {
    req.anonymousId = crypto.randomBytes(16).toString('hex');
    next();
});

// Middleware to track request count
let requestCount = 0;
app.use((req, res, next) => {
    requestCount++;
    next();
});

// Middleware to check authentication and verified phone number
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

// Middleware to check Bearer token
const ensureBearerToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // Here you can verify the token if needed
        req.accessToken = token;
        next();
    } else {
        res.status(401).send('Access denied. Bearer token required.');
    }
};

// Function to encrypt data
const encryptData = (data) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return { iv: iv.toString('hex'), key: key.toString('hex'), encryptedData: encrypted };
};

// Endpoint to receive data
app.post('/receive', ensureAuthenticated, (req, res) => {
    const data = req.body.data;
    const encrypted = encryptData(data);
    console.log(`Received encrypted data: ${encrypted.encryptedData} from anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ message: 'Data received anonymously and securely', encryptedData: encrypted.encryptedData });
});

// Endpoint to send data
app.get('/send', ensureAuthenticated, (req, res) => {
    const data = "This is some anonymous data";
    const encrypted = encryptData(data);
    console.log(`Sending encrypted data: ${encrypted.encryptedData} to anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ encryptedData: encrypted.encryptedData });
});

// Endpoint to get API health and statistics
app.get('/health', ensureBearerToken, (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        requestCount: requestCount,
        status: 'OK'
    };
    res.status(200).send(healthData);
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to a specific route
    res.redirect('/dashboard'); // Change '/dashboard' to the route you want to redirect to after successful authentication
  }
);

app.get('/dashboard', (req, res) => {
    // Access the access token from the session
    const accessToken = req.user.accessToken;
    res.send(`Access Token: ${accessToken}`);
});

// Start server
app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
});