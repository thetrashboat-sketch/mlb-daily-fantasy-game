-- Up Migration
INSERT INTO achievements (key, name, description, rarity, category, trigger_conditions, is_active)
VALUES
  (
    'big_league_knock',
    'Big League Knock',
    'Your hitter recorded at least one hit',
    'Common',
    'batting',
    '{"phase": "finalization", "field": "batting.hits", "op": "gte", "value": 1}',
    TRUE
  ),
  (
    'multi_hit',
    'Multi-Hit',
    'Your hitter recorded 2+ hits in a game',
    'Uncommon',
    'batting',
    '{"phase": "finalization", "field": "batting.hits", "op": "gte", "value": 2}',
    TRUE
  ),
  (
    'hat_trick',
    'Hat Trick',
    'Your hitter recorded 3+ hits in a game',
    'Rare',
    'batting',
    '{"phase": "finalization", "field": "batting.hits", "op": "gte", "value": 3}',
    TRUE
  ),
  (
    'going_deep',
    'Going Deep',
    'Your hitter hit a home run',
    'Rare',
    'batting',
    '{"phase": "finalization", "field": "batting.homeRuns", "op": "gte", "value": 1}',
    TRUE
  ),
  (
    'double_sha_boing_boing',
    'Double Sha-Boing-Boing',
    'Your hitter hit 2+ home runs in a game',
    'Epic',
    'batting',
    '{"phase": "finalization", "field": "batting.homeRuns", "op": "gte", "value": 2}',
    TRUE
  ),
  (
    'triple_sha_boing_boing',
    'Triple Sha-Boing-Boing',
    'Your hitter hit 3+ home runs in a game',
    'Legendary',
    'batting',
    '{"phase": "finalization", "field": "batting.homeRuns", "op": "gte", "value": 3}',
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
WHERE key IN (
  'big_league_knock',
  'multi_hit',
  'hat_trick',
  'going_deep',
  'double_sha_boing_boing',
  'triple_sha_boing_boing'
);