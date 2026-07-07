import 'dotenv/config';
import client from '../services/bot.js';
import { postMiddayUpdate } from '../services/botPosts.js';

await new Promise((resolve, reject) => {
  client.once('ready', resolve);
  client.once('error', reject);
  client.login(process.env.DISCORD_BOT_TOKEN);
});

await postMiddayUpdate();

console.log('[test midday post] done');

process.exit(0);