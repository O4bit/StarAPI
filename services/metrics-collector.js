const si = require('systeminformation');
const db = require('../config/database');

async function collectMetrics() {
    try {
        console.log('Collecting system metrics...');
        
        const [cpu, mem, currentLoad, fsSize, networkStats, temp] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.currentLoad(),
            si.fsSize(),
            si.networkStats(),
            si.cpuTemperature()
        ]);
        
        const cpuUsage = currentLoad.currentLoad;
        const memoryUsage = (mem.used / mem.total) * 100;
        const diskUsage = fsSize.length > 0 ? fsSize[0].use : null;
        const temperature = temp.main || null;
        
        await db.query(
            `INSERT INTO system_metrics 
             (cpu_usage, memory_usage, disk_usage, temperature, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                cpuUsage,
                memoryUsage,
                diskUsage,
                temperature,
                JSON.stringify({
                    cpu,
                    memory: mem,
                    load: currentLoad,
                    disks: fsSize,
                    network: networkStats,
                    temperature: temp
                })
            ]
        );
        
        console.log('Metrics collected and stored successfully');
    } catch (error) {
        console.error('Error collecting metrics:', error);
    }
}

const COLLECTION_INTERVAL = 60000;

collectMetrics();

const interval = setInterval(collectMetrics, COLLECTION_INTERVAL);

process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('Metrics collection stopped');
    process.exit(0);
});

module.exports = {
    collectMetrics
};