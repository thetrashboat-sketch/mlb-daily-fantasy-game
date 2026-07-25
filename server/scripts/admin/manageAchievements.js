// scripts/admin/manageAchievements.js

/*
USAGE:
node manageAchievements.js list
node manageAchievements.js toggle --key grand_salami
node manageAchievements.js edit --key hbp --description "Your hitter got plunked" --rarity Rare

NOTE: trigger_conditions cannot be changed using this script. These must be changed with using a manual migration
*/
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import pool from '../../db/pool.js';

function parseArgs() {
    const args = process.argv.slice(3); // command is argv[2]
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

async function listAchievements() {
    const { rows } = await pool.query(
        `SELECT key, name, rarity, category, is_active FROM achievements ORDER BY category, rarity, key`
    );

    console.log(`\n${rows.length} achievements:\n`);
    for (const r of rows) {
        const status = r.is_active ? 'active  ' : 'inactive';
        console.log(`[${status}] ${r.key.padEnd(25)} ${r.name.padEnd(30)} ${r.rarity.padEnd(10)} ${r.category}`);
    }
}

async function toggleAchievement() {
    const { key } = parseArgs();
    if (!key) {
        console.error('Usage: node manageAchievements.js toggle --key <achievement_key>');
        process.exit(1);
    }

    const { rows } = await pool.query(
        `SELECT key, name, is_active FROM achievements WHERE key = $1`,
        [key]
    );

    if (rows.length === 0) {
        console.error(`[manageAchievements] No achievement found with key "${key}"`);
        process.exit(1);
    }

    const achievement = rows[0];
    const newStatus = !achievement.is_active;

    console.log(`${achievement.name} (${achievement.key})`);
    console.log(`Current: ${achievement.is_active ? 'active' : 'inactive'} -> New: ${newStatus ? 'active' : 'inactive'}`);

    const proceed = await confirm('Type "yes" to apply this change: ');
    if (!proceed) {
        console.log('[manageAchievements] Aborted — no changes made.');
        return;
    }

    await pool.query(`UPDATE achievements SET is_active = $1 WHERE key = $2`, [newStatus, key]);
    console.log(`[manageAchievements] ${achievement.key} is now ${newStatus ? 'active' : 'inactive'}.`);
}

async function editAchievement() {
    const { key, name, description, rarity, category } = parseArgs();

    if (!key) {
        console.error('Usage: node manageAchievements.js edit --key <achievement_key> [--name "..."] [--description "..."] [--rarity "..."] [--category "..."]');
        process.exit(1);
    }

    const { rows } = await pool.query(`SELECT * FROM achievements WHERE key = $1`, [key]);
    if (rows.length === 0) {
        console.error(`[manageAchievements] No achievement found with key "${key}"`);
        process.exit(1);
    }

    const current = rows[0];
    const updated = {
        name: name ?? current.name,
        description: description ?? current.description,
        rarity: rarity ?? current.rarity,
        category: category ?? current.category,
    };

    console.log(`Editing ${current.key}:`);
    for (const field of ['name', 'description', 'rarity', 'category']) {
        if (updated[field] !== current[field]) {
            console.log(`  ${field}: "${current[field]}" -> "${updated[field]}"`);
        }
    }

    const proceed = await confirm('Type "yes" to apply these changes: ');
    if (!proceed) {
        console.log('[manageAchievements] Aborted — no changes made.');
        return;
    }

    await pool.query(
        `UPDATE achievements SET name = $1, description = $2, rarity = $3, category = $4 WHERE key = $5`,
        [updated.name, updated.description, updated.rarity, updated.category, key]
    );

    console.log(`[manageAchievements] ${key} updated.`);
}

async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'list':
            await listAchievements();
            break;
        case 'toggle':
            await toggleAchievement();
            break;
        case 'edit':
            await editAchievement();
            break;
        default:
            console.error('Usage: node manageAchievements.js <list|toggle|edit> [options]');
            process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[manageAchievements] Failed:', err);
        process.exit(1);
    });