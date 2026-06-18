import { Client, GatewayIntentBits } from 'discord.js';
import { registerCommands } from './registerCommands.js';
import pool from '../db/pool.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
    console.log(`Bot online: ${client.user.tag}`);
    await registerCommands(process.env.DISCORD_CLIENT_ID);
});

client.on('guildCreate', async (guild) => {
  // insert into discord_servers
  await pool.query(`
    INSERT INTO discord_servers(guild_id, guild_name)
    VALUES ($1, $2)
    `,[guild.id, guild.name])

    console.log(`Registered server: ${guild.name}`);
});

client.on('guildMemberAdd', async (member) => {
    try{
        const user = await pool.query(`
            SELECT id, username, discord_id, discord_username, discord_avatar
            FROM users
            WHERE discord_id = $1
            `, [member.id]);
        
        if (user.rows.length === 0){
            return;
        }

        const server = await pool.query(`
            SELECT id, guild_id, guild_name, channel_id
            FROM discord_servers
            WHERE guild_id = $1
            `, [member.guild.id]);

        if (server.rows.length === 0){
            return;
        }

        await pool.query(`
            INSERT INTO discord_server_members(discord_server_id, user_id)
            VALUES($1, $2)
            ON CONFLICT (discord_server_id, user_id) DO NOTHING
            `, [server.rows[0].id, user.rows[0].id]);

    } catch(err){
        console.error('[member add] ', err.message);
    }
    
});

client.on('interactionCreate', async(interaction) => {
    if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName === 'setchannel') {
            if (!interaction.memberPermissions.has('ManageChannels')) {
                await interaction.reply({
                    content: '❌ You need the **Manage Channels** permission to use this command.',
                    ephemeral: true
                });
                return;
            }

            try {
                await pool.query(`
                    UPDATE discord_servers
                    SET channel_id = $1
                    WHERE guild_id = $2
                `, [interaction.channelId, interaction.guildId]);

                await interaction.reply({
                    content: '✅ Got it! Daily Dinger updates will now be posted in this channel.',
                    ephemeral: true
                });

                await interaction.channel.send('✅ This channel has been set for Daily Dinger bot updates!');
            } catch (err) {
                console.error('[setchannel]', err.message);
                await interaction.reply({
                    content: '❌ Something went wrong. Please try again.',
                    ephemeral: true
                });
            }
        }
});

export default client;