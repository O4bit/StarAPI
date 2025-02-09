require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

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
            const encryptedCommand = encrypt(command);
            const response = await axios.post(`${API_URL}/execute`, { command: encryptedCommand }, {
                headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
            });
            await interaction.editReply(`\`\`\`${response.data.output}\`\`\``);
        } catch (error) {
            console.error(`Error executing command: ${error.message}`);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
});

async function getServerStatus() {
    try {
        const response = await axios.get(`${API_URL}/systeminfo`, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });

        const uptimeResponse = await axios.get(`${API_URL}/health`, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
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
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
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
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });
        return response.data.url;
    } catch (error) {
        console.error(`Error getting server logs: ${error.message}`);
        return 'Failed to retrieve logs!';
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