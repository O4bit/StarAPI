"use strict";

require('dotenv').config();

var express = require('express');

var helmet = require('helmet');

var cors = require('cors');

var bodyParser = require('body-parser');

var morgan = require('morgan');

var systemRoutes = require('./routes/system');

var logsRoutes = require('./routes/logs');

var authRoutes = require('./routes/auth');

var _require = require('./middleware/ratelimiter'),
    apiLimiter = _require.apiLimiter,
    authLimiter = _require.authLimiter;

var app = express();
var port = process.env.PORT || 3000;
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app',
  credentials: true
}));
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/system', systemRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/auth', authRoutes);

require('./services/metrics-collector');

var listEndpoints = require('express-list-endpoints');

console.log('Registered API routes:', listEndpoints(app).map(function (r) {
  return "".concat(r.methods.join(','), " ").concat(r.path);
}).join('\n'));
app.get('/test', function (req, res) {
  res.json({
    status: 'API is working'
  });
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