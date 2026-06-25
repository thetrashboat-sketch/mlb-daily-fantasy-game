-- Up Migration

ALTER TABLE daily_assignments
  ADD COLUMN season_ab INTEGER,
  ADD COLUMN season_h INTEGER,
  ADD COLUMN season_hr INTEGER,
  ADD COLUMN season_rbi INTEGER,
  ADD COLUMN season_r INTEGER,
  ADD COLUMN season_ops NUMERIC(4,3);

-- Down Migration

ALTER TABLE daily_assignments
  DROP COLUMN season_ab,
  DROP COLUMN season_h,
  DROP COLUMN season_hr,
  DROP COLUMN season_rbi,
  DROP COLUMN season_r,
  DROP COLUMN season_ops;