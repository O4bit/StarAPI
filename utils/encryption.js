const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

const encrypt = (text, key = process.env.ENCRYPTION_KEY) => {
    try {
        const iv = crypto.randomBytes(16);
        const keyBuffer = Buffer.from(key, 'hex');
        
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

const decrypt = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const keyBuffer = Buffer.from(key, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

const createEncryptedToken = async (payload) => {
    try {
        const tokenId = crypto.randomUUID();
        const finalPayload = {
            ...payload,
            jti: tokenId
        };
        
        const token = jwt.sign(
            finalPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        const encryptedToken = encrypt(token);
        
        await db.query(
            'INSERT INTO tokens (token_id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
            [tokenId, payload.id]
        );
        
        return encryptedToken;
    } catch (error) {
        console.error('Token creation error:', error);
        throw new Error('Failed to create token');
    }
};

const verifyEncryptedToken = async (encryptedToken) => {
    try {
        const token = decrypt(encryptedToken);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await db.query(
            'SELECT * FROM tokens WHERE token_id = $1 AND revoked = FALSE AND expires_at > NOW()',
            [decoded.jti]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Token has been revoked or expired');
        }
        
        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
};

module.exports = {
    generateEncryptionKey,
    encrypt,
    decrypt,
    createEncryptedToken,
    verifyEncryptedToken
};