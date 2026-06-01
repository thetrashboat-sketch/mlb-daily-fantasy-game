import { Client, GatewayIntentBits } from 'discord.js';
import pool from '../db/pool.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log(`Bot online: ${client.user.tag}`);
});

client.on('guildCreate', async (guild) => {
  // insert into discord_servers
  await pool.query(`
    INSERT INTO discord_servers(guild_id, guild_name)
    VALUES ($1, $2)
    `,[guild.id, guild.name])

    console.log(`Registered server: ${guild.name}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

export default client;