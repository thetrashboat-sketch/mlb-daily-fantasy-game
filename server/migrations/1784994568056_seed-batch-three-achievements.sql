-- Up Migration
INSERT INTO achievements (key, name, description, rarity, category, trigger_conditions, is_active)
        VALUES
            (
                'lets_score',
                'Let''s Score!',
                'Your hitter scored a run',
                'Common',
                'batting',
                '{"phase": "finalization", "field": "batting.runs", "op": "gte", "value": 1}',
                TRUE
            ),
            (
                'multi_run',
                'Multi-Run',
                'Your hitter scored 2+ runs in a game',
                'Uncommon',
                'batting',
                '{"phase": "finalization", "field": "batting.runs", "op": "gte", "value": 2}',
                TRUE
            ),
            (
                'busy_day',
                'Busy Day',
                'Your hitter scored 3+ runs in a game',
                'Rare',
                'batting',
                '{"phase": "finalization", "field": "batting.runs", "op": "gte", "value": 3}',
                TRUE
            ),
            (
                'hbp',
                'HBP',
                'Your hitter was hit by a pitch',
                'Uncommon',
                'batting',
                '{"phase": "finalization", "field": "batting.hitByPitch", "op": "gte", "value": 1}',
                TRUE
            ),
            (
                'he_must_not_like_you',
                'He Must Not Like You',
                'Your hitter was hit by a pitch 2+ in a game',
                'Rare',
                'batting',
                '{"phase": "finalization", "field": "batting.hitByPitch", "op": "gte", "value": 2}',
                TRUE
            ),
            (
                'stolen_goods',
                'Stolen Goods',
                'Your hitter stole a base',
                'Uncommon',
                'batting',
                '{"phase": "finalization", "field": "batting.stolenBases", "op": "gte", "value": 1}',
                TRUE
            ),
            (
                'speed_demon',
                'Speed Demon',
                'Your hitter stole 2 bases in a game',
                'Rare',
                'batting',
                '{"phase": "finalization", "field": "batting.stolenBases", "op": "gte", "value": 2}',
                TRUE
            ),
            (
                'the_rickey',
                'The Rickey',
                'Your hitter stole 3+ bases in a game',
                'Epic',
                'batting',
                '{"phase": "finalization", "field": "batting.stolenBases", "op": "gte", "value": 3}',
                TRUE
            ),
            (
                'caught_stealing',
                'Caught Stealing',
                'Your hitter was caught stealing',
                'Common',
                'batting',
                '{"phase": "finalization", "field": "batting.caughtStealing", "op": "gte", "value": 1}',
                TRUE
            ),
            (
                'gidp',
                'GIDP',
                'Your hitter grounded into a double play',
                'Uncommon',
                'batting',
                '{"phase": "finalization", "field": "batting.groundIntoDoublePlay", "op": "gte", "value": 1}',
                TRUE
            ),
            (
                'pitchers_best_friend',
                'Pitcher''s Best Friend',
                'Your hitter grounded into 2 double plays in a game',
                'Rare',
                'batting',
                '{"phase": "finalization", "field": "batting.groundIntoDoublePlay", "op": "gte", "value": 2}',
                TRUE
            )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category,
  trigger_conditions = EXCLUDED.trigger_conditions,
  is_active = EXCLUDED.is_active;
-- Down Migration
DELETE FROM achievements
WHERE KEY IN (
    'lets_score',
    'multi_run',
    'busy_day',
    'hbp',
    'he_must_not_like_you',
    'stolen_goods',
    'speed_demon',
    'the_rickey',
    'caught_stealing',
    'gidp',
    'pitchers_best_friend'
);