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
    exec = _require.exec; // Import exec


var fs = require('fs');

var PastebinAPI = require('pastebin-js');

var si = require('systeminformation');

var path = require('path');

var _require2 = require('pg'),
    Pool = _require2.Pool;

var app = express();
var port = process.env.PORT || 3000;
var pastebin = new PastebinAPI({
  'api_dev_key': process.env.PASTEBIN_API_KEY,
  'api_user_name': process.env.PASTEBIN_USER_NAME,
  'api_user_password': process.env.PASTEBIN_USER_PASSWORD
});
var pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
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
}, function _callee(accessToken, refreshToken, profile, done) {
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          profile.accessToken = accessToken;
          _context.prev = 1;
          _context.next = 4;
          return regeneratorRuntime.awrap(pool.query('INSERT INTO tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [accessToken]));

        case 4:
          _context.next = 9;
          break;

        case 6:
          _context.prev = 6;
          _context.t0 = _context["catch"](1);
          console.error('Error storing token:', _context.t0);

        case 9:
          return _context.abrupt("return", done(null, profile));

        case 10:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1, 6]]);
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
  var authHeader, token, result;
  return regeneratorRuntime.async(function ensureBearerToken$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          authHeader = req.headers.authorization;

          if (!(authHeader && authHeader.startsWith('Bearer '))) {
            _context2.next = 16;
            break;
          }

          token = authHeader.split(' ')[1];
          _context2.prev = 3;
          _context2.next = 6;
          return regeneratorRuntime.awrap(pool.query('SELECT * FROM tokens WHERE token = $1', [token]));

        case 6:
          result = _context2.sent;

          if (result.rows.length > 0) {
            req.accessToken = token;
            next();
          } else {
            res.status(401).send('Access denied. Invalid bearer token.');
          }

          _context2.next = 14;
          break;

        case 10:
          _context2.prev = 10;
          _context2.t0 = _context2["catch"](3);
          console.error('Error verifying token:', _context2.t0);
          res.status(500).send({
            message: 'Verification failed',
            error: _context2.t0
          });

        case 14:
          _context2.next = 17;
          break;

        case 16:
          res.status(401).send('Access denied. Bearer token required.');

        case 17:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[3, 10]]);
};

