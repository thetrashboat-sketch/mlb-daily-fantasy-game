import pool from '../db/pool.js';

const RARITY_ORDER = `CASE a.rarity
    WHEN 'Legendary' THEN 1
    WHEN 'Epic' THEN 2
    WHEN 'Rare' THEN 3
    WHEN 'Uncommon' THEN 4
    WHEN 'Common' THEN 5
    ELSE 6
END`;

export async function getUnnotifiedAchievements (req, res) {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            `UPDATE user_achievements ua
                SET notified = TRUE
                FROM achievements a, daily_assignments da, players p
                WHERE ua.achievement_id = a.id
                AND da.id = ua.assignment_id
                AND p.id = da.player_id
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

export async function getUserAchievements(req, res) {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            `SELECT a.key, a.name, a.description, a.rarity, ua.times_earned, ua.earned_at
             FROM user_achievements ua
             JOIN achievements a ON a.id = ua.achievement_id
             WHERE ua.user_id = $1
             ORDER BY ${RARITY_ORDER}, ua.earned_at DESC`,
            [userId]
        );

        res.json({ achievements: rows });

    } catch (err) {
        console.error('[getUserAchievements]', err.message);
        res.status(500).json({ error: 'Server error' });
    }
}