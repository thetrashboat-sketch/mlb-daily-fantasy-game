-- mlb-daily-fantasy-game
-- Database schema
-- Run: psql -U youruser -d yourdbname -f server/db/schema.sql

DROP TABLE IF EXISTS discord_server_members CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS daily_scores CASCADE;
DROP TABLE IF EXISTS daily_assignments CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS discord_servers CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  username            VARCHAR(50)  NOT NULL UNIQUE,
  email               VARCHAR(255) UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  discord_id          VARCHAR(50)  UNIQUE,
  discord_username    VARCHAR(100),
  discord_avatar      VARCHAR(255),
  next_day_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE players (
  id             SERIAL PRIMARY KEY,
  mlb_id         INTEGER      NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  team_name      VARCHAR(100) NOT NULL,
  team_id        INTEGER, 
  team_abbr      VARCHAR(10)  NOT NULL,
  position       VARCHAR(50)  NOT NULL,
  position_abbr  VARCHAR(5),
  jersey_number  VARCHAR(5),
  dob            DATE,
  headshot_url   VARCHAR(500),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE discord_servers (
  id          SERIAL PRIMARY KEY,
  guild_id    VARCHAR(50)  NOT NULL UNIQUE,
  guild_name  VARCHAR(100) NOT NULL,
  channel_id  VARCHAR(50),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_assignments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users(id),
  player_id     INTEGER     NOT NULL REFERENCES players(id),
  assigned_date DATE        NOT NULL,
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, assigned_date)
);

CREATE TABLE daily_scores (
  id                 SERIAL PRIMARY KEY,
  assignment_id      INTEGER      NOT NULL UNIQUE REFERENCES daily_assignments(id),
  at_bats            INTEGER      NOT NULL DEFAULT 0,
  hits               INTEGER      NOT NULL DEFAULT 0,
  doubles            INTEGER      NOT NULL DEFAULT 0,
  triples            INTEGER      NOT NULL DEFAULT 0,
  home_runs          INTEGER      NOT NULL DEFAULT 0,
  rbi                INTEGER      NOT NULL DEFAULT 0,
  runs               INTEGER      NOT NULL DEFAULT 0,
  walks              INTEGER      NOT NULL DEFAULT 0,
  strikeouts         INTEGER      NOT NULL DEFAULT 0,
  stolen_bases       INTEGER      NOT NULL DEFAULT 0,
  caught_stealing    INTEGER      NOT NULL DEFAULT 0,
  hit_by_pitch       INTEGER      NOT NULL DEFAULT 0,
  gidp               INTEGER      NOT NULL DEFAULT 0,
  left_on_base       INTEGER      NOT NULL DEFAULT 0,
  fantasy_points     DECIMAL(8,2) NOT NULL DEFAULT 0,
  multiplier_applied DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  player_played      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_finalized       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
  id                 SERIAL PRIMARY KEY,
  key                VARCHAR(100) NOT NULL UNIQUE,
  name               VARCHAR(100) NOT NULL,
  description        TEXT         NOT NULL,
  rarity             VARCHAR(20)  NOT NULL,
  category           VARCHAR(50)  NOT NULL,
  trigger_conditions JSONB        NOT NULL,
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER     NOT NULL REFERENCES users(id),
  achievement_id INTEGER     NOT NULL REFERENCES achievements(id),
  assignment_id  INTEGER     REFERENCES daily_assignments(id),
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE discord_server_members (
  id                SERIAL PRIMARY KEY,
  discord_server_id INTEGER     NOT NULL REFERENCES discord_servers(id),
  user_id           INTEGER     NOT NULL REFERENCES users(id),
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(discord_server_id, user_id)
);

CREATE TABLE scheduled_games (
    id SERIAL PRIMARY KEY,
    game_date DATE NOT NULL,
    game_pk INTEGER NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(game_date, game_pk)
);

CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_players_mlb_id ON players(mlb_id);
CREATE INDEX idx_daily_assignments_user_id ON daily_assignments(user_id);
CREATE INDEX idx_daily_assignments_assigned_date ON daily_assignments(assigned_date);
CREATE INDEX idx_daily_scores_assignment_id ON daily_scores(assignment_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_discord_server_members_user_id ON discord_server_members(user_id);
CREATE INDEX idx_scheduled_games_game_date ON scheduled_games(game_date);