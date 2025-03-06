const { verifyEncryptedToken } = require('../utils/encryption');
const { logAudit } = require('../services/audit-logger');


const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const encryptedToken = authHeader.split(' ')[1];
        
        const decoded = await verifyEncryptedToken(encryptedToken);
        
        req.user = decoded;
        
        await logAudit(decoded.id, 'api-access', {
            path: req.path,
            method: req.method,
            ip: req.ip
        }, req.ip);
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        } else if (error.message === 'Token has been revoked or expired') {
            return res.status(401).json({ error: 'Token revoked' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};


const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!req.user.roles.includes(role)) {
            logAudit(req.user.id, 'unauthorized-access', {
                path: req.path,
                method: req.method,
                requiredRole: role,
                userRoles: req.user.roles
            }, req.ip);
            
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};