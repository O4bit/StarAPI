require('dotenv').config();
const axios = require('axios');
const { exec } = require('child_process');

const API_URL = process.env.API_URL;
const API_TOKEN = process.env.API_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function checkServerStatus() {
    try {
        const response = await axios.get(`${API_URL}/health`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` }
        });
        if (response.data.status !== 'OK') {
            await sendDiscordNotification('Server is down!');
            await rebootServer();
        }
    } catch (error) {
        await sendDiscordNotification('Failed to check server status!');
    }
}

async function checkWebsiteStatus() {
    try {
        const response = await axios.get(`${API_URL}/websiteStatus?url=https://orbit.deepspaceproductions.net`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` }
        });
        if (response.data.status !== 'up') {
            await sendDiscordNotification('Website is down!');
        }
    } catch (error) {
        await sendDiscordNotification('Failed to check website status!');
    }
}

async function rebootServer() {
    try {
        const response = await axios.post(`${API_URL}/reboot`, {}, {
            headers: { Authorization: `Bearer ${API_TOKEN}` }
        });
        await sendDiscordNotification(response.data.message);
    } catch (error) {
        await sendDiscordNotification('Failed to reboot the server!');
    }
}

async function sendDiscordNotification(message) {
    try {
        await axios.post(DISCORD_WEBHOOK_URL, { content: message });
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
    }
}

async function monitor() {
    await checkServerStatus();
    await checkWebsiteStatus();
}

monitor();