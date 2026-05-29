import pool from '../db/pool.js';
import { getGameDate } from '../../shared/gameDate.js';

export async function getLeaderboard(req, res){
    try {
    const today = getGameDate();
 
    const { rows } = await pool.query(
      `
      SELECT
        u.id                                                          AS user_id,
        u.username,
        COALESCE(
          SUM(ds.fantasy_points) FILTER (WHERE ds.is_finalized),
          0
        )                                                             AS season_total,
        ds_today.fantasy_points                                       AS today_points,
        CASE
          WHEN ds_today.is_finalized = TRUE  THEN 'finalized'
          WHEN a_today.id IS NOT NULL        THEN 'pending'
          ELSE                                    'no_game'
        END                                                           AS today_status
      FROM users u
      LEFT JOIN daily_assignments a ON a.user_id = u.id
      LEFT JOIN daily_scores ds ON ds.assignment_id = a.id
      LEFT JOIN daily_assignments a_today On a_today.user_id = u.id AND a_today.assigned_date = $1
      LEFT JOIN daily_scores ds_today ON ds_today.assignment_id = a_today.id  
      GROUP BY
        u.id,
        u.username,
        ds_today.fantasy_points,
        ds_today.is_finalized,
        a_today.id
      ORDER BY
        season_total DESC,
        u.username   ASC
      `,
      [today]
    );
 
    // Add 1-based rank. Users tied on season_total get the same rank;
    // the next rank skips accordingly (dense rank would also be reasonable —
    // easy to swap out if product preference changes).
    let rank = 0;
    let prevTotal = null;
    let skipped = 0;
 
    const leaderboard = rows.map((row, i) => {
      const total = Number(row.season_total);
      if (total !== prevTotal) {
        rank = rank + 1 + skipped;
        skipped = 0;
        prevTotal = total;
      } else {
        skipped++;
      }
 
      return {
        rank,
        user_id:      row.user_id,
        username:     row.username,
        season_total: total,
        today_points: row.today_points !== null ? Number(row.today_points) : null,
        today_status: row.today_status,
      };
    });
 
    res.json({ leaderboard, as_of: today });
  } catch (err) {
    console.error('[leaderboard] error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}