"use strict";

require('dotenv').config();

var express = require('express');

var bodyParser = require('body-parser');

var helmet = require('helmet');

var axios = require('axios');

var _require = require('child_process'),
    exec = _require.exec;

var fs = require('fs');

var PastebinAPI = require('pastebin-js');

var si = require('systeminformation');

var path = require('path');

var crypto = require('crypto');

var mariadb = require('mariadb');

var jwt = require('jsonwebtoken');

var speakeasy = require('speakeasy');

var bcrypt = require('bcrypt');

var morgan = require('morgan');

var qrcode = require('qrcode');

var rateLimit = require('express-rate-limit');

var app = express();
var port = process.env.PORT || 3000;
var pastebin = new PastebinAPI({
  'api_dev_key': process.env.PASTEBIN_API_KEY,
  'api_user_name': process.env.PASTEBIN_USER_NAME,
  'api_user_password': process.env.PASTEBIN_USER_PASSWORD
});
var pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('combined'));
app.use('/dashboard', express["static"](path.join(__dirname, 'dashboard'))); // incase some guy from india tries brute force the passwd

var limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter); // i don't think this is neccessary at all but i'll keep it here just in case

var ipWhitelist = ['127.0.0.1'];

var ensureIPWhitelist = function ensureIPWhitelist(req, res, next) {
  var clientIp = req.ip;

  if (ipWhitelist.includes(clientIp)) {
    next();
  } else {
    res.status(403).send('Access denied. IP not whitelisted.');
  }
};

var ensureJWT = function ensureJWT(req, res, next) {
  var authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    var token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
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

var ensureBotToken = function ensureBotToken(req, res, next) {
  var botToken, conn, rows;
  return regeneratorRuntime.async(function ensureBotToken$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          botToken = req.headers['x-bot-token'];

          if (!botToken) {
            _context.next = 11;
            break;
          }

          _context.next = 4;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 4:
          conn = _context.sent;
          _context.next = 7;
          return regeneratorRuntime.awrap(conn.query('SELECT * FROM bot_tokens WHERE token = ?', [botToken]));

        case 7:
          rows = _context.sent;
          conn.release();

          if (!(rows.length > 0)) {
            _context.next = 11;
            break;
          }

          return _context.abrupt("return", next());

        case 11:
          ensureJWT(req, res, next);

        case 12:
        case "end":
          return _context.stop();
      }
    }
  });
};

var ensureRole = function ensureRole(role) {
  return function (req, res, next) {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).send('Access denied. Insufficient permissions.');
    }
  };
};

var logAudit = function logAudit(message) {
  var conn;
  return regeneratorRuntime.async(function logAudit$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 2:
          conn = _context2.sent;
          _context2.next = 5;
          return regeneratorRuntime.awrap(conn.query('INSERT INTO audit_logs (message) VALUES (?)', [message]));

        case 5:
          conn.release();

        case 6:
        case "end":
          return _context2.stop();
      }
    }
  });
};

app.post('/register', function _callee(req, res) {
  var _req$body, username, password, role, hashedPassword, secret, conn;

  return regeneratorRuntime.async(function _callee$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _req$body = req.body, username = _req$body.username, password = _req$body.password, role = _req$body.role;
          _context3.next = 3;
          return regeneratorRuntime.awrap(bcrypt.hash(password, 10));

        case 3:
          hashedPassword = _context3.sent;
          secret = speakeasy.generateSecret({
            length: 20
          });
          _context3.prev = 5;
          _context3.next = 8;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 8:
          conn = _context3.sent;
          _context3.next = 11;
          return regeneratorRuntime.awrap(conn.query('INSERT INTO users (username, password, secret, role) VALUES (?, ?, ?, ?)', [username, hashedPassword, secret.base32, role]));

        case 11:
          conn.release();
          res.status(201).send('User registered successfully');
          _context3.next = 18;
          break;

        case 15:
          _context3.prev = 15;
          _context3.t0 = _context3["catch"](5);
          res.status(500).send({
            message: 'Registration failed',
            error: _context3.t0
          });

        case 18:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[5, 15]]);
}); //TODO: Itergrate this with a dash board (i am too lazy to do it)

