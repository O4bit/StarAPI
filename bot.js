require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const API_URL = process.env.API_URL;
const CHECK_INTERVAL = 60000; // Check every 60 seconds
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    registerCommands();
    monitorServer();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'verify') {
        await interaction.deferReply();
        const token = interaction.options.getString('token');
        try {
            const response = await verifyToken(token);
            if (response.verified) {
                const guild = client.guilds.cache.get(GUILD_ID);
                const member = await guild.members.fetch(interaction.user.id);
                const role = guild.roles.cache.get(VERIFIED_ROLE_ID);
                if (role) {
                    await member.roles.add(role);
                    await interaction.editReply('You have been verified and given access.');
                } else {
                    await interaction.editReply('Role not found.');
                }
            } else {
                await interaction.editReply('Invalid token. Verification failed.');
            }
        } catch (error) {
            await interaction.editReply(`Error: ${error.message}`);
        }
    } else {
        // Check if the user has the verified role
        const guild = client.guilds.cache.get(GUILD_ID);
        const member = await guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(VERIFIED_ROLE_ID)) {
            await interaction.reply('You do not have the verified role to use this command.');
            return;
        }

        // Handle other commands
        if (commandName === 'status') {
            await interaction.deferReply();
            const status = await getServerStatus();
            await interaction.editReply({ embeds: [status] });
        } else if (commandName === 'reboot') {
            await interaction.deferReply();
            const response = await rebootServer();
            await interaction.editReply(response);
        } else if (commandName === 'logs') {
            await interaction.deferReply();
            const logs = await getServerLogs();
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Server Logs')
                .setDescription(`Logs from the last hour: [View Logs](${logs})`)
                .setTimestamp()
                .setFooter({ text: 'Logs from the last hour' });
            await interaction.editReply({ embeds: [embed] });
        } else if (commandName === 'console') {
            await interaction.deferReply();
            const command = interaction.options.getString('command');
            try {
                const output = await executeCommand(command);
                await sendLongMessage(interaction, output);
            } catch (error) {
                await interaction.editReply(`Error: ${error.message}`);
            }
        }
    }
});

async function monitorServer() {
    setInterval(async () => {
        const status = await getServerStatus();
        if (status.description && status.description.includes('down')) {
            const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
            if (channel) {
                channel.send({ embeds: [status] });
            }
        }
    }, CHECK_INTERVAL);
}

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
        return 'Failed to retrieve logs!';
    }
}

async function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function sendLongMessage(interaction, message) {
    const maxLength = 2000;
    if (message.length <= maxLength) {
        await interaction.editReply(message);
    } else {
        const parts = message.match(new RegExp(`.{1,${maxLength}}`, 'g'));
        for (const part of parts) {
            await interaction.followUp(part);
        }
    }
}

async function verifyToken(token) {
    try {
        const response = await axios.post(`${API_URL}/verify`, { token }, {
            headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
        });
        return response.data;
    } catch (error) {
        throw new Error('Verification failed.');
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
            name: 'verify',
            description: 'Verify your account with a bearer token',
            options: [
                {
                    name: 'token',
                    type: 3, // STRING
                    description: 'The bearer token',
                    required: true
                }
            ]
        }
    ];

    const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

client.login(DISCORD_TOKEN);