import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';
import { getBoxScore, getSeasonStats, getPlayerHittingHistory, checkAchievements } from '../services/mlb.js';

export async function claimAssignment(req, res) {
    const userId = req.user.id;
    const today = getGameDate();
    console.log('Today: ', today);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        //check if user already has an assigned hitter for today 
        const existing = await client.query(
            `SELECT da.id, p.name, p.team_abbr, p.position, p.headshot_url
            FROM daily_assignments da
            JOIN players p ON p.id = da.player_id
            WHERE da.user_id = $1 AND da.assigned_date = $2`,
            [userId, today]
        );

        if (existing.rows.length > 0){
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'You have already claimed a hitter today' });
        }

        //pick a random active hitter 
        const playerResult = await client.query(
            `SELECT p.id, p.name, p.team_id, p.team_name, p.team_abbr, p.position, p.headshot_url,
            p.mlb_id, p.dob, p.debut_date
            FROM players p
            JOIN scheduled_games sg
                ON p.team_id = sg.home_team_id OR p.team_id = sg.away_team_id 
            WHERE p.is_active = TRUE AND sg.game_date = $1
            ORDER BY Random()
            Limit 1`,
            [today]
        );

        if (playerResult.rows.length === 0){
            await client.query('ROLLBACK');
            return res.status(503).json({ error: 'No active players available'});
        }

        const player = playerResult.rows[0];

        //fetch season stats — best effort, claim should succeed even if this fails
        let seasonStats = null;
        try {
            seasonStats = await getSeasonStats(player.mlb_id);
        } catch (err) {
            console.error('[claimAssignment] season stats fetch failed:', err.message);
        }

        //store the assignment 
        const assignment = await client.query(
            `INSERT INTO daily_assignments(
                user_id, player_id, assigned_date,
                season_ab, season_h, season_hr, season_rbi, season_r, season_ops)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, assigned_date, claimed_at`,
            [
                userId, 
                player.id, 
                today,
                seasonStats?.atBats ?? null,
                seasonStats?.hits ?? null,
                seasonStats?.homeRuns ?? null,
                seasonStats?.rbi ?? null,
                seasonStats?.runs ?? null,
                seasonStats?.ops ?? null,
            ]
        );

        await client.query('COMMIT');

        // Assignment-phase achievement check — best effort, claim already succeeded
        try {
            const { career } = await getPlayerHittingHistory(player.mlb_id);
            const context = {
                mlbId: player.mlb_id,
                date: today,
                dob: player.dob,
                debutDate: player.debut_date,
                careerHitsBeforeToday: career.hits,
                careerHomeRunsBeforeToday: career.homeRuns,
            };
            await checkAchievements('assignment', context, userId, assignment.rows[0].id);
        } catch (err) {
            console.error('[claimAssignment] achievement check failed:', err.message);
        }

        res.status(201).json({
            assignment_id: assignment.rows[0].id,
            assigned_date: assignment.rows[0].assigned_date,
            claimed_at: assignment.rows[0].claimed_at,
            player: {
                name: player.name,
                team_name: player.team_name,
                team_abbr: player.team_abbr,
                position: player.position,
                headshot_url: player.headshot_url,
            },
        });

    } catch(err){
        await client.query('ROLLBACK');
        console.error('[claimAssignment]', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
}

export async function getAssignment(req, res) {
    const userId = req.user.id;
    const today = getGameDate();

    try{
        const result = await pool.query(
            `SELECT da.id, da.assigned_date, da.claimed_at,
            da.season_ab, da.season_h, da.season_hr, da.season_rbi, da.season_r, da.season_ops,
            p.name, p.team_name, p.team_id, p.team_abbr, p.position, p.headshot_url
            FROM daily_assignments da
            JOIN players p ON p.id = da.player_id
            WHERE da.user_id = $1 AND da.assigned_date = $2`,
            [userId, today]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No assignment found for today' });
    }

    const row = result.rows[0];
    res.json({
        assignment_id: row.id,
        assigned_date: row.assigned_date,
        claimed_at: row.claimed_at,
        player: {
            name: row.name,
            team: row.team_name,
            team_abbr: row.team_abbr,
            position: row.position,
            headshot_url: row.headshot_url,
        },
        season_stats: row.season_ab !== null ? {
            ab: row.season_ab,
            h: row.season_h,
            hr: row.season_hr,
            rbi: row.season_rbi,
            r: row.season_r,
            ops: row.season_ops,
        } : null,
    });

    } catch(err){
        console.error('[getAssignment]', err.message);
        res.status(500).json({ error: 'Server error' });   
    }

}

export async function getAssignmentStats(req, res) {
    const userId = req.user.id;
    const today = getGameDate();

    try{
        const result = await pool.query(`
            SELECT p.mlb_id AS player_id, p.team_id, sg.game_pk
            FROM daily_assignments da
            JOIN players p ON p.id = da.player_id
            JOIN scheduled_games sg
                ON sg.game_date = da.assigned_date
                AND (p.team_id = sg.home_team_id OR p.team_id = sg.away_team_id)
            WHERE da.user_id = $1 AND da.assigned_date = $2
            `, [userId, today]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No assignment or game found for today' });
        }

        const { player_id, game_pk } = result.rows[0];

        const boxScoreStats = await getBoxScore(game_pk);
        const playerStats = boxScoreStats[player_id];

        if (!playerStats) {
            return res.status(404).json({ error: 'Stats not yet available for this player' });
        }

        const battingStats = playerStats.batting;

        if (battingStats.atBats === undefined) {
            return res.status(404).json({ error: 'No plate appearances yet today' });
        }

        const avg = battingStats.atBats > 0 ? (battingStats.hits / battingStats.atBats).toFixed(3).replace(/^0/, '') : '.---';

        res.json({ 
            stats: {
                ab: battingStats.atBats,
                h: battingStats.hits,
                hr: battingStats.homeRuns,
                rbi: battingStats.rbi,
                r: battingStats.runs,
                avg,  
            },
        });

    } catch(err){
        console.error('[getAssignmentStats]', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}