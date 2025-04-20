const { verifyEncryptedToken } = require('../utils/encryption');
const { logAudit } = require('../services/audit-logger');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }
    
    if (token === process.env.BOT_SECRETV2) {
        console.log('Bot authenticated with BOT_SECRETV2');
        req.user = {
            id: 'bot',
            role: 'bot',
            isBotRequest: true,
            roles: ['bot', 'admin']
        };
        return next();
    }
    
    try {
        const decoded = verifyEncryptedToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ error: 'Invalid token' });
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