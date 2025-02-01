require('dotenv').config();
const { exec } = require('child_process'); // Import exec
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const API_URL = process.env.API_URL;
const CHECK_INTERVAL = 60000; // Check every 60 seconds
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await clearCommands();
    await registerCommands();
    monitorServer();
});

client.on('interactionCreate', async interaction => {
    console.log(`Received interaction: ${interaction.commandName}`);
    if (!interaction.isCommand() && !interaction.isButton()) return;

    const { commandName } = interaction;

    if (interaction.isCommand()) {
        if (commandName === 'verify') {
            await interaction.deferReply();
            const token = interaction.options.getString('token');
            console.log(`Verifying token: ${token}`);
            try {
                const response = await verifyToken(token);
                if (response.verified) {
                    const guild = client.guilds.cache.get(interaction.guildId);
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
                console.error(`Error verifying token: ${error.message}`);
                await interaction.editReply(`Error: ${error.message}`);
            }
        } else if (commandName === 'neofetch') {
            await interaction.deferReply();
            console.log('Running neofetch command');
            try {
                const response = await axios.get(`${API_URL}/neofetch`, {
                    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
                });
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Neofetch')
                    .setDescription(`\`\`\`${response.data.output}\`\`\``)
                    .setTimestamp()
                    .setFooter({ text: 'Neofetch Output' });

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error(`Error running neofetch: ${error.message}`);
                await interaction.editReply(`Error: ${error.message}`);
            }
        } else if (commandName === 'tokens') {
            await interaction.deferReply();
            console.log('Fetching tokens');
            try {
                const response = await axios.get(`${API_URL}/tokens`, {
                    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
                });
                const tokens = response.data.tokens;

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Token Management')
                    .setDescription('List of tokens with options to delete or lock.');

                const rows = tokens.map(token => {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`delete_${token.id}`)
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`lock_${token.id}`)
                            .setLabel('Lock')
                            .setStyle(ButtonStyle.Secondary)
                    );
                });

                await interaction.editReply({ embeds: [embed], components: rows });
            } catch (error) {
                console.error(`Error fetching tokens: ${error.message}`);
                await interaction.editReply(`Error: ${error.message}`);
            }
        } else if (commandName === 'status') {
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
                const output = await executeCommand(command);
                await sendLongMessage(interaction, `\`\`\`${output}\`\`\``);
            } catch (error) {
                console.error(`Error executing command: ${error.message}`);
                await interaction.editReply(`Error: ${error.message}`);
            }
        }
    } else if (interaction.isButton()) {
        const [action, tokenId] = interaction.customId.split('_');
        console.log(`Button action: ${action}, tokenId: ${tokenId}`);

        if (action === 'delete') {
            try {
                await axios.delete(`${API_URL}/tokens/${tokenId}`, {
                    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
                });
                await interaction.reply(`Token ${tokenId} deleted successfully.`);
            } catch (error) {
                console.error(`Error deleting token: ${error.message}`);
                await interaction.reply(`Error deleting token: ${error.message}`);
            }
        } else if (action === 'lock') {
            try {
                await axios.patch(`${API_URL}/tokens/${tokenId}/lock`, {}, {
                    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` }
                });
                await interaction.reply(`Token ${tokenId} locked successfully.`);
            } catch (error) {
                console.error(`Error locking token: ${error.message}`);
                await interaction.reply(`Error locking token: ${error.message}`);
            }
        }
    }
});

async function monitorServer() {
    setInterval(async () => {
        console.log('Checking server status');
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

async function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${stderr}`);
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
        console.error(`Error verifying token: ${error.message}`);
        throw new Error('Verification failed.');
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
        },
        {
            name: 'neofetch',
            description: 'Run neofetch and display the output'
        },
        {
            name: 'tokens',
            description: 'Manage tokens'
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