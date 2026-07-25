// scripts/admin/reassignPlayer.js
// Usage: node reassignPlayer.js --assignment <assignment_id> --player <new_player_id>

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

async function reassignPlayer() {
    const { assignment, player } = parseArgs();

    if (!assignment || !player) {
        console.error('Usage: node reassignPlayer.js --assignment <assignment_id> --player <new_player_id>');
        process.exit(1);
    }

    const assignmentId = parseInt(assignment, 10);
    const newPlayerId = parseInt(player, 10);

    const { rows: assignmentRows } = await pool.query(
        `SELECT da.id, da.assigned_date, u.username, p.id AS current_player_id, p.name AS current_player_name
         FROM daily_assignments da
         JOIN users u ON u.id = da.user_id
         JOIN players p ON p.id = da.player_id
         WHERE da.id = $1`,
        [assignmentId]
    );

    if (assignmentRows.length === 0) {
        console.error(`[reassignPlayer] No assignment found with id ${assignmentId}`);
        process.exit(1);
    }

    const assignmentRow = assignmentRows[0];

    const { rows: scoreRows } = await pool.query(
        `SELECT id FROM daily_scores WHERE assignment_id = $1`,
        [assignmentId]
    );

    if (scoreRows.length > 0) {
        console.error(
            `[reassignPlayer] Assignment ${assignmentId} already has a daily_scores row — ` +
            `this script only handles reassignment before scores exist. Aborting.`
        );
        process.exit(1);
    }

    const { rows: newPlayerRows } = await pool.query(
        `SELECT id, name FROM players WHERE id = $1`,
        [newPlayerId]
    );

    if (newPlayerRows.length === 0) {
        console.error(`[reassignPlayer] No player found with id ${newPlayerId}`);
        process.exit(1);
    }

    const newPlayerRow = newPlayerRows[0];

    console.log(`Assignment ${assignmentId} — ${assignmentRow.username}, ${assignmentRow.assigned_date}`);
    console.log(`Current player: ${assignmentRow.current_player_name} (id ${assignmentRow.current_player_id})`);
    console.log(`New player:     ${newPlayerRow.name} (id ${newPlayerRow.id})`);

    const proceed = await confirm('Type "yes" to apply this reassignment: ');
    if (!proceed) {
        console.log('[reassignPlayer] Aborted — no changes made.');
        return;
    }

    await pool.query(
        `UPDATE daily_assignments SET player_id = $1 WHERE id = $2`,
        [newPlayerId, assignmentId]
    );

    console.log(`[reassignPlayer] Assignment ${assignmentId} reassigned to ${newPlayerRow.name}.`);
}

reassignPlayer()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[reassignPlayer] Failed:', err);
        process.exit(1);
    });