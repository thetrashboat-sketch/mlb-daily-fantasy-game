import pool from '../db/pool.js';

export async function getUnnotifiedAchievements (req, res) {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            `UPDATE user_achievements ua
             SET notified = TRUE
             FROM achievements a
             JOIN daily_assignments da ON da.id = ua.assignment_id
             JOIN players p ON p.id = da.player_id
             WHERE ua.achievement_id = a.id
               AND ua.user_id = $1
               AND ua.notified = FALSE
             RETURNING
                ua.id AS user_achievement_id,
                ua.assignment_id,
                ua.times_earned,
                ua.earned_at,
                a.key,
                a.name,
                a.description,
                a.rarity,
                p.name AS player_name,
                da.assigned_date`,
            [userId]
        );

        const achievements = rows.map(r => ({
            userAchievementId: r.user_achievement_id,
            assignmentId: r.assignment_id,
            key: r.key,
            name: r.name,
            description: r.description,
            rarity: r.rarity,
            playerName: r.player_name,
            assignedDate: r.assigned_date,
            timesEarned: r.times_earned,
            isReEarn: r.times_earned > 1,
            earnedAt: r.earned_at,
        }));

        res.json({ achievements });

    } catch (err) {
        console.error('[getUnnotifiedAchievements]', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}