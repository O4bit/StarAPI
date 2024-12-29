const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const helmet = require('helmet');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const port = 3000;

// Use Helmet to help secure Express apps with various HTTP headers
app.use(helmet());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Initialize Passport
app.use(passport.initialize());

// Configure Passport to use Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: '926625572851-81vrf7sounglslt83dl1aqocae271e79.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://well-next-ocelot.ngrok-free.app/auth/google/callback' // Update with your ngrok URL
  },
  (accessToken, refreshToken, profile, done) => {
    // Here you can save the profile information to your database if needed
    return done(null, profile);
  }
));

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
app.post('/receive', (req, res) => {
    const data = req.body.data;
    const encrypted = encryptData(data);
    console.log(`Received encrypted data: ${encrypted.encryptedData} from anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ message: 'Data received anonymously and securely', encryptedData: encrypted.encryptedData });
});

// Endpoint to send data
app.get('/send', (req, res) => {
    const data = "This is some anonymous data";
    const encrypted = encryptData(data);
    console.log(`Sending encrypted data: ${encrypted.encryptedData} to anonymous ID: ${req.anonymousId}`);
    res.status(200).send({ encryptedData: encrypted.encryptedData });
});

// Endpoint to get API health and statistics
app.get('/health', (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        requestCount: requestCount,
        status: 'OK'
    };
    res.status(200).send(healthData);
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// Start server
app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
});