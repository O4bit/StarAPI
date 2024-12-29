"use strict";

var express = require('express');

var bodyParser = require('body-parser');

var crypto = require('crypto');

var helmet = require('helmet');

var passport = require('passport');

var GoogleStrategy = require('passport-google-oauth20').Strategy;

var app = express();
var port = 3000; // Use Helmet to help secure Express apps with various HTTP headers

app.use(helmet()); // Middleware to parse JSON bodies

app.use(bodyParser.json()); // Initialize Passport

app.use(passport.initialize()); // Configure Passport to use Google OAuth 2.0

passport.use(new GoogleStrategy({
  clientID: '926625572851-81vrf7sounglslt83dl1aqocae271e79.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'http://well-next-ocelot.ngrok-free.app/auth/google/callback' // Update with your ngrok URL

}, function (accessToken, refreshToken, profile, done) {
  // Here you can save the profile information to your database if needed
  return done(null, profile);
})); // Middleware to anonymize requests

app.use(function (req, res, next) {
  req.anonymousId = crypto.randomBytes(16).toString('hex');
  next();
}); // Middleware to track request count

var requestCount = 0;
app.use(function (req, res, next) {
  requestCount++;
  next();
}); // Function to encrypt data

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


app.post('/receive', function (req, res) {
  var data = req.body.data;
  var encrypted = encryptData(data);
  console.log("Received encrypted data: ".concat(encrypted.encryptedData, " from anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    message: 'Data received anonymously and securely',
    encryptedData: encrypted.encryptedData
  });
}); // Endpoint to send data

app.get('/send', function (req, res) {
  var data = "This is some anonymous data";
  var encrypted = encryptData(data);
  console.log("Sending encrypted data: ".concat(encrypted.encryptedData, " to anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    encryptedData: encrypted.encryptedData
  });
}); // Endpoint to get API health and statistics

app.get('/health', function (req, res) {
  var healthData = {
    uptime: process.uptime(),
    requestCount: requestCount,
    status: 'OK'
  };
  res.status(200).send(healthData);
}); // Google OAuth routes

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}));
app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), function (req, res) {
  // Successful authentication, redirect home.
  res.redirect('/');
}); // Start server

app.listen(port, function () {
  console.log("API listening at http://localhost:".concat(port));
});