import 'dotenv/config';
import client from '../services/bot.js';
import { postPicksOpen } from '../services/botPosts.js';

await new Promise((resolve, reject) => {
  client.once('ready', resolve);
  client.once('error', reject);
  client.login(process.env.DISCORD_BOT_TOKEN);
});

await postPicksOpen();

console.log('[test morning post] done');

process.exit(0);
