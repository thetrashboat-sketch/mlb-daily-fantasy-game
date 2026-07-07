import cron from 'node-cron';
import { finalizeScores } from './scoring.js';
import { syncPlayers } from './mlb.js';
import { postPicksOpen, postMiddayUpdate, postEveningUpdate } from './botPosts.js';
import { refreshNews } from './news.js';

cron.schedule('0 4 * * *', async () => {
   console.log('[cron] Running Scheduled evening post...');
   try{
        await postEveningUpdate();
   } catch (err){
        console.error('[scheduler] Evening update post failed:', err.message);
   }
}, {timezone: 'UTC'});

cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running nightly score finalization...');
    try {
        const result = await finalizeScores();
        console.log('[cron] Score finalization complete:', result);
    } catch (err) {
        console.error('[cron] Score finalization failed:', err.message);
    }
}, {timezone: 'UTC'});

console.log('[cron] Score finalization scheduled for 8:00 AM UTC daily');

cron.schedule('15 10 * * *', async () => {
    console.log('[cron] Running scheduled player sync...');
    try {
      const result = await syncPlayers();
      console.log('[cron] Player sync complete:', result);
    } catch (err) {
      console.error('[cron] Player sync failed:', err.message);
    }
}, {timezone: 'UTC'});

console.log('[cron] Player Sync scheduled for 10:00 AM UTC daily');

cron.schedule('20 10 * * *', async () => {
    console.log('[cron] Running scheduled morning post');
    try{
        await postPicksOpen();
    } catch(err){
        console.error('[cron] Morning post failed:', err.message);
    }
}, {timezone: 'UTC'});

cron.schedule('0 18 * * *', async () => {
    console.log('[cron] Running Scheduled midday post');
    try{
        await postMiddayUpdate();
    } catch(err){
        console.error('[cron] Midday post failed: ', err.message);
    }
}, {timezone: 'UTC'});

cron.schedule('*/30 * * * *', async () => {
    console.log('[cron] Running refresh news');
    refreshNews();
}, {timezone: 'UTC'});

refreshNews();

console.log('[cron] Morning post scheduled for 10:10 AM UTC daily');

