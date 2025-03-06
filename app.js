require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const systemRoutes = require('./routes/system');
const logsRoutes = require('./routes/logs');
const authRoutes = require('./routes/auth');

const { apiLimiter, authLimiter } = require('./middleware/ratelimiter');

const app = express();
const port = process.env.PORT || 3000;

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

const listEndpoints = require('express-list-endpoints');
console.log('Registered API routes:', 
  listEndpoints(app).map(r => `${r.methods.join(',')} ${r.path}`).join('\n')
);
app.get('/test', (req, res) => {
    res.json({ status: 'API is working' });
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