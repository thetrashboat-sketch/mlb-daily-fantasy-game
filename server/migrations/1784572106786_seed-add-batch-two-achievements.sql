-- Up Migration
INSERT INTO achievements (key, name, description, rarity, category, trigger_conditions, is_active)
VALUES
    (
        'hit_machine',
        'Hit Machine',
        'Your hitter recorded 4 hits or more in a game',
        'Epic',
        'batting',
        '{"phase": "finalization", "field": "batting.hits", "op": "gte", "value": 4}',
        TRUE
    ),
    (
        'perfect_day',
        'Perfect Day',
        'Your hitter got a hit in all his at bats',
        'Epic',
        'batting',
        '{"phase": "finalization", "all": [{"field": "batting.atBats", "op": "gt", "value": 0}, {"field": "batting.hits", "op": "eq", "valueField": "batting.atBats"}]}',
        TRUE
    ),
    (
        'extra_bag',
        'Extra Bag',
        'Your hitter had 2+ extra base hits in a game',
        'Rare',
        'batting',
        '{"phase": "finalization", "field": "batting.extraBaseHits", "op": "gte", "value": 2}',
        TRUE
    ),
    (
        'power_cycle',
        'Power Cycle',
        'Your hitter hit for the cycle',
        'Legendary',
        'batting',
        '{"phase": "finalization", "all": [{"field": "batting.singles", "op": "gte", "value": 1}, {"field": "batting.doubles", "op": "gte", "value": 1}, {"field": "batting.triples", "op": "gte", "value": 1}, {"field": "batting.homeRuns", "op": "gte", "value": 1}]}',
        TRUE
    ),
    (
        'ribby',
        'Ribby',
        'Your hitter drove in at least one run',
        'Common',
        'batting',
        '{"phase": "finalization", "field": "batting.rbi", "op": "gte", "value": 1}',
        TRUE
    ),
    (
        'ribbed_up',
        'Ribbed Up',
        'Your hitter drove in 2 runs',
        'Uncommon',
        'batting',
        '{"phase": "finalization", "field": "batting.rbi", "op": "gte", "value": 2}',
        TRUE
    ),
    (
        'riberino',
        'Riberino',
        'Your hitter drove in 3 runs',
        'Rare',
        'batting',
        '{"phase": "finalization", "field": "batting.rbi", "op": "gte", "value": 3}',
        TRUE
    ),
    (
        'ultimate_run_producer',
        'Ultimate Run Producer',
        'Your hitter drove in at least 4 runs in a game',
        'Epic',
        'batting',
        '{"phase": "finalization", "field": "batting.rbi", "op": "gte", "value": 4}',
        TRUE
    ),
    (
        'eye_of_the_beholder',
        'Eye of the Beholder',
        'Your hitter drew a walk',
        'Common',
        'batting',
        '{"phase": "finalization", "field": "batting.baseOnBalls", "op": "gte", "value": 1}',
        TRUE
    ),
    (
        'patient',
        'Patient',
        'Your hitter drew 2 walks in a game',
        'Uncommon',
        'batting',
        '{"phase": "finalization", "field": "batting.baseOnBalls", "op": "gte", "value": 2}',
        TRUE
    ),
    (
        'the_votto',
        'The Votto',
        'Your hitter drew 3+ walks in a game',
        'Rare',
        'batting',
        '{"phase": "finalization", "field": "batting.baseOnBalls", "op": "gte", "value": 3}',
        TRUE
    ),
    (
        'tripled',
        'Tripled!',
        'Your hitter hit a triple',
        'Rare',
        'batting',
        '{"phase": "finalization", "field": "batting.triples", "op": "gte", "value": 1}',
        TRUE
    ),
    (
        'the_benchwarmer',
        'The Benchwarmer',
        'Your hitter did not play today',
        'Common',
        'batting',
        '{"phase": "finalization", "field": "playerPlayed", "op": "eq", "value": false}',
        TRUE
    ),
    (
        'sombrero',
        'Sombrero',
        'Your Hitter Struck out 3 times in a game',
        'Rare',
        'batting',
        '{"phase": "finalization", "field": "batting.strikeOuts", "op": "gte", "value": 3}',
        TRUE
    ),
    (
        'golden_sombrero',
        'Golden Sombrero',
        'Your hitter struck out 4 times in a game',
        'Epic',
        'batting',
        '{"phase": "finalization", "field": "batting.strikeOuts", "op": "gte", "value": 4}',
        TRUE
    ),
    (
        'platinum_sombrero',
        'Platinum Sombrero',
        'Your hitter struck out 5 times in a game',
        'Legendary',
        'batting',
        '{"phase": "finalization", "field": "batting.strikeOuts", "op": "gte", "value": 5}',
        TRUE
    ),
    (
        'oh_fer',
        'Oh-fer',
        'Your hitter went 0-for-4 or worse with no walks',
        'Common',
        'batting',
        '{"phase": "finalization", "all": [{"field": "batting.hits", "op": "eq", "value": 0}, {"field": "batting.baseOnBalls", "op": "eq", "value": 0}, {"field": "batting.atBats", "op": "gte", "value": 4}]}',
        TRUE
    ),
    (
        'the_immaculate',
        'The Immaculate',
        'Your hitter hit 4 or more home runs in a game',
        'Legendary',
        'batting',
        '{"phase": "finalization", "field": "batting.homeRuns", "op": "gte", "value": 4}',
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
    'hit_machine',
    'perfect_day',
    'extra_bag',
    'power_cycle',
    'ribby',
    'ribbed_up',
    'riberino',
    'ultimate_run_producer',
    'eye_of_the_beholder',
    'patient',
    'the_votto',
    'tripled',
    'the_benchwarmer',
    'sombrero',
    'golden_sombrero',
    'platinum_sombrero',
    'oh_fer',
    'the_immaculate'
);