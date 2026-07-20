import 'dotenv/config';
import pool from '../db/pool.js';
import { getPlayersBioBatch } from '../services/mlb.js';

async function backfillDebutDates() {
    const { rows } = await pool.query(
        `SELECT mlb_id FROM players WHERE debut_date IS NULL`
    );

    if (rows.length === 0) {
        console.log('[backfillDebutDates] No players need backfilling.');
        return;
    }

    console.log(`[backfillDebutDates] Backfilling ${rows.length} players...`);

    const mlbIds = rows.map(r => r.mlb_id);
    const debutDateMap = await getPlayersBioBatch(mlbIds);

    let updated = 0;
    for (const [mlbId, debutDate] of debutDateMap) {
        if (debutDate === null) continue;
        await pool.query(
            `UPDATE players SET debut_date = $1 WHERE mlb_id = $2`,
            [debutDate, mlbId]
        );
        updated++;
    }

    console.log(`[backfillDebutDates] Done — updated: ${updated}`);
}

backfillDebutDates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[backfillDebutDates] Failed:', err.message);
        process.exit(1);
    });