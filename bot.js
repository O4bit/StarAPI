require('dotenv').config();
const { Client, Intents } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const API_URL = process.env.API_URL;
const CHECK_INTERVAL = 60000; // Check every 60 seconds

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    monitorServer();
});

client.on('messageCreate', async message => {
    if (message.content === '!status') {
        const status = await getServerStatus();
        message.channel.send(status);
    } else if (message.content === '!reboot') {
        const response = await rebootServer();
        message.channel.send(response);
    } else if (message.content === '!logs') {
        const logs = await getServerLogs();
        message.channel.send(logs);
    }
});

async function monitorServer() {
    setInterval(async () => {
        const status = await getServerStatus();
        if (status.includes('down')) {
            const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
            if (channel) {
                channel.send(status);
            }
        }
    }, CHECK_INTERVAL);
}

async function getServerStatus() {
    try {
        const response = await axios.get(`${API_URL}/health`, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });
        return `Server is up. Uptime: ${response.data.uptime}, Request Count: ${response.data.requestCount}`;
    } catch (error) {
        return 'Server is down!';
    }
}

async function rebootServer() {
    try {
        const response = await axios.post(`${API_URL}/reboot`, {}, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });
        return response.data.message;
    } catch (error) {
        return 'Failed to reboot the server!';
    }
}

async function getServerLogs() {
    try {
        const response = await axios.get(`${API_URL}/logs`, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });
        return `Logs from the last hour:\n${response.data.logs}`;
    } catch (error) {
        return 'Failed to retrieve logs!';
    }
}

client.login(DISCORD_TOKEN);