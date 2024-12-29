"use strict";

require('dotenv').config();

var express = require('express');

var bodyParser = require('body-parser');

var crypto = require('crypto');

var helmet = require('helmet');

var passport = require('passport');

var GoogleStrategy = require('passport-google-oauth20').Strategy;

var session = require('express-session');

var app = express();
var port = 3000; // Use Helmet to help secure Express apps with various HTTP headers

app.use(helmet()); // Middleware to parse JSON bodies

app.use(bodyParser.json()); // Configure session middleware

app.use(session({
  secret: process.env.SESSION_SECRET,
  // Use environment variable
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  } // Set to true if using HTTPS

})); // Initialize Passport and restore authentication state, if any, from the session

app.use(passport.initialize());
app.use(passport.session()); // Configure Passport to use Google OAuth 2.0

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  // Use environment variable
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  // Use environment variable
  callbackURL: process.env.CALLBACK_URL,
  // Use environment variable
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}, function (accessToken, refreshToken, profile, done) {
  // Store the access token in the session
  profile.accessToken = accessToken;
  return done(null, profile);
})); // Serialize user into the sessions

passport.serializeUser(function (user, done) {
  done(null, user);
}); // Deserialize user from the sessions

passport.deserializeUser(function (obj, done) {
  done(null, obj);
}); // Middleware to anonymize requests

app.use(function (req, res, next) {
  req.anonymousId = crypto.randomBytes(16).toString('hex');
  next();
}); // Middleware to track request count

var requestCount = 0;
app.use(function (req, res, next) {
  requestCount++;
  next();
}); // Middleware to check authentication and verified phone number

var ensureAuthenticated = function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    var phoneNumbers = req.user._json.phoneNumbers;

    if (phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0].metadata.verified) {
      return next();
    } else {
      return res.status(403).send('Access denied. Verified phone number required.');
    }
  } else {
    res.status(401).send('Access denied. Please authenticate.');
  }
}; // Middleware to check Bearer token


var ensureBearerToken = function ensureBearerToken(req, res, next) {
  var authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    var token = authHeader.split(' ')[1]; // Here you can verify the token if needed

    req.accessToken = token;
    next();
  } else {
    res.status(401).send('Access denied. Bearer token required.');
  }
}; // Function to encrypt data


var encryptData = function encryptData(data) {
  var algorithm = 'aes-256-cbc';
  var key = crypto.randomBytes(32);
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv(algorithm, key, iv);
  var encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher["final"]('hex');
  return {
    iv: iv.toString('hex'),
    key: key.toString('hex'),
    encryptedData: encrypted
  };
}; // Endpoint to receive data


app.post('/receive', ensureAuthenticated, function (req, res) {
  var data = req.body.data;
  var encrypted = encryptData(data);
  console.log("Received encrypted data: ".concat(encrypted.encryptedData, " from anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    message: 'Data received anonymously and securely',
    encryptedData: encrypted.encryptedData
  });
}); // Endpoint to send data

app.get('/send', ensureAuthenticated, function (req, res) {
  var data = "This is some anonymous data";
  var encrypted = encryptData(data);
  console.log("Sending encrypted data: ".concat(encrypted.encryptedData, " to anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    encryptedData: encrypted.encryptedData
  });
}); // Endpoint to get API health and statistics

app.get('/health', ensureBearerToken, function (req, res) {
  var healthData = {
    uptime: process.uptime(),
    requestCount: requestCount,
    status: 'OK'
  };
  res.status(200).send(healthData);
}); // Google OAuth routes

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}));
app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), function (req, res) {
  // Successful authentication, redirect to a specific route
  res.redirect('/dashboard'); // Change '/dashboard' to the route you want to redirect to after successful authentication
});
app.get('/dashboard', function (req, res) {
  // Access the access token from the session
  var accessToken = req.user.accessToken;
  res.send("Access Token: ".concat(accessToken));
}); // Start server

app.listen(port, function () {
  console.log("API listening at http://localhost:".concat(port));
});