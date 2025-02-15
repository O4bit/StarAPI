require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const mariadb = require('mariadb');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await clearCommands();
    await registerCommands();
});

client.on('interactionCreate', async interaction => {
    console.log(`Received interaction: ${interaction.commandName}`);
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'status') {
        await interaction.deferReply();
        console.log('Fetching server status');
        try {
            const status = await getServerStatus();
            await interaction.editReply({ embeds: [status] });
        } catch (error) {
            console.error(`Error fetching server status: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    } else if (commandName === 'reboot') {
        await interaction.deferReply();
        console.log('Rebooting server');
        try {
            const message = await rebootServer();
            await interaction.editReply(message);
        } catch (error) {
            console.error(`Error rebooting server: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    } else if (commandName === 'logs') {
        await interaction.deferReply();
        console.log('Fetching server logs');
        try {
            const logsUrl = await getServerLogs();
            await interaction.editReply(`Logs URL: ${logsUrl}`);
        } catch (error) {
            console.error(`Error fetching server logs: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    } else if (commandName === 'console') {
        await interaction.deferReply();
        const command = interaction.options.getString('command');
        console.log(`Executing command: ${command}`);
        try {
            const response = await axios.post(`${API_URL}/execute`, { command }, {
                headers: { 'x-bot-token': await getBotToken() }
            });
            await interaction.editReply(`\`\`\`${response.data.output}\`\`\``);
        } catch (error) {
            console.error(`Error executing command: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    } else if (commandName === 'website') {
        await interaction.deferReply();
        const url = interaction.options.getString('url');
        console.log(`Checking website status: ${url}`);
        try {
            const response = await axios.get(`${API_URL}/websiteStatus`, {
                headers: { 'x-bot-token': await getBotToken() },
                params: { url }
            });
            await interaction.editReply(`Website status: ${response.data.status}, Status code: ${response.data.statusCode}`);
        } catch (error) {
            console.error(`Error checking website status: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
});

async function getServerStatus() {
    try {
        const response = await axios.get(`${API_URL}/systeminfo`, {
            headers: { 'x-bot-token': await getBotToken() }
        });

        const uptimeResponse = await axios.get(`${API_URL}/health`, {
            headers: { 'x-bot-token': await getBotToken() }
        });

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Server Status')
            .addFields(
                { name: 'CPU', value: `${response.data.cpu.manufacturer} ${response.data.cpu.brand} ${response.data.cpu.speed}GHz (${response.data.cpu.cores} cores)`, inline: true },
                { name: 'RAM', value: `${(response.data.mem.total / 1073741824).toFixed(2)} GB total, ${(response.data.mem.free / 1073741824).toFixed(2)} GB free`, inline: true },
                { name: 'OS', value: `${response.data.osInfo.platform} ${response.data.osInfo.distro} ${response.data.osInfo.release} (Kernel: ${response.data.osInfo.kernel})`, inline: true },
                { name: 'IP Address', value: response.data.networkInterfaces[0].ip4, inline: true },
                { name: 'CPU Load', value: `${response.data.currentLoad.currentLoad.toFixed(2)}%`, inline: true },
                { name: 'Uptime', value: uptimeResponse.data.uptime, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Server Status' });

        return embed;
    } catch (error) {
        console.error(`Error getting server status: ${error.message}`);
        return new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Server Status')
            .setDescription('Server is down!')
            .setTimestamp()
            .setFooter({ text: 'Server Status' });
    }
}

async function rebootServer() {
    try {
        const response = await axios.post(`${API_URL}/reboot`, {}, {
            headers: { 'x-bot-token': await getBotToken() }
        });
        return response.data.message;
    } catch (error) {
        console.error(`Error rebooting server: ${error.message}`);
        return 'Failed to reboot the server!';
    }
}

async function getServerLogs() {
    try {
        const response = await axios.get(`${API_URL}/logs`, {
            headers: { 'x-bot-token': await getBotToken() }
        });
        return response.data.url;
    } catch (error) {
        console.error(`Error getting server logs: ${error.message}`);
        return 'Failed to retrieve logs!';
    }
}

async function getBotToken() {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT token FROM bot_tokens WHERE id = 1");
        return rows[0].token;
    } catch (err) {
        console.error(`Error fetching bot token: ${err.message}`);
        throw new Error('Failed to fetch bot token');
    } finally {
        if (conn) conn.release();
    }
}

async function clearCommands() {
    const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    try {
        console.log('Started clearing application (/) commands.');

        const commands = await rest.get(
            Routes.applicationCommands(CLIENT_ID)
        );

        for (const command of commands) {
            await rest.delete(
                Routes.applicationCommand(CLIENT_ID, command.id)
            );
        }

        console.log('Successfully cleared application (/) commands.');
    } catch (error) {
        console.error(`Error clearing commands: ${error.message}`);
    }
}

async function registerCommands() {
    const commands = [
        {
            name: 'status',
            description: 'Get the server status'
        },
        {
            name: 'reboot',
            description: 'Reboot the server'
        },
        {
            name: 'logs',
            description: 'Get the server logs'
        },
        {
            name: 'console',
            description: 'Execute a command on the server',
            options: [
                {
                    name: 'command',
                    type: 3, // STRING
                    description: 'The command to execute',
                    required: true
                }
            ]
        },
        {
            name: 'website',
            description: 'Check the status of a website',
            options: [
                {
                    name: 'url',
                    type: 3, // STRING
                    description: 'The URL of the website to check',
                    required: true
                }
            ]
        }
    ];

    const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // Register global commands
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(`Error registering commands: ${error.message}`);
    }
}

client.login(DISCORD_TOKEN);