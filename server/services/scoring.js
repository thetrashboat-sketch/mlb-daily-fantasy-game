import cron from 'node-cron';
import pool from '../db/pool.js';
import { getGameDate } from '../shared/gameDate.js';
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

    // Fetch all unfinalized assignments for the date, with player mlb_id and game_pk
    const { rows: assignments } = await pool.query(
        `SELECT
            da.id            AS assignment_id,
            da.user_id,
            p.mlb_id,
            array_agg(sg.game_pk) AS game_pks,
            u.next_day_multiplier
        FROM daily_assignments da
        JOIN players p             ON p.id = da.player_id
        JOIN scheduled_games sg    ON sg.game_date = da.assigned_date
                                   AND (sg.home_team_id = p.team_id OR sg.away_team_id = p.team_id)
        JOIN users u               ON u.id = da.user_id
        LEFT JOIN daily_scores ds  ON ds.assignment_id = da.id
        WHERE da.assigned_date = $1
          AND (ds.is_finalized IS NULL OR ds.is_finalized = FALSE)
        GROUP BY da.id, da.user_id, p.mlb_id, u.next_day_multiplier`,
        [date]
    );

    if (assignments.length === 0) {
        console.log(`[scoring] No unfinalized assignments found for ${date}.`);
        return { finalized: 0, skipped: 0 };
    }

    console.log(`[scoring] Found ${assignments.length} unfinalized assignments.`);

    // Fetch box scores once per unique game_pk
    const uniqueGamePks = [...new Set(assignments.flatMap((a) => a.game_pk))];
    const boxScores = {};
    const skippedGames = new Set();

    for (const gamePk of uniqueGamePks) {
        try {
            // Verify the game is final before pulling the box score
            const scheduleRes = await fetch(
                `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk=${gamePk}`
            );
            const scheduleData = await scheduleRes.json();
            const gameStatus = scheduleData.dates?.[0]?.games?.[0]?.status?.abstractGameState;

            if (gameStatus !== 'Final') {
                console.warn(`[scoring] Game ${gamePk} is not final (status: ${gameStatus}). Skipping.`);
                skippedGames.add(gamePk);
                continue;
            }

            boxScores[gamePk] = await getBoxScore(gamePk);
        } catch (err) {
            console.error(`[scoring] Failed to fetch box score for game ${gamePk}:`, err.message);
            skippedGames.add(gamePk);
        }
    }

    let finalized = 0;
    let skipped = 0;

    for (const assignment of assignments) {
        const { assignment_id, user_id, mlb_id, game_pk, next_day_multiplier } = assignment;

        if (skippedGames.has(game_pk)) {
            skipped++;
            continue;
        }

        const statsList = assignment.game_pks.map((gamePk) => boxScores[gamePk]?.[mlb_id]);
        const playerStats = mergeStats(statsList);
        const playerPlayed = playerStats != null &&
            playerStats.batting != null &&
            Object.keys(playerStats.batting).length > 0;

        const rawPoints = playerPlayed ? calculateFantasyPoints(playerStats) : 0;

        // Multiplier only applies when the player does NOT play
        const multiplierToApply = playerPlayed ? 1 : next_day_multiplier;
        const fantasyPoints = rawPoints * multiplierToApply;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Write or update the score row
            await client.query(
                `INSERT INTO daily_scores (
                    assignment_id,
                    fantasy_points,
                    multiplier_applied,
                    player_played,
                    is_finalized
                ) VALUES ($1, $2, $3, $4, TRUE)
                ON CONFLICT (assignment_id) DO UPDATE SET
                    fantasy_points     = EXCLUDED.fantasy_points,
                    multiplier_applied = EXCLUDED.multiplier_applied,
                    player_played      = EXCLUDED.player_played,
                    is_finalized       = TRUE`,
                [assignment_id, fantasyPoints, multiplierToApply, playerPlayed]
            );

            // Update the user's next_day_multiplier:
            // - Player played (regardless of points): reset to 1
            // - Player did not play: increment by 1
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

async function mergeStats(statsList){
    const battingFields = [
        'hits', 'doubles', 'triples', 'homeRuns', 'rbi',
        'runs', 'baseOnBalls', 'stolenBases', 'caughtStealing',
        'strikeOuts', 'hitByPitch', 'groundIntoDoublePlay', 'groundIntoTriplePlay'
    ];

    const mergedBatting = {};
    
    for (const field of battingFields) {
        mergedBatting[field] = statsList.reduce((sum, stats) => {
            return sum + (stats.batting?.[field] ?? 0);
        }, 0);
    }

    return {batting: mergedBatting};
}

/**
 * Registers the nightly score finalization cron at 8:00 AM UTC.
 * Mirrors the pattern of scheduleSyncPlayers in mlb.js.
 */
export function scheduleFinalizeScores() {
    cron.schedule('0 8 * * *', async () => {
        console.log('[cron] Running nightly score finalization...');
        try {
            const result = await finalizeScores();
            console.log('[cron] Score finalization complete:', result);
        } catch (err) {
            console.error('[cron] Score finalization failed:', err.message);
        }
    });

    console.log('[cron] Score finalization scheduled for 8:00 AM UTC daily');
}