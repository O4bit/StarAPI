require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const errorHandler = require('./middleware/error-handler');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const systemRoutes = require('./routes/system');
const logsRoutes = require('./routes/logs');
const authRoutes = require('./routes/auth');

const { apiLimiter, authLimiter } = require('./middleware/ratelimiter');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    },
    referrerPolicy: { policy: 'same-origin' }
}));
app.use(bodyParser.json());
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(cors({
    origin: process.env.FRONTEND_URL || (isProduction ? false : 'http://localhost:3000'),
    credentials: true
}));

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/logs', logsRoutes);
app.use('/api/v1/auth', authRoutes);

app.use('/api/system', systemRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/auth', authRoutes);

const debugRoutes = require('./routes/debug');
app.use('/api/debug', debugRoutes);

// Only start metrics collector if not on Heroku or if explicitly enabled
if (!process.env.DYNO || process.env.ENABLE_METRICS === 'true') {
    require('./services/metrics-collector');
}

const listEndpoints = require('express-list-endpoints');
console.log('Registered API routes:', 
  listEndpoints(app).map(r => `${r.methods.join(',')} ${r.path}`).join('\n')
);
app.get('/test', (req, res) => {
    res.json({ status: 'API is working' });
  });
  
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date(),
        environment: process.env.NODE_ENV,
        version: require('./package.json').version
    });
});

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'StarAPI Documentation',
            version: '7.8.4',
            description: 'API documentation for StarAPI'
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server'
            }
        ]
    },
    apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(port, '0.0.0.0', () => {
    console.log(`API listening at http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        process.exit(1);
    } else {
        throw err;
    }
});

app.use(errorHandler);