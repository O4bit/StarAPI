"use strict";

require('dotenv').config();

var express = require('express');

var bodyParser = require('body-parser');

var crypto = require('crypto');

var helmet = require('helmet');

var passport = require('passport');

var GoogleStrategy = require('passport-google-oauth20').Strategy;

var session = require('express-session');

var axios = require('axios');

var _require = require('child_process'),
    exec = _require.exec;

var fs = require('fs');

var PastebinAPI = require('pastebin-js');

var app = express();
var port = 3000;
var pastebin = new PastebinAPI({
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
  cookie: {
    secure: false
  }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}, function (accessToken, refreshToken, profile, done) {
  profile.accessToken = accessToken;
  return done(null, profile);
}));
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (obj, done) {
  done(null, obj);
});
app.use(function (req, res, next) {
  req.anonymousId = crypto.randomBytes(16).toString('hex');
  next();
});
var requestCount = 0;
app.use(function (req, res, next) {
  requestCount++;
  next();
});

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
};

var ensureBearerToken = function ensureBearerToken(req, res, next) {
  var authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    var token = authHeader.split(' ')[1];
    req.accessToken = token;
    next();
  } else {
    res.status(401).send('Access denied. Bearer token required.');
  }
};

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
};

app.post('/receive', ensureAuthenticated, function (req, res) {
  var data = req.body.data;
  var encrypted = encryptData(data);
  console.log("Received encrypted data: ".concat(encrypted.encryptedData, " from anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    message: 'Data received anonymously and securely',
    encryptedData: encrypted.encryptedData
  });
});
app.get('/send', ensureAuthenticated, function (req, res) {
  var data = "This is some anonymous data";
  var encrypted = encryptData(data);
  console.log("Sending encrypted data: ".concat(encrypted.encryptedData, " to anonymous ID: ").concat(req.anonymousId));
  res.status(200).send({
    encryptedData: encrypted.encryptedData
  });
});
app.get('/health', ensureBearerToken, function (req, res) {
  var healthData = {
    uptime: process.uptime(),
    requestCount: requestCount,
    status: 'OK'
  };
  res.status(200).send(healthData);
});
app.get('/websiteStatus', ensureBearerToken, function _callee(req, res) {
  var url, response;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          url = req.query.url;

          if (url) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", res.status(400).send({
            message: 'URL query parameter is required'
          }));

        case 3:
          _context.prev = 3;
          _context.next = 6;
          return regeneratorRuntime.awrap(axios.get(url));

        case 6:
          response = _context.sent;
          res.status(200).send({
            status: 'up',
            statusCode: response.status
          });
          _context.next = 13;
          break;

        case 10:
          _context.prev = 10;
          _context.t0 = _context["catch"](3);
          res.status(200).send({
            status: 'down',
            statusCode: _context.t0.response ? _context.t0.response.status : 'unknown'
          });

        case 13:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[3, 10]]);
});
app.post('/reboot', ensureBearerToken, function (req, res) {
  exec('sudo reboot', function (error, stdout, stderr) {
    if (error) {
      return res.status(500).send({
        message: 'Failed to reboot the server',
        error: stderr
      });
    }

    res.status(200).send({
      message: 'Server is rebooting...',
      output: stdout
    });
  });
});
app.get('/logs', ensureBearerToken, function (req, res) {
  var logFilePath = '/var/log/syslog'; // Adjust the log file path as needed

  var twelveHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  fs.readFile(logFilePath, 'utf8', function (err, data) {
    if (err) {
      return res.status(500).send({
        message: 'Failed to read logs',
        error: err
      });
    }

    var logs = data.split('\n').filter(function (line) {
      var logDate = new Date(line.substring(0, 15)); // Adjust date parsing as needed

      return logDate >= twelveHoursAgo;
    }).join('\n');

    if (logs.length === 0) {
      return res.status(400).send({
        message: 'No logs found for the past 12 hours'
      });
    }

    console.log('Logs to be sent to Pastebin:', logs);
    pastebin.createPaste({
      text: logs,
      title: 'Server Logs',
      format: null,
      privacy: 2,
      // Unlisted
      expiration: '1H'
    }).then(function (data) {
      res.status(200).send({
        url: data
      });
    }).fail(function (err) {
      console.error('Failed to create Pastebin:', err);
      res.status(500).send({
        message: 'Failed to create Pastebin',
        error: err
      });
    });
  });
});
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.phonenumbers.read']
}));
app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), function (req, res) {
  res.redirect('/dashboard');
});
app.get('/dashboard', function (req, res) {
  var accessToken = req.user.accessToken;
  res.send("Access Token: ".concat(accessToken));
});
app.listen(port, function () {
  console.log("API listening at http://localhost:".concat(port));
});