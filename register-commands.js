require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('Error: DISCORD_TOKEN or CLIENT_ID is not defined in your .env file');
    process.exit(1);
}

if (!process.env.BOT_SECRETV2) {
    console.error('Warning: BOT_SECRETV2 is not defined in your .env file');
    console.error('This may cause API authentication issues when the bot is running');
}

if (GUILD_ID && !/^\d+$/.test(GUILD_ID)) {
    console.error('Warning: GUILD_ID appears to be invalid. It should be a numeric ID.');
    console.error('This may cause issues when registering guild-specific commands.');
}

async function registerCommands() {
    try {
        console.log('Setting up slash commands...');
        
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
                .setDescription('Get detailed network information and statistics')
        ];
        
        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
        
        console.log('Clearing global commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] }
        );
        
        if (GUILD_ID) {
            console.log(`Clearing guild commands for guild ID: ${GUILD_ID}...`);
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: [] }
            );
        }
        
        console.log('Registering global commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('Successfully registered application commands globally');
        console.log('Note: Global commands may take up to an hour to propagate to all servers');
    } catch (error) {
        console.error('Error registering commands:', error);
        
        if (error.code === 50035) {
            console.error('\nThis error usually means your GUILD_ID is invalid or not properly set.');
        }
    }
}

registerCommands();