-- Up Migration
ALTER TABLE user_achievements
  ADD COLUMN times_earned INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN notified BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
ALTER TABLE user_achievements
  DROP COLUMN times_earned,
  DROP COLUMN notified;