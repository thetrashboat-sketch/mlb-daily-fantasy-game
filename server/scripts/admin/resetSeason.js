// scripts/admin/resetSeason.js
// Usage: node resetSeason.js

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pool from '../../db/pool.js';

async function confirm() {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(
        'This will reset next_day_multiplier to 1.0 for ALL users. Type "yes" to continue: '
    );
    rl.close();
    return answer.trim().toLowerCase() === 'yes';
}

async function resetSeason() {
    const proceed = await confirm();
    if (!proceed) {
        console.log('[resetSeason] Aborted — no changes made.');
        return;
    }

    const { rowCount } = await pool.query(
        `UPDATE users SET next_day_multiplier = 1.0, updated_at = NOW()`
    );

    console.log(`[resetSeason] Reset next_day_multiplier to 1.0 for ${rowCount} users`);
}

resetSeason()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[resetSeason] Failed:', err);
        process.exit(1);
    });