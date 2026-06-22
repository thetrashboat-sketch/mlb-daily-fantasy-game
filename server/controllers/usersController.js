import pool from '../db/pool.js';

export async function getMe(req, res) {
    try{
        const result = await pool.query(`
            SELECT
                u.username,
                u.created_at,
                u.discord_id,
                COALESCE(SUM(ds.fantasy_points) FILTER (WHERE ds.is_finalized), 0) AS total_points
            FROM users u
            LEFT JOIN daily_assignments da ON da.user_id = u.id
            LEFT JOIN daily_scores ds ON ds.assignment_id = da.id
            WHERE u.id = $1
            GROUP BY u.id, u.username, u.created_at, u.discord_id
            `, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const row = result.rows[0];

        res.json({
            username: row.username,
            created_at: row.created_at,
            discord_linked: row.discord_id !== null,
            total_points: Number(row.total_points),
        });

    } catch(err){
        console.error('[getMe]', err.message);
        res.status(500).json({ error: 'Failed to load user profile' });
    }
}