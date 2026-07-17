import pool from '../db/pool.js'; 

const OPS = {
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  eq: (a, b) => a === b,
};

function getField(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function evaluateCondition(condition, context) {
  if (condition.all) {
    return condition.all.every(c => evaluateCondition(c, context));
  }
  if (condition.any) {
    return condition.any.some(c => evaluateCondition(c, context));
  }
  const value = getField(context, condition.field);
  if (value === undefined) return false; // missing data = condition not met, not an error
  return OPS[condition.op](value, condition.value);
}

export async function getUserAchievement(userId, achievementId) {
  const result = await pool.query(
    `SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2 LIMIT 1`,
    [userId, achievementId]
  );
  return result.rows[0] ?? null;
}

export async function unlockAchievement(userId, achievementId, assignmentId = null) {
  console.log(`Unlocked achievement for ${userId} - ${achievementId}`);//remove this

  await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_id, assignment_id)
     VALUES ($1, $2, $3)`,
    [userId, achievementId, assignmentId]
  );
}

export async function reEarnAchievement(userAchievementId, assignmentId = null) {
  await pool.query(
    `UPDATE user_achievements
     SET times_earned = times_earned + 1,
         notified = FALSE,
         earned_at = NOW(),
         assignment_id = $2
     WHERE id = $1`,
    [userAchievementId, assignmentId]
  );
}

export async function checkAchievements(phase, context, userId, assignmentId = null) {
  const candidates = await pool.query(
    `SELECT * FROM achievements WHERE trigger_conditions->>'phase' = $1 AND is_active = true`,
    [phase]
  );

  for (const achievement of candidates.rows) {
    if (!evaluateCondition(achievement.trigger_conditions, context)) continue;

    const existing = await getUserAchievement(userId, achievement.id);

    if (existing) {
      await reEarnAchievement(existing.id, assignmentId);
    } else {
      await unlockAchievement(userId, achievement.id, assignmentId);
    }
  }
}