app.post('/verify', function _callee2(req, res) {
  var token, result;
  return regeneratorRuntime.async(function _callee2$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          token = req.body.token;
          _context3.prev = 1;
          _context3.next = 4;
          return regeneratorRuntime.awrap(pool.query('SELECT * FROM tokens WHERE token = $1', [token]));

        case 4:
          result = _context3.sent;

          if (result.rows.length > 0) {
            res.status(200).send({
              verified: true
            });
          } else {
            res.status(401).send({
              verified: false,
              message: 'Invalid token'
            });
          }

          _context3.next = 12;
          break;

        case 8:
          _context3.prev = 8;
          _context3.t0 = _context3["catch"](1);
          console.error('Error verifying token:', _context3.t0);
          res.status(500).send({
            message: 'Verification failed',
            error: _context3.t0
          });

        case 12:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[1, 8]]);
});
app.get('/tokens', ensureBearerToken, function _callee3(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(pool.query('SELECT * FROM tokens'));

        case 3:
          result = _context4.sent;
          res.status(200).send({
            tokens: result.rows
          });
          _context4.next = 11;
          break;

        case 7:
          _context4.prev = 7;
          _context4.t0 = _context4["catch"](0);
          console.error('Error fetching tokens:', _context4.t0);
          res.status(500).send({
            message: 'Failed to fetch tokens',
            error: _context4.t0
          });

        case 11:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
app["delete"]('/tokens/:id', ensureBearerToken, function _callee4(req, res) {
  var id, result;
  return regeneratorRuntime.async(function _callee4$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          id = req.params.id;
          _context5.prev = 1;
          _context5.next = 4;
          return regeneratorRuntime.awrap(pool.query('DELETE FROM tokens WHERE id = $1', [id]));

        case 4:
          result = _context5.sent;

          if (result.rowCount > 0) {
            res.status(200).send({
              message: 'Token deleted successfully'
            });
          } else {
            res.status(404).send({
              message: 'Token not found'
            });
          }

          _context5.next = 12;
          break;

        case 8:
          _context5.prev = 8;
          _context5.t0 = _context5["catch"](1);
          console.error('Error deleting token:', _context5.t0);
          res.status(500).send({
            message: 'Failed to delete token',
            error: _context5.t0
          });

        case 12:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[1, 8]]);
});
app.patch('/tokens/:id/lock', ensureBearerToken, function _callee5(req, res) {
  var id, result;
  return regeneratorRuntime.async(function _callee5$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          id = req.params.id;
          _context6.prev = 1;
          _context6.next = 4;
          return regeneratorRuntime.awrap(pool.query('UPDATE tokens SET locked = true WHERE id = $1', [id]));

        case 4:
          result = _context6.sent;

          if (result.rowCount > 0) {
            res.status(200).send({
              message: 'Token locked successfully'
            });
          } else {
            res.status(404).send({
              message: 'Token not found'
            });
          }

          _context6.next = 12;
          break;

        case 8:
          _context6.prev = 8;
          _context6.t0 = _context6["catch"](1);
          console.error('Error locking token:', _context6.t0);
          res.status(500).send({
            message: 'Failed to lock token',
            error: _context6.t0
          });

        case 12:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[1, 8]]);
});
app.get('/apihealth', ensureBearerToken, function (req, res) {
  var healthData = {
    uptime: process.uptime(),
    requestCount: requestCount,
    status: 'OK'
  };
  res.status(200).send(healthData);
});
app.get('/health', ensureBearerToken, function (req, res) {
  exec('uptime -p', function (error, stdout, stderr) {
    if (error) {
      return res.status(500).send({
        message: 'Failed to get server uptime',
        error: stderr
      });
    }

    res.status(200).send({
      uptime: stdout.trim(),
      status: 'Server is running'
    });
  });
});
app.get('/systeminfo', ensureBearerToken, function _callee6(req, res) {
  var systemInfo;
  return regeneratorRuntime.async(function _callee6$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _context7.next = 3;
          return regeneratorRuntime.awrap(si.get({
            cpu: 'manufacturer, brand, speed, cores',
            mem: 'total, free',
            osInfo: 'platform, distro, release, kernel',
            currentLoad: 'currentLoad',
            networkInterfaces: 'ip4'
          }));

        case 3:
          systemInfo = _context7.sent;
          res.status(200).send(systemInfo);
          _context7.next = 10;
          break;

        case 7:
          _context7.prev = 7;
          _context7.t0 = _context7["catch"](0);
          res.status(500).send({
            message: 'Failed to retrieve system information',
            error: _context7.t0
          });

        case 10:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
app.get('/neofetch', ensureBearerToken, function (req, res) {
  exec('neofetch --stdout', function (error, stdout, stderr) {
    if (error) {
      return res.status(500).send({
        message: 'Failed to run neofetch',
        error: stderr
      });
    }

    res.status(200).send({
      output: stdout
    });
  });
});
app.get('/websiteStatus', ensureBearerToken, function _callee7(req, res) {
  var url, response;
  return regeneratorRuntime.async(function _callee7$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          url = req.query.url;

          if (url) {
            _context8.next = 3;
            break;
          }

          return _context8.abrupt("return", res.status(400).send({
            message: 'URL query parameter is required'
          }));

        case 3:
          _context8.prev = 3;
          _context8.next = 6;
          return regeneratorRuntime.awrap(axios.get(url));

        case 6:
          response = _context8.sent;
          res.status(200).send({
            status: 'up',
            statusCode: response.status
          });
          _context8.next = 13;
          break;

        case 10:
          _context8.prev = 10;
          _context8.t0 = _context8["catch"](3);
          res.status(200).send({
            status: 'down',
            statusCode: _context8.t0.response ? _context8.t0.response.status : 'unknown'
          });

        case 13:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[3, 10]]);
});
app.get('/logs', ensureBearerToken, function _callee8(req, res) {
  var logFiles, oneHourAgo, severityLevels, logs, _i, _logFiles, logFile, data, filteredLogs, pastebinResponse;

  return regeneratorRuntime.async(function _callee8$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          logFiles = ['/var/log/syslog', '/var/log/syslog.1']; // Add more log files if needed

          oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          severityLevels = ['warning', 'error', 'critical'];
          logs = '';

          for (_i = 0, _logFiles = logFiles; _i < _logFiles.length; _i++) {
            logFile = _logFiles[_i];

            try {
              data = fs.readFileSync(logFile, 'utf8');
              filteredLogs = data.split('\n').filter(function (line) {
                // Adjust date parsing as needed
                var logDateMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
                if (!logDateMatch) return false;
                var logDate = new Date(logDateMatch[0]);
                var severity = severityLevels.some(function (level) {
                  return line.toLowerCase().includes(level);
                });
                return logDate >= oneHourAgo && severity;
              }).join('\n');
              logs += filteredLogs;
            } catch (err) {
              console.error("Failed to read log file ".concat(logFile, ":"), err);
            }
          }

          if (!(logs.length === 0)) {
            _context9.next = 8;
            break;
          }

          console.log('No relevant logs found for the past hour');
          return _context9.abrupt("return", res.status(400).send({
            message: 'No relevant logs found for the past hour'
          }));

        case 8:
          console.log('Logs to be sent to Pastebin:', logs);
          _context9.prev = 9;
          _context9.next = 12;
          return regeneratorRuntime.awrap(pastebin.createPaste({
            text: logs,
            title: 'Server Logs',
            format: null,
            privacy: 2,
            // Unlisted
            expiration: '1H'
          }));

        case 12:
          pastebinResponse = _context9.sent;
          console.log('Pastebin URL:', pastebinResponse);
          res.status(200).send({
            url: pastebinResponse
          });
          _context9.next = 21;
          break;

        case 17:
          _context9.prev = 17;
          _context9.t0 = _context9["catch"](9);
          console.error('Failed to create Pastebin:', _context9.t0);
          res.status(500).send({
            message: 'Failed to create Pastebin',
            error: _context9.t0
          });

        case 21:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[9, 17]]);
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
}).on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error("Port ".concat(port, " is already in use"));
    process.exit(1);
  } else {
    throw err;
  }
});