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
const jwt = require('jsonwebtoken');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const BOT_API_TOKEN = process.env.BOT_SECRETV2;
const ADMIN_IDS = process.env.DISCORD_ADMIN_IDS ? 
    process.env.DISCORD_ADMIN_IDS.split(',') : [];

// Handle Heroku environment - fix API URL configuration
const isHeroku = !!process.env.DYNO;
const API_BASE_URL = process.env.API_URL || (isHeroku 
    ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
    : `http://localhost:${process.env.PORT || 3030}`);

console.log(`Bot starting in ${isHeroku ? 'Heroku' : 'local'} environment`);
console.log(`API Base URL: ${API_BASE_URL}`);

// Only import database-dependent modules if database is available
let logAudit, db;
try {
    if (process.env.DATABASE_URL) {
        logAudit = require('./services/audit-logger').logAudit;
        db = require('./config/database');
    } else {
        // Fallback audit logging when database isn't available
        logAudit = async (userId, action, details) => {
            console.log(`AUDIT: ${userId} - ${action} - ${JSON.stringify(details)}`);
        };
    }
} catch (error) {
    console.warn('Database modules not available, using fallback logging:', error.message);
    logAudit = async (userId, action, details) => {
        console.log(`AUDIT: ${userId} - ${action} - ${JSON.stringify(details)}`);
    };
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    failIfNotExists: false,
    rest: {
        retries: 5,
        timeout: 15000
    }
});

client.on('ready', () => {
    console.log(`Bot is online as ${client.user.tag}!`);
    console.log(`Serving ${client.guilds.cache.size} servers`);
    client.user.setActivity('monitoring systems', { type: 'WATCHING' });
});

client.on('disconnect', (event) => {
    console.error('Bot disconnected from Discord:', event);
    setTimeout(() => {
        console.log('Attempting to reconnect...');
        client.login(DISCORD_TOKEN).catch(err => {
            console.error('Failed to reconnect:', err);
        });
    }, 5000);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
    console.warn('Discord client warning:', warning);
});