app.post('/login', function _callee2(req, res) {
  var _req$body2, username, password, conn, rows, user, passwordMatch, token;

  return regeneratorRuntime.async(function _callee2$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _req$body2 = req.body, username = _req$body2.username, password = _req$body2.password;
          _context4.prev = 1;
          _context4.next = 4;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 4:
          conn = _context4.sent;
          _context4.next = 7;
          return regeneratorRuntime.awrap(conn.query('SELECT * FROM users WHERE username = ?', [username]));

        case 7:
          rows = _context4.sent;
          conn.release();

          if (!(rows.length > 0)) {
            _context4.next = 17;
            break;
          }

          user = rows[0];
          _context4.next = 13;
          return regeneratorRuntime.awrap(bcrypt.compare(password, user.password));

        case 13:
          passwordMatch = _context4.sent;

          if (passwordMatch) {
            token = jwt.sign({
              username: user.username,
              role: user.role,
              secret: user.secret
            }, process.env.JWT_SECRET, {
              expiresIn: '1h'
            });
            res.status(200).send({
              token: token,
              secret: user.secret
            });
          } else {
            res.status(401).send('Invalid credentials');
          }

          _context4.next = 18;
          break;

        case 17:
          res.status(401).send('Invalid credentials');

        case 18:
          _context4.next = 23;
          break;

        case 20:
          _context4.prev = 20;
          _context4.t0 = _context4["catch"](1);
          res.status(500).send({
            message: 'Login failed',
            error: _context4.t0
          });

        case 23:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[1, 20]]);
});
app.post('/verify-2fa', ensureJWT, function (req, res) {
  var token = req.body.token;
  var verified = speakeasy.totp.verify({
    secret: req.user.secret,
    encoding: 'base32',
    token: token
  });

  if (verified) {
    res.status(200).send('2FA verified');
  } else {
    res.status(401).send('Invalid 2FA token');
  }
}); //This has been the cause of weeks of pain trying to secure this one fucking endpoint

app.post('/execute', ensureBotToken, ensureRole('admin'), function _callee3(req, res) {
  var command;
  return regeneratorRuntime.async(function _callee3$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          command = req.body.command;

          if (command) {
            _context5.next = 3;
            break;
          }

          return _context5.abrupt("return", res.status(400).send({
            message: 'Command is required'
          }));

        case 3:
          exec(command, function (error, stdout, stderr) {
            if (error) {
              return res.status(500).send({
                message: 'Failed to execute command',
                error: stderr
              });
            }

            res.status(200).send({
              output: stdout
            });
          });

        case 4:
        case "end":
          return _context5.stop();
      }
    }
  });
}); // if this some how, in some way gets breached i am going to quit programming js

app.post('/verify', ensureBotToken, function _callee4(req, res) {
  var token, botToken, conn, rows, verified;
  return regeneratorRuntime.async(function _callee4$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          token = req.body.token;
          botToken = req.headers['x-bot-token'];

          if (!botToken) {
            _context6.next = 12;
            break;
          }

          _context6.next = 5;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 5:
          conn = _context6.sent;
          _context6.next = 8;
          return regeneratorRuntime.awrap(conn.query('SELECT * FROM bot_tokens WHERE token = ?', [botToken]));

        case 8:
          rows = _context6.sent;
          conn.release();

          if (!(rows.length > 0)) {
            _context6.next = 12;
            break;
          }

          return _context6.abrupt("return", res.status(200).send('Bot token verified'));

        case 12:
          verified = speakeasy.totp.verify({
            secret: req.user.secret,
            encoding: 'base32',
            token: token
          });

          if (verified) {
            res.status(200).send('2FA verified');
          } else {
            res.status(401).send('Invalid 2FA token');
          }

        case 14:
        case "end":
          return _context6.stop();
      }
    }
  });
}); //TODO: Fix this fucking mess of a code

