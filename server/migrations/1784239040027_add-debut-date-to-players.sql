-- Up Migration
ALTER TABLE players
  ADD COLUMN debut_date DATE;

-- Down Migration
ALTER TABLE players
  DROP COLUMN debut_date;s