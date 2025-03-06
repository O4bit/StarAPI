const { Client, Account, Databases, Storage } = require('appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const METRICS_DATABASE_ID = process.env.METRICS_DATABASE_ID;
const LOGS_COLLECTION_ID = process.env.LOGS_COLLECTION_ID;
const METRICS_COLLECTION_ID = process.env.METRICS_COLLECTION_ID;

const storeMetrics = async (metrics) => {
    try {
        return await databases.createDocument(
            METRICS_DATABASE_ID,
            METRICS_COLLECTION_ID,
            'unique()',
            {
                timestamp: new Date().toISOString(),
                cpu: metrics.cpu,
                memory: metrics.memory,
                disk: metrics.disk,
                temperature: metrics.temperature,
                load: metrics.load
            }
        );
    } catch (error) {
        console.error('Failed to store metrics in Appwrite:', error);
        throw error;
    }
};

const storeLog = async (level, message, data = {}) => {
    try {
        return await databases.createDocument(
            METRICS_DATABASE_ID,
            LOGS_COLLECTION_ID,
            'unique()',
            {
                timestamp: new Date().toISOString(),
                level,
                message,
                data: JSON.stringify(data)
            }
        );
    } catch (error) {
        console.error('Failed to store log in Appwrite:', error);
        throw error;
    }
};

const getRecentMetrics = async (hours = 24) => {
    try {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - hours);
        
        return await databases.listDocuments(
            METRICS_DATABASE_ID,
            METRICS_COLLECTION_ID,
            [
                Databases.Query.greaterThan('timestamp', hoursAgo.toISOString()),
                Databases.Query.orderDesc('timestamp'),
                Databases.Query.limit(500)
            ]
        );
    } catch (error) {
        console.error('Failed to retrieve metrics from Appwrite:', error);
        throw error;
    }
};

module.exports = {
    client,
    databases,
    storeMetrics,
    storeLog,
    getRecentMetrics
};