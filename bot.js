require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    EmbedBuilder,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');
const axios = require('axios');
const { encrypt, verifyEncryptedToken } = require('./utils/encryption');
const { logAudit } = require('./services/audit-logger');
const db = require('./config/database');
const jwt = require('jsonwebtoken');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages
    ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

let BOT_API_TOKEN;

const ADMIN_IDS = process.env.DISCORD_ADMIN_IDS ? 
    process.env.DISCORD_ADMIN_IDS.split(',') : [];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        BOT_API_TOKEN = await getBotApiToken();
        
        await registerCommands();
        
        await logAudit('system', 'bot-startup', {
            botTag: client.user.tag,
            timestamp: new Date()
        });
        
        console.log('Bot fully initialized and ready');
    } catch (error) {
        console.error('Bot initialization error:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;
    const isAdmin = ADMIN_IDS.includes(userId);

    await logAudit(userId, 'bot-command', {
        command: commandName,
        user: interaction.user.tag,
        isAdmin
    });

    try {
        if (['logs', 'reboot'].includes(commandName) && !isAdmin) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        switch (commandName) {
            case 'status':
                await handleStatus(interaction);
                break;
            case 'metrics':
                await handleMetrics(interaction);
                break;
            case 'logs':
                await handleLogs(interaction);
                break;
            case 'reboot':
                await handleReboot(interaction);
                break;
            default:
                await interaction.reply({
                    content: `Unknown command: ${commandName}`,
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error(`Error handling command ${commandName}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `An error occurred while processing your command`,
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: `An error occurred while processing your command`
            });
        }
        
        await logAudit(userId, 'bot-command-error', {
            command: commandName,
            error: error.message,
            stack: error.stack
        });
    }
});

async function handleStatus(interaction) {
    await interaction.deferReply();
    
    try {
        const response = await axios.get(`${API_URL}/system/health`, {
            headers: { 'Authorization': `Bearer ${BOT_API_TOKEN}` }
        });
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('System Status')
            .addFields(
                { name: 'Status', value: response.data.status, inline: true },
                { name: 'Uptime', value: formatUptime(response.data.uptime), inline: true },
                { name: 'Load Average', value: response.data.loadAverage.join(', '), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'StarAPI Status' });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Status command error:', error);
        await interaction.editReply('Failed to retrieve system status');
        throw error;
    }
}

async function handleMetrics(interaction) {
    await interaction.deferReply();
    
    try {
        const response = await axios.get(`${API_URL}/system/metrics`, {
            headers: { 'Authorization': `Bearer ${BOT_API_TOKEN}` }
        });
        
        const data = response.data;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('System Metrics')
            .addFields(
                { name: 'CPU Usage', value: `${data.load.currentLoad.toFixed(2)}%`, inline: true },
                { name: 'Memory Used', value: formatBytes(data.memory.used), inline: true },
                { name: 'Memory Total', value: formatBytes(data.memory.total), inline: true },
                { name: 'CPU Temp', value: data.temperature.main ? `${data.temperature.main}°C` : 'N/A', inline: true },
                { name: 'Disk Usage', value: `${data.disk[0]?.use.toFixed(2)}%`, inline: true },
                { name: 'Network RX/TX', value: `${formatBytes(data.network[0]?.rx_sec)}/s / ${formatBytes(data.network[0]?.tx_sec)}/s`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'StarAPI Metrics' });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Metrics command error:', error);
        await interaction.editReply('Failed to retrieve system metrics');
        throw error;
    }
}

async function handleLogs(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const severity = interaction.options.getString('severity') || 'error';
        const hours = interaction.options.getInteger('hours') || 24;
        
        const response = await axios.get(`${API_URL}/logs`, {
            params: { severity, hours, limit: 10 },
            headers: { 'Authorization': `Bearer ${BOT_API_TOKEN}` }
        });
        
        if (response.data.logs.length === 0) {
            return interaction.editReply('No logs found for the specified criteria.');
        }
        
        const logs = response.data.logs.map(log => 
            `[${new Date(log.timestamp).toISOString()}] ${log.severity.toUpperCase()}: ${log.message}`
        );
        
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle(`System Logs (${severity}, last ${hours}h)`)
            .setDescription(logs.join('\n\n').substring(0, 4000))
            .setTimestamp()
            .setFooter({ text: 'StarAPI Logs' });
        
        await interaction.editReply({ embeds: [embed] });
        
        await logAudit(interaction.user.id, 'logs-access', {
            severity,
            hours,
            count: response.data.logs.length,
            via: 'discord-bot'
        });
    } catch (error) {
        console.error('Logs command error:', error);
        await interaction.editReply('Failed to retrieve logs');
        throw error;
    }
}

async function handleReboot(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        await logAudit(interaction.user.id, 'system-reboot-request', {
            user: interaction.user.tag,
            channel: interaction.channel.name,
            guild: interaction.guild.name
        });
        
        await interaction.editReply({
            content: 'System reboot request submitted. The server will restart shortly.'
        });
        
        await axios.post(`${API_URL}/system/commands`, 
            { command: 'system-reboot' },
            { headers: { 'Authorization': `Bearer ${BOT_API_TOKEN}` } }
        );
    } catch (error) {
        console.error('Reboot command error:', error);
        await interaction.editReply('Failed to reboot system');
        throw error;
    }
}

async function registerCommands() {
    try {
        console.log('Registering slash commands...');
        
        const commands = [
            new SlashCommandBuilder()
                .setName('status')
                .setDescription('Get system status'),
                
            new SlashCommandBuilder()
                .setName('metrics')
                .setDescription('Get detailed system metrics'),
                
            new SlashCommandBuilder()
                .setName('logs')
                .setDescription('Get system logs (admin only)')
                .addStringOption(option => 
                    option.setName('severity')
                        .setDescription('Log severity level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Error', value: 'error' },
                            { name: 'Warning', value: 'warning' },
                            { name: 'Info', value: 'info' },
                            { name: 'Debug', value: 'debug' }
                        )
                )
                .addIntegerOption(option =>
                    option.setName('hours')
                        .setDescription('Hours to look back')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(72)
                ),
                
            new SlashCommandBuilder()
                .setName('reboot')
                .setDescription('Reboot the system (admin only)')
        ];
        
        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('Successfully registered application commands');
    } catch (error) {
        console.error('Error registering commands:', error);
        throw error;
    }
}

async function getBotApiToken() {
    try {
        // First check if a valid token exists in the database
        const result = await db.query(
            'SELECT token FROM bot_tokens WHERE bot_id = $1 AND expires_at > NOW()',
            ['discord_bot']
        );
        
        if (result.rows.length > 0) {
            console.log("Using existing bot token from database");
            return result.rows[0].token;
        }
        
        // Try to get a token from the API
        try {
            const apiUrl = process.env.API_URL || 'http://localhost:3000';
            console.log(`Requesting token from: ${apiUrl}/auth/bot-token`);
            
            const response = await axios.post(`${apiUrl}/auth/bot-token`, {
                bot_id: 'discord_bot',
                secret: process.env.BOT_SECRET
            });
            
            if (response.data && response.data.token) {
                console.log("Received new token from API");
                
                // Store the new token
                await db.query(
                    'INSERT INTO bot_tokens (bot_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\') ' +
                    'ON CONFLICT (bot_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL \'7 days\'',
                    ['discord_bot', response.data.token]
                );
                
                return response.data.token;
            }
        } catch (apiError) {
            console.warn('API token request failed, using fallback token generation');
        }
        
        // FALLBACK: Generate our own token if API fails
        console.log("Generating fallback token");
        const fallbackToken = jwt.sign(
            { bot_id: 'discord_bot', role: 'bot' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Store token in database
        await db.query(
            'INSERT INTO bot_tokens (bot_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\') ' +
            'ON CONFLICT (bot_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL \'7 days\'',
            ['discord_bot', fallbackToken]
        );
        
        return fallbackToken;
    } catch (error) {
        console.error('Error in token management:', error);
        throw error;
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

client.login(DISCORD_TOKEN);