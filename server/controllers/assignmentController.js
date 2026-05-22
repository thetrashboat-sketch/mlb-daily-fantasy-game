import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';

export async function claimAssignment(req, res) {
    const userId = req.user.id;
    const today = getGameDate();

    const client = await pool.connect();

    try {
        //check if user already has an assigned hitter for today 
        const existing = await client.query(
            `SELECT da.id, p.name, p.team_abbr, p.position, p.headshot_url
            FROM daily_assignments da
            JOIN players p ON p.id = da.player_id
            WHERE da.user_id = $1 AND da.assigned_date = $2`,
            [userId, today]
        );

        if (existing.rows.length > 0){
            return res.status(409).json({ error: 'You have already claimed a hitter today' });

        }

        //pick a random active hitter 
        const playerResult = await client.query(
            `SELECT id, name, team_id, team_name, team_abbr, position, headshot_url
            FROM players
            WHERE is_active = TRUE
            ORDER BY Random()
            Limit 1`
        );

        if (playerResult.rows.length === 0){
            return res.status(503).json({ error: 'No active players available'});
        }

        const player = playerResult.rows[0];

        //store the assignment 
        const assignment = await client.query(
            `INSERT INTO daily_assignments(user_id, player_id, assigned_date)
            VALUES ($1, $2, $3)
            RETURNING id, assigned_date, claimed_at`,
            [userId, player.id, today]
        );

        res.status(201).json({
            assignment_id: assignment.rows[0].id,
            assigned_date: assignment.rows[0].assigned_date,
            claimed_at: assignment.rows[0].claimed_at,
            player: {
                name: player.name,
                team: player.team,
                team_abbr: player.team_abbr,
                position: player.position,
                headshot_url: player.headshot_url,
            },
        });

    } catch(err){
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
            team: row.team,
            team_abbr: row.team_abbr,
            position: row.position,
            headshot_url: row.headshot_url,
        },
    });

    } catch(err){
        console.error('[getAssignment]', err.message);
        res.status(500).json({ error: 'Server error' });   
    }

}