app.get('/tokens', ensureJWT, ensureRole('admin'), function _callee5(req, res) {
  var conn, rows;
  return regeneratorRuntime.async(function _callee5$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _context7.next = 3;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 3:
          conn = _context7.sent;
          _context7.next = 6;
          return regeneratorRuntime.awrap(conn.query('SELECT * FROM tokens'));

        case 6:
          rows = _context7.sent;
          conn.release();
          res.status(200).send({
            tokens: rows
          });
          _context7.next = 14;
          break;

        case 11:
          _context7.prev = 11;
          _context7.t0 = _context7["catch"](0);
          res.status(500).send({
            message: 'Failed to fetch tokens',
            error: _context7.t0
          });

        case 14:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 11]]);
});
app["delete"]('/tokens/:id', ensureJWT, ensureRole('admin'), function _callee6(req, res) {
  var id, conn, result;
  return regeneratorRuntime.async(function _callee6$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          id = req.params.id;
          _context8.prev = 1;
          _context8.next = 4;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 4:
          conn = _context8.sent;
          _context8.next = 7;
          return regeneratorRuntime.awrap(conn.query('DELETE FROM tokens WHERE id = ?', [id]));

        case 7:
          result = _context8.sent;
          conn.release();

          if (result.affectedRows > 0) {
            res.status(200).send({
              message: 'Token deleted successfully'
            });
          } else {
            res.status(404).send({
              message: 'Token not found'
            });
          }

          _context8.next = 15;
          break;

        case 12:
          _context8.prev = 12;
          _context8.t0 = _context8["catch"](1);
          res.status(500).send({
            message: 'Failed to delete token',
            error: _context8.t0
          });

        case 15:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[1, 12]]);
});
app.patch('/tokens/:id/lock', ensureJWT, ensureRole('admin'), function _callee7(req, res) {
  var id, conn, result;
  return regeneratorRuntime.async(function _callee7$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          id = req.params.id;
          _context9.prev = 1;
          _context9.next = 4;
          return regeneratorRuntime.awrap(pool.getConnection());

        case 4:
          conn = _context9.sent;
          _context9.next = 7;
          return regeneratorRuntime.awrap(conn.query('UPDATE tokens SET locked = true WHERE id = ?', [id]));

        case 7:
          result = _context9.sent;
          conn.release();

          if (result.affectedRows > 0) {
            res.status(200).send({
              message: 'Token locked successfully'
            });
          } else {
            res.status(404).send({
              message: 'Token not found'
            });
          }

          _context9.next = 15;
          break;

        case 12:
          _context9.prev = 12;
          _context9.t0 = _context9["catch"](1);
          res.status(500).send({
            message: 'Failed to lock token',
            error: _context9.t0
          });

        case 15:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[1, 12]]);
});
app.get('/apihealth', ensureBotToken, function (req, res) {
  var healthData = {
    uptime: process.uptime(),
    requestCount: requestCount,
    status: 'OK'
  };
  res.status(200).send(healthData);
});
app.get('/health', ensureBotToken, function (req, res) {
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
app.get('/systeminfo', ensureBotToken, function _callee8(req, res) {
  var systemInfo;
  return regeneratorRuntime.async(function _callee8$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _context10.next = 3;
          return regeneratorRuntime.awrap(si.get({
            cpu: 'manufacturer, brand, speed, cores',
            mem: 'total, free',
            osInfo: 'platform, distro, release, kernel',
            currentLoad: 'currentLoad',
            networkInterfaces: 'ip4'
          }));

        case 3:
          systemInfo = _context10.sent;
          res.status(200).send(systemInfo);
          _context10.next = 10;
          break;

        case 7:
          _context10.prev = 7;
          _context10.t0 = _context10["catch"](0);
          res.status(500).send({
            message: 'Failed to retrieve system information',
            error: _context10.t0
          });

        case 10:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
app.get('/neofetch', ensureBotToken, function (req, res) {
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
app.get('/websiteStatus', ensureBotToken, function _callee9(req, res) {
  var url, response;
  return regeneratorRuntime.async(function _callee9$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          url = req.query.url;

          if (url) {
            _context11.next = 3;
            break;
          }

          return _context11.abrupt("return", res.status(400).send({
            message: 'URL query parameter is required'
          }));

        case 3:
          _context11.prev = 3;
          _context11.next = 6;
          return regeneratorRuntime.awrap(axios.get(url));

        case 6:
          response = _context11.sent;
          res.status(200).send({
            status: 'up',
            statusCode: response.status
          });
          _context11.next = 13;
          break;

        case 10:
          _context11.prev = 10;
          _context11.t0 = _context11["catch"](3);
          res.status(200).send({
            status: 'down',
            statusCode: _context11.t0.response ? _context11.t0.response.status : 'unknown'
          });

        case 13:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[3, 10]]);
});
app.get('/logs', ensureJWT, ensureRole('admin'), function _callee10(req, res) {
  var logFiles, oneHourAgo, severityLevels, logs, _i, _logFiles, logFile, data, filteredLogs, pastebinResponse;

  return regeneratorRuntime.async(function _callee10$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          logFiles = ['/var/log/syslog', '/var/log/syslog.1'];
          oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
          severityLevels = ['warning', 'error', 'critical'];
          logs = '';

          for (_i = 0, _logFiles = logFiles; _i < _logFiles.length; _i++) {
            logFile = _logFiles[_i];

            try {
              data = fs.readFileSync(logFile, 'utf8');
              filteredLogs = data.split('\n').filter(function (line) {
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
            _context12.next = 7;
            break;
          }

          return _context12.abrupt("return", res.status(400).send({
            message: 'No relevant logs found for the past hour'
          }));

        case 7:
          _context12.prev = 7;
          _context12.next = 10;
          return regeneratorRuntime.awrap(pastebin.createPaste({
            text: logs,
            title: 'Server Logs',
            format: null,
            privacy: 2,
            expiration: '1H'
          }));

        case 10:
          pastebinResponse = _context12.sent;
          res.status(200).send({
            url: pastebinResponse
          });
          _context12.next = 17;
          break;

        case 14:
          _context12.prev = 14;
          _context12.t0 = _context12["catch"](7);
          res.status(500).send({
            message: 'Failed to create Pastebin',
            error: _context12.t0
          });

        case 17:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[7, 14]]);
});
app.listen(port, function () {
  console.log("API listening at http://localhost:".concat(port));
}).on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    process.exit(1);
  } else {
    throw err;
  }
});

if (process.argv.includes('/2fa')) {
  var secret = speakeasy.generateSecret({
    length: 20
  });
  var otpauthUrl = speakeasy.otpauthURL({
    secret: secret.ascii,
    label: 'P.U.L.S.E.D-API',
    issuer: 'P.U.L.S.E.D'
  });
  qrcode.toString(otpauthUrl, {
    type: 'terminal'
  }, function (err, url) {
    if (err) {
      console.error('Failed to generate QR code:', err);
    } else {
      console.log('Scan this QR code with your authenticator app:');
      console.log(url);
      console.log("Secret: ".concat(secret.base32));
    }
  });
}

if (process.argv.includes('/botoken')) {
  var botToken = crypto.randomBytes(32).toString('hex');
  console.log("Generated Bot Token: ".concat(botToken));
  pool.query('INSERT INTO bot_tokens (token) VALUES (?)', [botToken]).then(function () {
    return console.log('Bot token saved to database');
  })["catch"](function (err) {
    return console.error('Failed to save bot token to database:', err);
  });
}

if (process.argv.includes('/whitelist')) {
  var ip = process.argv[process.argv.indexOf('/whitelist') + 1];

  if (ip) {
    ipWhitelist.push(ip);
    console.log("IP ".concat(ip, " added to whitelist"));
  } else {
    console.error('No IP address provided');
  }
}