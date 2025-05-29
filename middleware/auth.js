const { verifyEncryptedToken } = require('../utils/encryption');
const { logAudit } = require('../services/audit-logger');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }
        
        // Check if it's a bot token (BOT_SECRETV2)
        if (token === process.env.BOT_SECRETV2) {
            req.user = { 
                bot_id: 'discord_bot', 
                roles: ['admin', 'bot'],
                id: 'discord_bot'
            };
            return next();
        }
        
        const decoded = verifyEncryptedToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ error: 'Authentication required' });
        }
        
        if (!req.user.roles || !Array.isArray(req.user.roles) || !req.user.roles.includes(role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};