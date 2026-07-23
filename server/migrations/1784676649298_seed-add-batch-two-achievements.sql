-- Up Migration
INSERT INTO achievements (key, name, description, rarity, category, trigger_conditions, is_active)
        VALUES
            (
                'leadoff_special',
                'Leadoff Special',
                'Your hitter led off an inning with a hit',
                'Uncommon',
                'situational',
                '{"phase": "finalization", "field": "leadoff.hit", "value": true}',
                TRUE
            ),
            (
                'leadoff_hr',
                'Leadoff HR',
                'Your hitter led off an inning with a home run',
                'Epic',
                'situational',
                '{"phase": "finalization", "field": "leadoff.homeRun", "value": true}',
                TRUE
            ),
            (
                'walkoff_hit',
                'Walkoff Hit',
                'Your hitter made the game winning hit',
                'Rare',
                'situational',
                '{"phase": "finalization", "all": [{"field": "walkoff.happened", "value": true}, {"field": "walkoff.eventType", "op": "in", "value": ["single", "double", "triple", "home_run"]}]}',
                TRUE
            ),
            (
                'walkoff_homer',
                'Walkoff Homer',
                'Your hitter hit a walk off home run',
                'Legendary',
                'situational',
                '{"phase": "finalization", "all": [{"field": "walkoff.happened", "value": true}, {"field": "walkoff.eventType", "value": "home_run"}]}',
                TRUE
            ),
            (
                'walkoff_walk',
                'Walkoff Walk',
                'Your hitter walked to win the game',
                'Epic',
                'situational',
                '{"phase": "finalization", "all": [{"field": "walkoff.happened", "value": true}, {"field": "walkoff.eventType", "value": "walk"}]}',
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
    'leadoff_special',
    'leadoff_hr',
    'walkoff_hit',
    'walkoff_homer',
    'walkoff_walk'
);