const db = require('../config/database');

const logAudit = async (userId, action, details = {}, ipAddress = null) => {
    try {
        const result = await db.query(
            `INSERT INTO audit_logs 
             (user_id, action, details, ip_address) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, timestamp`,
            [userId, action, JSON.stringify(details), ipAddress]
        );
        
        console.log(`Audit log created: ${action} by user ${userId}`);
        return result.rows[0];
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

const getAuditLogs = async (filters = {}, limit = 100) => {
    try {
        let query = `
            SELECT al.*, u.username 
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (filters.userId) {
            query += ` AND al.user_id = $${paramIndex}`;
            params.push(filters.userId);
            paramIndex++;
        }
        
        if (filters.action) {
            query += ` AND al.action = $${paramIndex}`;
            params.push(filters.action);
            paramIndex++;
        }
        
        if (filters.startDate) {
            query += ` AND al.timestamp >= $${paramIndex}`;
            params.push(filters.startDate);
            paramIndex++;
        }
        
        if (filters.endDate) {
            query += ` AND al.timestamp <= $${paramIndex}`;
            params.push(filters.endDate);
            paramIndex++;
        }
        
        query += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Failed to retrieve audit logs:', error);
        throw new Error('Failed to retrieve audit logs');
    }
};

module.exports = {
    logAudit,
    getAuditLogs
};