client.login(DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        await registerCommands();
        
        await logAudit('system', 'bot-startup', {
            botTag: client.user.tag,
            timestamp: new Date(),
            environment: isHeroku ? 'heroku' : 'local'
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
    
    const hasVerifiedRole = interaction.member && 
        interaction.member.roles && 
        interaction.member.roles.cache.has(process.env.VERIFIED_ROLE_ID);
    
    console.log(`Received command: ${commandName} from user: ${interaction.user.tag}`);

    await logAudit(userId, 'bot-command', {
        command: commandName,
        user: interaction.user.tag,
        isAdmin,
        hasVerifiedRole
    });

    try {
        if ((commandName === 'logs' || commandName === 'console') && !isAdmin && !hasVerifiedRole) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }
        
        if (commandName === 'reboot' && !isAdmin) {
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
            case 'system-info':
                await handleSystemInfo(interaction);
                break;
            case 'network-info':
                await handleNetworkInfo(interaction);
                break;
            case 'console':
                await handleConsole(interaction);
                break;
            default:
                console.log(`Unknown command received: ${commandName}`);
                await interaction.reply({
                    content: `Unknown command: ${commandName}`,
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error(`Error handling command ${commandName}:`, error);
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `An error occurred while processing your command: ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: `An error occurred while processing your command: ${error.message}`
                });
            }
        } catch (replyError) {
            console.error('Failed to reply to interaction:', replyError);
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
        console.log(`Making request to: ${API_BASE_URL}/api/system/health`);
        
        const response = await axios.get(`${API_BASE_URL}/api/system/health`, {
            headers: {
                Authorization: `Bearer ${BOT_API_TOKEN}`,
                'User-Agent': 'StarAPI-Bot/1.0'
            }
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
        
        let errorMessage = 'Failed to retrieve system status';
        if (error.response) {
            errorMessage += ` (Status: ${error.response.status})`;
            if (error.response.status === 403) {
                errorMessage += ' - Authentication failed';
            }
        }
        
        await interaction.editReply(errorMessage);
    }
}

async function handleMetrics(interaction) {
    await interaction.deferReply();
    
    try {
        console.log('Fetching metrics data...');
        const response = await axios.get(`${API_BASE_URL}/api/system/metrics`, {
            headers: { 
                'Authorization': `Bearer ${BOT_API_TOKEN}`,
                'User-Agent': 'StarAPI-Bot/1.0'
            },
            timeout: 8000
        });
        
        console.log('Metrics data received, processing...');
        const data = response.data;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('System Metrics')
            .addFields(
                { 
                    name: 'CPU Usage', 
                    value: data.load && data.load.currentLoad ? 
                        `${data.load.currentLoad.toFixed(2)}%` : 'N/A', 
                    inline: true 
                },
                { 
                    name: 'Memory Used', 
                    value: data.memory && data.memory.used ? 
                        formatBytes(data.memory.used) : 'N/A', 
                    inline: true 
                },
                { 
                    name: 'Memory Total', 
                    value: data.memory && data.memory.total ? 
                        formatBytes(data.memory.total) : 'N/A', 
                    inline: true 
                },
                { 
                    name: 'CPU Temp', 
                    value: data.temperature && data.temperature.main ? 
                        `${data.temperature.main}°C` : 'N/A', 
                    inline: true 
                },
                { 
                    name: 'Disk Usage', 
                    value: data.disk && data.disk[0] && data.disk[0].use ? 
                        `${data.disk[0].use.toFixed(2)}%` : 'N/A', 
                    inline: true 
                },
                { 
                    name: 'Network RX/TX', 
                    value: data.network && data.network[0] ? 
                        `${formatBytes(data.network[0].rx_sec || 0)}/s / ${formatBytes(data.network[0].tx_sec || 0)}/s` : 'N/A', 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'StarAPI Metrics' });
        
        console.log('Sending metrics embed response...');
        await interaction.editReply({ embeds: [embed] });
        console.log('Metrics response sent successfully');
    } catch (error) {
        console.error('Metrics command error:', error);
        await interaction.editReply(`Failed to retrieve system metrics: ${error.message}`);
    }
}

async function handleLogs(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const severity = interaction.options.getString('severity') || 'error';
        const hours = interaction.options.getInteger('hours') || 24;
        
        console.log(`Fetching logs with severity: ${severity}, hours: ${hours}`);
        console.log(`Using API URL: ${API_BASE_URL}/api/logs`);
        
        const botToken = process.env.BOT_SECRETV2;
        if (!botToken) {
            console.error('BOT_SECRETV2 is not defined in environment variables');
            return interaction.editReply('Bot authentication token is missing. Please check server configuration.');
        }
        
        console.log(`Using BOT_SECRETV2 token for authentication`);
        
        const response = await axios.get(`${API_BASE_URL}/api/logs`, {
            params: { severity, hours, limit: 10 },
            headers: { 
                'Authorization': `Bearer ${botToken}`,
                'User-Agent': 'StarAPI-Bot/1.0'
            },
            timeout: 10000
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
        
        let errorMessage = 'Failed to retrieve logs';
        if (error.response) {
            errorMessage += ` (Status: ${error.response.status})`;
            if (error.response.status === 403) {
                errorMessage += ' - Authentication failed. The bot may not have permission to access logs.';
            }
        }
        
        await interaction.editReply(errorMessage);
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
        
        await axios.post(`${API_BASE_URL}/api/system/commands`, 
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
                .setDescription('Reboot the system (admin only)'),
                
            new SlashCommandBuilder()
                .setName('system-info')
                .setDescription('Get detailed system information including OS, CPU, and RAM details'),
                
            new SlashCommandBuilder()
                .setName('network-info')
                .setDescription('Get detailed network information and statistics'),
                
            new SlashCommandBuilder()
                .setName('console')
                .setDescription('Execute system commands (admin only)')
                .addStringOption(option => 
                    option.setName('command')
                        .setDescription('Command to execute')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Disk Usage', value: 'disk-usage' },
                            { name: 'Memory Info', value: 'memory-info' },
                            { name: 'Process List', value: 'process-list' },
                            { name: 'Network Connections', value: 'network-connections' },
                            { name: 'System Uptime', value: 'uptime' },
                            { name: 'CPU Info', value: 'cpu-info' }
                        )
                )
        ];
        
        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Slash commands registered successfully');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

async function getBotApiToken() {
    try {
        const result = await db.query(
            'SELECT token FROM bot_tokens WHERE bot_id = $1 AND expires_at > NOW()',
            ['discord_bot']
        );
        
        if (result.rows.length > 0) {
            console.log("Using existing bot token from database");
            if (result.rows[0].token.includes(':')) {
                console.log("Found old format token, generating new one");
            } else {
                return result.rows[0].token;
            }
        }
        
        console.log("Generating new JWT token");
        
        const payload = { 
            bot_id: 'discord_bot', 
            role: 'bot',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        
        await db.query(
            'INSERT INTO bot_tokens (bot_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\') ' +
            'ON CONFLICT (bot_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL \'7 days\'',
            ['discord_bot', token]
        );
        
        return token;
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

async function handleSystemInfo(interaction) {
    await interaction.deferReply();
    
    try {
        console.log('Fetching system information...');
        const response = await axios.get(`${API_BASE_URL}/api/system/info`, {
            headers: { 
                'Authorization': `Bearer ${BOT_API_TOKEN}`,
                'User-Agent': 'StarAPI-Bot/1.0'
            },
            timeout: 8000
        });
        
        console.log('System info received, processing...');
        const data = response.data;
        
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('System Information')
            .addFields(
                { name: 'Hostname', value: data.hostname || 'N/A', inline: true },
                { name: 'IP Address', value: data.ipAddress || 'N/A', inline: true },
                { name: 'OS', value: `${data.os.distro || 'N/A'} ${data.os.release || ''}`, inline: true },
                { name: 'Kernel', value: data.os.kernel || 'N/A', inline: true },
                { name: 'Architecture', value: data.os.arch || 'N/A', inline: true },
                { name: 'Platform', value: data.os.platform || 'N/A', inline: true },
                { name: 'CPU', value: data.cpu.manufacturer ? `${data.cpu.manufacturer} ${data.cpu.brand}` : 'N/A', inline: true },
                { name: 'CPU Cores', value: `${data.cpu.cores || 'N/A'} (${data.cpu.physicalCores || 'N/A'} physical)`, inline: true },
                { name: 'CPU Speed', value: data.cpu.speed ? `${data.cpu.speed} GHz` : 'N/A', inline: true },
                { name: 'Total RAM', value: data.memory && data.memory.total ? formatBytes(data.memory.total) : 'N/A', inline: true },
                { name: 'System Uptime', value: formatUptime(data.uptime || 0), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'StarAPI System Info' });
        
        await interaction.editReply({ embeds: [embed] });
        console.log('System info response sent successfully');
    } catch (error) {
        console.error('System info command error:', error);
        await interaction.editReply(`Failed to retrieve system information: ${error.message}`);
    }
}

async function handleNetworkInfo(interaction) {
    await interaction.deferReply();
    
    try {
        console.log('Fetching network information...');
        const response = await axios.get(`${API_BASE_URL}/api/system/network`, {
            headers: { 
                'Authorization': `Bearer ${BOT_API_TOKEN}`,
                'User-Agent': 'StarAPI-Bot/1.0'
            },
            timeout: 8000
        });
        
        console.log('Network info received, processing...');
        const data = response.data;
        
        let networkFields = [];
        
        if (data.interfaces && data.interfaces.length > 0) {
            const nonLoopbackInterfaces = data.interfaces.filter(iface => iface.iface !== 'lo');
            
            const limitedInterfaces = nonLoopbackInterfaces.slice(0, 4);
            
            limitedInterfaces.forEach(iface => {
                networkFields.push(
                    { name: `Interface: ${iface.iface}`, value: '\u200B', inline: false },
                    { name: 'IP Address', value: iface.ip4 || 'N/A', inline: true },
                    { name: 'MAC Address', value: iface.mac || 'N/A', inline: true },
                    { name: 'Type', value: iface.type || 'N/A', inline: true },
                    { name: 'Speed', value: iface.speed ? `${iface.speed} Mbps` : 'N/A', inline: true },
                    { name: 'RX/TX (Current)', value: `${formatBytes(iface.rx_sec || 0)}/s / ${formatBytes(iface.tx_sec || 0)}/s`, inline: true }
                );
            });
            
            if (nonLoopbackInterfaces.length > 4) {
                networkFields.push({ 
                    name: 'Note', 
                    value: `Showing ${limitedInterfaces.length} of ${nonLoopbackInterfaces.length} interfaces due to Discord's field limit.`, 
                    inline: false 
                });
            }
        }
        
        if (networkFields.length === 0) {
            networkFields.push({ name: 'Network Interfaces', value: 'No network interfaces found', inline: false });
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('Network Information')
            .addFields(networkFields)
            .setTimestamp()
            .setFooter({ text: 'StarAPI Network Info' });
        
        await interaction.editReply({ embeds: [embed] });
        console.log('Network info response sent successfully');
    } catch (error) {
        console.error('Network info command error:', error);
        await interaction.editReply(`Failed to retrieve network information: ${error.message}`);
    }
}

async function handleConsole(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const command = interaction.options.getString('command');
        
        console.log(`Executing console command: ${command}`);
        
        await logAudit(interaction.user.id, 'console-command', {
            command,
            user: interaction.user.tag,
            channel: interaction.channel.name,
            guild: interaction.guild.name
        });
        
        const response = await axios.post(`${API_BASE_URL}/api/system/commands`, 
            { command },
            { 
                headers: { 
                    'Authorization': `Bearer ${BOT_API_TOKEN}`,
                    'User-Agent': 'StarAPI-Bot/1.0'
                },
                timeout: 10000
            }
        );
        
        const output = response.data.output || 'Command executed successfully';
        const truncatedOutput = output.length > 1900 ? 
            output.substring(0, 1900) + '\n... (output truncated)' : 
            output;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Console Command: ${command}`)
            .setDescription(`\`\`\`\n${truncatedOutput}\n\`\`\``)
            .setTimestamp()
            .setFooter({ text: 'StarAPI Console' });
        
        await interaction.editReply({ embeds: [embed] });
        
        console.log('Console command executed successfully');
    } catch (error) {
        console.error('Console command error:', error);
        
        let errorMessage = 'Failed to execute console command';
        if (error.response) {
            errorMessage += ` (Status: ${error.response.status})`;
            if (error.response.status === 403) {
                errorMessage += ' - Authentication failed';
            } else if (error.response.status === 400) {
                errorMessage += ' - Invalid command';
            }
        }
        
        await interaction.editReply({
            content: errorMessage,
            ephemeral: true
        });
    }
}

// Graceful shutdown for Heroku
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});