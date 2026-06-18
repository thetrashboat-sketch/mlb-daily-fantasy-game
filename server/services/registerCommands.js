import { REST, Routes } from 'discord.js';

const commands = [
  {
    name: 'setchannel',
    description: 'Set this channel as the destination for Daily Hitter bot posts',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

export async function registerCommands(clientId) {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('[registerCommands]', err.message);
  }
}