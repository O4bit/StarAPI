const { Client, Databases, Query } = require('node-appwrite');

const client = new Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

const getRecentMetrics = async (hours = 24) => {
    try {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - hours);
        
        const response = await databases.listDocuments(
            process.env.METRICS_DATABASE_ID,
            process.env.METRICS_COLLECTION_ID,
            [
                Query.greaterThan('timestamp', timestamp.toISOString()),
                Query.orderAsc('timestamp')
            ]
        );
        
        return response.documents;
    } catch (error) {
        console.error('Error fetching metrics from Appwrite:', error);
        return [];
    }
};

const createLog = async (severity, message, service = 'system', details = {}) => {
    try {
        return await databases.createDocument(
            process.env.METRICS_DATABASE_ID,
            process.env.LOGS_COLLECTION_ID,
            'unique()',
            {
                severity,
                message,
                service,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            }
        );
    } catch (error) {
        console.error('Error creating log in Appwrite:', error);
        throw error;
    }
};

const getLogs = async (severity = null, hours = 24, limit = 50) => {
    try {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - hours);
        
        let queries = [
            Query.greaterThan('timestamp', timestamp.toISOString()),
            Query.orderDesc('timestamp'),
            Query.limit(limit)
        ];
        
        if (severity && severity !== 'all') {
            queries.push(Query.equal('severity', severity));
        }
        
        const response = await databases.listDocuments(
            process.env.METRICS_DATABASE_ID,
            process.env.LOGS_COLLECTION_ID,
            queries
        );
        
        return response.documents;
    } catch (error) {
        console.error('Error fetching logs from Appwrite:', error);
        return [];
    }
};

const createAuditLog = async (userId, action, details = {}, ipAddress = null) => {
    try {
        return await databases.createDocument(
            process.env.METRICS_DATABASE_ID,
            process.env.AUDIT_LOGS_COLLECTION_ID,
            'unique()',
            {
                userId,
                action,
                details: JSON.stringify(details),
                ipAddress,
                timestamp: new Date().toISOString()
            }
        );
    } catch (error) {
        console.error('Error creating audit log in Appwrite:', error);
        console.log(`AUDIT: ${userId} - ${action} - ${JSON.stringify(details)}`);
    }
};

module.exports = {
    client,
    databases,
    getRecentMetrics,
    createLog,
    getLogs,
    createAuditLog
};