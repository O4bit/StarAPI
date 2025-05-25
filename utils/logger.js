const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isHeroku = !!process.env.DYNO;

const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    })
];

// Only add file transports in non-Heroku environments
if (!isHeroku) {
    transports.push(
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log') 
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'starapi' },
    transports
});

module.exports = logger;