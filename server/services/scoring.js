import cron from 'node-cron';
import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';
import { getBoxScore, calculateFantasyPoints } from './mlb.js';

const HARD_CUTOFF_HOUR_UTC = 9;
const HARD_CUTOFF_MINUTE_UTC = 30;

/**
 * Finalizes scores for all unfinalized assignments on a given date.
 * Defaults to the current game date if no date is provided.
 * Safe to rerun — uses ON CONFLICT DO UPDATE.
 *
 * @param {string} [dateStr] - ISO date string (YYYY-MM-DD). Defaults to getGameDate().
 * @returns {{ finalized: number, skipped: number }} - Count of finalized and skipped assignments.
 */
export async function finalizeScores(dateStr) {
    const date = dateStr ?? getGameDate();
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    if (
        utcHour > HARD_CUTOFF_HOUR_UTC ||
        (utcHour === HARD_CUTOFF_HOUR_UTC && utcMinute >= HARD_CUTOFF_MINUTE_UTC)
    ) {
        console.warn(
            `[scoring] WARNING: finalizeScores called at or after hard cutoff ` +
            `(${HARD_CUTOFF_HOUR_UTC}:${String(HARD_CUTOFF_MINUTE_UTC).padStart(2, '0')} UTC). ` +
            `Date: ${date}. Proceeding, but verify results manually.`
        );
    }

    console.log(`[scoring] Starting score finalization for ${date}...`);

    const liveScores = await getLiveScoresForDate(date);

    if (liveScores.length === 0) {
        console.log(`[scoring] No assignments found for ${date}.`);
        return { finalized: 0, skipped: 0 };
    }

    console.log(`[scoring] Found ${liveScores.length} assignments.`);

    // Fetch next_day_multiplier for each user
    const userIds = [...new Set(liveScores.map(r => r.user_id))];
    const { rows: userRows } = await pool.query(
        `SELECT id, next_day_multiplier FROM users WHERE id = ANY($1)`,
        [userIds]
    );
    const multiplierMap = Object.fromEntries(userRows.map(u => [u.id, u.next_day_multiplier]));

    let finalized = 0;
    let skipped = 0;

    for (const row of liveScores) {
        const { assignment_id, user_id, points, playerPlayed, game_pks, stat_summary } = row;

        console.log(row);
        const next_day_multiplier = multiplierMap[user_id] ?? 1;
        const multiplierToApply = playerPlayed ? next_day_multiplier : 1;
        const fantasyPoints = points * multiplierToApply;
        const stat_summary_final = stat_summary === '' ? 'DNP' : stat_summary;

        console.log(stat_summary);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO daily_scores (
                    assignment_id,
                    fantasy_points,
                    multiplier_applied,
                    player_played,
                    stat_summary,
                    is_finalized
                ) VALUES ($1, $2, $3, $4, $5, TRUE)
                ON CONFLICT (assignment_id) DO UPDATE SET
                    fantasy_points     = EXCLUDED.fantasy_points,
                    multiplier_applied = EXCLUDED.multiplier_applied,
                    player_played      = EXCLUDED.player_played,
                    stat_summary       = EXCLUDED.stat_summary,
                    is_finalized       = TRUE`,
                [assignment_id, fantasyPoints, multiplierToApply, playerPlayed, stat_summary_final]
            );

            await client.query(
                `UPDATE users
                 SET next_day_multiplier = CASE
                     WHEN $1 THEN 1
                     ELSE next_day_multiplier + 1
                 END
                 WHERE id = $2`,
                [playerPlayed, user_id]
            );

            await client.query('COMMIT');
            finalized++;
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[scoring] Failed to finalize assignment ${assignment_id}:`, err.message);
            skipped++;
        } finally {
            client.release();
        }
    }

    console.log(`[scoring] Done — finalized: ${finalized}, skipped: ${skipped}`);
    return { finalized, skipped };
}

export async function getLiveScoresForDate(dateStr){
    const date = dateStr ?? getGameDate();

    const { rows: assignments } = await pool.query(`
        SELECT
            da.id AS assignment_id,
            da.user_id,
            u.discord_id,
            u.username,
            p.mlb_id,
            p.name AS player_name,
            array_agg(sg.game_pk) AS game_pks
        FROM daily_assignments da
        JOIN players p ON p.id = da.player_id
        JOIN scheduled_games sg ON sg.game_date = da.assigned_date
                                AND (sg.home_team_id = p.team_id OR sg.away_team_id = p.team_id)
        JOIN users u ON u.id = da.user_id
        WHERE da.assigned_date = $1
        GROUP BY da.id, da.user_id, u.discord_id, u.username, p.mlb_id, p.name 
        `, [date]);
        
    if (assignments.length === 0) return [];

    const uniqueGamePks = [...new Set(assignments.flatMap(a => a.game_pks))];
    const boxScores = {};

    for (const gamePk of uniqueGamePks) {
        try {
            boxScores[gamePk] = await getBoxScore(gamePk);
        } catch (err) {
            console.error(`[scoring] Failed to fetch box score for game ${gamePk}:`, err.message);
        }
    }

    return assignments.map(a => {
        const statsList = a.game_pks.map(pk => boxScores[pk]?.[a.mlb_id]);
        const stats = mergeStats(statsList);
        const playerPlayed = stats.batting.atBats > 0 ||
            stats.batting.baseOnBalls > 0 ||
            stats.batting.hitByPitch > 0;
        const points = playerPlayed ? calculateFantasyPoints(stats) : 0;

        return {
            assignment_id: a.assignment_id,
            user_id: a.user_id,
            discord_id: a.discord_id,
            username: a.username,
            player_name: a.player_name,
            game_pks: a.game_pks,
            points,
            playerPlayed,
            stat_summary: stats?.batting?.summary
        };
    });

}

function mergeStats(statsList){
    const battingFields = [
        'atBats','hits', 'doubles', 'triples', 'homeRuns', 'rbi',
        'runs', 'baseOnBalls', 'stolenBases', 'caughtStealing',
        'strikeOuts', 'hitByPitch', 'groundIntoDoublePlay', 'groundIntoTriplePlay'
    ];

    const mergedBatting = {};
    
    for (const field of battingFields) {
        mergedBatting[field] = statsList.reduce((sum, stats) => {
            return sum + (stats?.batting?.[field] ?? 0);
        }, 0);
    }

    const summaries = statsList
        .map(stats => stats?.batting?.summary)
        .filter(Boolean);

    mergedBatting.summary = summaries.join(' | ');

    return {batting: mergedBatting};
}