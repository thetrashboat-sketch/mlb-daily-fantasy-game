import pool from '../db/pool.js';

const ALLOWED_SORTS = {
    date_desc: 'da.assigned_date DESC',
    date_asc: 'da.assigned_date ASC',
    points_desc: 'ds.fantasy_points DESC',
    points_asc: 'ds.fantasy_points ASC',
};

const PAGE_SIZE = 20;

export async function getUserHistory(req, res) {
    const { userId } = req.params;
    const { season, playerId, sort = 'date_desc', page = 1 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const offset = (pageNum - 1) * PAGE_SIZE;
    const orderBy = ALLOWED_SORTS[sort] ?? ALLOWED_SORTS.date_desc;

    const conditions = [`da.user_id = $1`, `ds.is_finalized = TRUE`];
    const params = [userId];

    if (season) {
        params.push(parseInt(season, 10));
        conditions.push(`EXTRACT(YEAR FROM da.assigned_date) = $${params.length}`);
    }

    if (playerId) {
        params.push(parseInt(playerId, 10));
        conditions.push(`da.player_id = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const { rows } = await pool.query(
        `
        SELECT
            da.id AS assignment_id,
            da.assigned_date,
            p.mlb_id AS player_mlb_id,
            p.name AS player_name,
            p.team_abbr,
            ds.fantasy_points,
            ds.stat_summary,
            ds.multiplier_applied,
            COALESCE(
                json_agg(
                    json_build_object('key', ach.key, 'name', ach.name, 'rarity', ach.rarity)
                ) FILTER (WHERE ach.id IS NOT NULL),
                '[]'
            ) AS achievements
        FROM daily_assignments da
        JOIN players p ON p.id = da.player_id
        JOIN daily_scores ds ON ds.assignment_id = da.id
        LEFT JOIN user_achievements ua ON ua.assignment_id = da.id
        LEFT JOIN achievements ach ON ach.id = ua.achievement_id
        WHERE ${whereClause}
        GROUP BY da.id, da.assigned_date, p.mlb_id, p.name, p.team_abbr, ds.fantasy_points, ds.stat_summary, ds.multiplier_applied
        ORDER BY ${orderBy}
        LIMIT ${PAGE_SIZE} OFFSET $${params.length + 1}
        `,
        [...params, offset]
    );

    const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) AS total
         FROM daily_assignments da
         JOIN daily_scores ds ON ds.assignment_id = da.id
         WHERE ${whereClause}`,
        params
    );

    res.json({
        history: rows,
        total: parseInt(countRows[0].total, 10),
        page: pageNum,
        pageSize: PAGE_SIZE,
    });
}