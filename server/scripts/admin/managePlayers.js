// scripts/admin/managePlayers.js
// Usage: node managePlayers.js list [--filter <name_search>]
//        node managePlayers.js toggle --mlb_id <mlb_id>
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pool from '../../db/pool.js';

function parseArgs() {
    const args = process.argv.slice(3);
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

async function listPlayers() {
    const { filter } = parseArgs();

    const query = filter
        ? `SELECT mlb_id, name, team_abbr, position_abbr, is_active FROM players WHERE name ILIKE $1 ORDER BY name`
        : `SELECT mlb_id, name, team_abbr, position_abbr, is_active FROM players ORDER BY is_active DESC, name`;
    const params = filter ? [`%${filter}%`] : [];

    const { rows } = await pool.query(query, params);

    console.log(`\n${rows.length} players:\n`);
    for (const r of rows) {
        const status = r.is_active ? 'active  ' : 'inactive';
        console.log(`[${status}] ${String(r.mlb_id).padEnd(8)} ${r.name.padEnd(25)} ${r.team_abbr.padEnd(5)} ${r.position_abbr ?? ''}`);
    }
}

async function togglePlayer() {
    const { mlb_id } = parseArgs();
    if (!mlb_id) {
        console.error('Usage: node managePlayers.js toggle --mlb_id <mlb_id>');
        process.exit(1);
    }

    const { rows } = await pool.query(
        `SELECT mlb_id, name, is_active FROM players WHERE mlb_id = $1`,
        [parseInt(mlb_id, 10)]
    );

    if (rows.length === 0) {
        console.error(`[managePlayers] No player found with mlb_id ${mlb_id}`);
        process.exit(1);
    }

    const player = rows[0];
    const newStatus = !player.is_active;

    console.log(`${player.name} (mlb_id ${player.mlb_id})`);
    console.log(`Current: ${player.is_active ? 'active' : 'inactive'} -> New: ${newStatus ? 'active' : 'inactive'}`);
    console.log(`Note: this may be overwritten by the next player sync if the player is still on an active MLB roster.`);

    const proceed = await confirm('Type "yes" to apply this change: ');
    if (!proceed) {
        console.log('[managePlayers] Aborted — no changes made.');
        return;
    }

    await pool.query(
        `UPDATE players SET is_active = $1, updated_at = NOW() WHERE mlb_id = $2`,
        [newStatus, player.mlb_id]
    );

    console.log(`[managePlayers] ${player.name} is now ${newStatus ? 'active' : 'inactive'}.`);
}

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'list':
            await listPlayers();
            break;
        case 'toggle':
            await togglePlayer();
            break;
        default:
            console.error('Usage: node managePlayers.js <list|toggle> [options]');
            process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[managePlayers] Failed:', err);
        process.exit(1);
    });