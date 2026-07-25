-- Up Migration
INSERT INTO achievements (key, name, description, rarity, category, trigger_conditions, is_active)
VALUES
(
    'grand_salami',
    'Grand Salami',
    'Your hitter hit a grand slam',
    'Legendary',
    'batting',
    '{"phase": "finalization", "field": "grandSlam.hit", "op": "eq", "value": true}',
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
  'grand_salami'
);