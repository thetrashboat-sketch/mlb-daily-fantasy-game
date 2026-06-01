import cron from 'node-cron';
import { finalizeScores } from './scoring.js';
import { syncPlayers } from './mlb.js';

cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running nightly score finalization...');
    try {
        const result = await finalizeScores();
        console.log('[cron] Score finalization complete:', result);
    } catch (err) {
        console.error('[cron] Score finalization failed:', err.message);
    }
});

console.log('[cron] Score finalization scheduled for 8:00 AM UTC daily')

cron.schedule('0 10 * * *', async () => {
    console.log('[cron] Running scheduled player sync...');
    try {
      const result = await syncPlayers();
      console.log('[cron] Player sync complete:', result);
    } catch (err) {
      console.error('[cron] Player sync failed:', err.message);
    }
});

console.log('[cron] Player Sync scheduled for 10:00 AM UTC daily')
