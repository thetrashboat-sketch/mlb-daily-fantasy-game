// scripts/admin/correctScore.js
// Usage: node correctScore.js --assignment <assignment_id> --points <fantasy_points> [--summary "<text>"]

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pool from '../../db/pool.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        parsed[key] = args[i + 1];
    }
    return parsed;
}

async function confirm(promptText) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(promptText);
    rl.close();
    return answer.trim().toLowerCase() === 'yes';
}

async function correctScore() {
    const { assignment, points, summary } = parseArgs();

    if (!assignment || points === undefined) {
        console.error('Usage: node correctScore.js --assignment <assignment_id> --points <fantasy_points> [--summary "<text>"]');
        process.exit(1);
    }

    const assignmentId = parseInt(assignment, 10);
    const newPoints = parseFloat(points);

    const { rows } = await pool.query(
        `SELECT ds.assignment_id, ds.fantasy_points, ds.stat_summary, u.username, p.name AS player_name
         FROM daily_scores ds
         JOIN daily_assignments da ON da.id = ds.assignment_id
         JOIN users u ON u.id = da.user_id
         JOIN players p ON p.id = da.player_id
         WHERE ds.assignment_id = $1`,
        [assignmentId]
    );

    if (rows.length === 0) {
        console.error(`[correctScore] No daily_scores row found for assignment_id ${assignmentId}`);
        process.exit(1);
    }

    const row = rows[0];
    console.log(`Assignment ${assignmentId} — ${row.username} / ${row.player_name}`);
    console.log(`Current fantasy_points: ${row.fantasy_points} (${row.stat_summary})`);
    console.log(`New fantasy_points:     ${newPoints}`);
    if (summary !== undefined) {
        console.log(`New stat_summary:       ${summary}`);
    }

    const proceed = await confirm('Type "yes" to apply this correction: ');
    if (!proceed) {
        console.log('[correctScore] Aborted — no changes made.');
        return;
    }

    if (summary !== undefined) {
        await pool.query(
            `UPDATE daily_scores SET fantasy_points = $1, stat_summary = $2, updated_at = NOW() WHERE assignment_id = $3`,
            [newPoints, summary, assignmentId]
        );
    } else {
        await pool.query(
            `UPDATE daily_scores SET fantasy_points = $1, updated_at = NOW() WHERE assignment_id = $2`,
            [newPoints, assignmentId]
        );
    }

    console.log(`[correctScore] Updated assignment ${assignmentId}.`);
}

correctScore()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[correctScore] Failed:', err);
        process.exit(1);
    });