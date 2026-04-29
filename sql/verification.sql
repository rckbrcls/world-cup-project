SET search_path TO world_cup, public;

-- Operational status
SELECT * FROM fn_synthetic_data_status();

-- Smoke queries for the mandatory reports using dynamic lookup from the active batch
SELECT * FROM fn_list_editions();

SELECT *
FROM fn_list_edition_teams((
    SELECT edition_row.id
    FROM world_cup_edition edition_row
    WHERE edition_row.year = (
        SELECT MIN(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
));

SELECT *
FROM fn_list_edition_groups((
    SELECT edition_row.id
    FROM world_cup_edition edition_row
    WHERE edition_row.year = (
        SELECT MIN(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
));

SELECT *
FROM fn_group_standings((
    SELECT team_group_row.id
    FROM team_group team_group_row
    JOIN world_cup_edition edition_row ON edition_row.id = team_group_row.edition_id
    WHERE edition_row.year = (
        SELECT MIN(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
    ORDER BY team_group_row.group_letter
    LIMIT 1
));

SELECT *
FROM fn_list_edition_matches((
    SELECT edition_row.id
    FROM world_cup_edition edition_row
    WHERE edition_row.year = (
        SELECT MIN(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
));

SELECT *
FROM fn_knockout_path((
    SELECT edition_row.id
    FROM world_cup_edition edition_row
    WHERE edition_row.year = (
        SELECT MAX(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
));

SELECT *
FROM fn_list_team_squad(
    (
        SELECT edition_row.id
        FROM world_cup_edition edition_row
        WHERE edition_row.year = (
            SELECT MAX(edition_year)
            FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
        )
    ),
    (
        SELECT edition_team_row.team_id
        FROM edition_team edition_team_row
        JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
        WHERE edition_row.year = (
            SELECT MAX(edition_year)
            FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
        )
        ORDER BY edition_team_row.final_rank NULLS LAST, edition_team_row.team_id
        LIMIT 1
    )
);

SELECT *
FROM fn_list_match_events((
    SELECT match_row.id
    FROM match_game match_row
    JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
    JOIN edition_phase edition_phase_row ON edition_phase_row.id = match_row.edition_phase_id
    JOIN competition_phase phase_row ON phase_row.id = edition_phase_row.phase_id
    WHERE edition_row.year = (
        SELECT MAX(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
      AND phase_row.code = 'FINAL'
    ORDER BY match_row.kickoff_at DESC
    LIMIT 1
));

SELECT *
FROM fn_top_scorers((
    SELECT edition_row.id
    FROM world_cup_edition edition_row
    WHERE edition_row.year = (
        SELECT MAX(edition_year)
        FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
    )
));

SELECT *
FROM fn_team_history((
    SELECT team_row.id
    FROM team team_row
    WHERE team_row.fifa_code = 'AUR'
));

SELECT fn_validate_generated_sql('SELECT * FROM world_cup.fn_list_editions()');
SELECT fn_validate_generated_sql('SELECT 1');
SELECT fn_validate_generated_sql('WITH cte AS (SELECT 1 AS value) SELECT value FROM cte');
SELECT * FROM fn_list_all_edition_teams();

-- Consistency checks: expect zero rows in the mismatch queries below.

-- Scoreboard versus goal events, including own goals for the benefiting side.
WITH seeded_matches AS (
    SELECT
        match_row.id AS match_id,
        match_row.home_team_id,
        match_row.away_team_id,
        match_row.home_score + match_row.home_extra_score AS expected_home_goals,
        match_row.away_score + match_row.away_extra_score AS expected_away_goals
    FROM match_game match_row
    JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
    WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
),
event_totals AS (
    SELECT
        seeded_matches.match_id,
        SUM(
            CASE
                WHEN event_row.team_id = seeded_matches.home_team_id
                 AND event_row.event_type IN ('GOAL', 'PENALTY_GOAL') THEN 1
                WHEN event_row.team_id = seeded_matches.away_team_id
                 AND event_row.event_type = 'OWN_GOAL' THEN 1
                ELSE 0
            END
        )::BIGINT AS derived_home_goals,
        SUM(
            CASE
                WHEN event_row.team_id = seeded_matches.away_team_id
                 AND event_row.event_type IN ('GOAL', 'PENALTY_GOAL') THEN 1
                WHEN event_row.team_id = seeded_matches.home_team_id
                 AND event_row.event_type = 'OWN_GOAL' THEN 1
                ELSE 0
            END
        )::BIGINT AS derived_away_goals
    FROM seeded_matches
    LEFT JOIN match_event event_row ON event_row.match_id = seeded_matches.match_id
    GROUP BY seeded_matches.match_id
)
SELECT
    seeded_matches.match_id,
    seeded_matches.expected_home_goals,
    COALESCE(event_totals.derived_home_goals, 0) AS derived_home_goals,
    seeded_matches.expected_away_goals,
    COALESCE(event_totals.derived_away_goals, 0) AS derived_away_goals
FROM seeded_matches
LEFT JOIN event_totals ON event_totals.match_id = seeded_matches.match_id
WHERE seeded_matches.expected_home_goals <> COALESCE(event_totals.derived_home_goals, 0)
   OR seeded_matches.expected_away_goals <> COALESCE(event_totals.derived_away_goals, 0);

-- Every group should contain exactly four teams.
SELECT
    edition_row.year AS edition_year,
    team_group_row.group_letter,
    COUNT(edition_team_row.team_id) AS team_count
FROM team_group team_group_row
JOIN world_cup_edition edition_row ON edition_row.id = team_group_row.edition_id
LEFT JOIN edition_team edition_team_row
    ON edition_team_row.edition_id = team_group_row.edition_id
   AND edition_team_row.group_id = team_group_row.id
WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
GROUP BY edition_row.year, team_group_row.group_letter
HAVING COUNT(edition_team_row.team_id) <> 4;

-- Podium must match final_rank.
SELECT
    edition_row.year AS edition_year,
    champion_team.name AS champion_team,
    vice_team.name AS vice_team,
    third_team.name AS third_team
FROM world_cup_edition edition_row
LEFT JOIN team champion_team ON champion_team.id = edition_row.champion_team_id
LEFT JOIN team vice_team ON vice_team.id = edition_row.vice_champion_team_id
LEFT JOIN team third_team ON third_team.id = edition_row.third_place_team_id
LEFT JOIN edition_team champion_rank
    ON champion_rank.edition_id = edition_row.id
   AND champion_rank.team_id = edition_row.champion_team_id
LEFT JOIN edition_team vice_rank
    ON vice_rank.edition_id = edition_row.id
   AND vice_rank.team_id = edition_row.vice_champion_team_id
LEFT JOIN edition_team third_rank
    ON third_rank.edition_id = edition_row.id
   AND third_rank.team_id = edition_row.third_place_team_id
WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
  AND (
      champion_rank.final_rank <> 1
      OR vice_rank.final_rank <> 2
      OR third_rank.final_rank <> 3
  );

-- Every edition should keep host cities in the same host country.
SELECT
    edition_row.year AS edition_year,
    host_country_row.name AS host_country,
    host_city_row.name AS host_city,
    host_city_country_row.name AS host_city_country
FROM edition_host_city edition_host_city_row
JOIN world_cup_edition edition_row ON edition_row.id = edition_host_city_row.edition_id
JOIN country host_country_row ON host_country_row.id = edition_row.host_country_id
JOIN host_city host_city_row ON host_city_row.id = edition_host_city_row.host_city_id
JOIN country host_city_country_row ON host_city_country_row.id = host_city_row.country_id
WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
  AND host_city_row.country_id <> edition_row.host_country_id;

-- Every edition should keep at least one host city.
SELECT
    edition_row.year AS edition_year
FROM world_cup_edition edition_row
LEFT JOIN edition_host_city edition_host_city_row
    ON edition_host_city_row.edition_id = edition_row.id
WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
GROUP BY edition_row.id, edition_row.year
HAVING COUNT(edition_host_city_row.host_city_id) = 0;

-- Every edition should keep at least one phase.
SELECT
    edition_row.year AS edition_year
FROM world_cup_edition edition_row
LEFT JOIN edition_phase edition_phase_row
    ON edition_phase_row.edition_id = edition_row.id
WHERE edition_row.year = ANY ((SELECT edition_years FROM fn_synthetic_data_status()))
GROUP BY edition_row.id, edition_row.year
HAVING COUNT(edition_phase_row.id) = 0;

-- Idempotence checks to execute manually:
-- SELECT * FROM fn_seed_synthetic_data();
-- SELECT * FROM fn_cleanup_synthetic_data();
-- SELECT * FROM fn_cleanup_synthetic_data();
-- SELECT * FROM fn_synthetic_data_status();

-- Integrity scenarios to execute manually inside a transaction.
-- Each block should fail and then be rolled back.

-- Scenario 0: generated SQL validator should reject non-read-only statements.
-- SELECT fn_validate_generated_sql('DELETE FROM world_cup.team');

-- Scenario 0b: generated SQL validator should reject multiple statements.
-- SELECT fn_validate_generated_sql('SELECT * FROM world_cup.fn_list_editions(); SELECT 1');

-- Scenario 0c: generated SQL validator should reject system-schema access.
-- SELECT fn_validate_generated_sql('SELECT * FROM pg_catalog.pg_tables');

-- Scenario 1: the same player cannot be called by two teams in the same edition.
-- BEGIN;
-- INSERT INTO team_call_up (edition_id, team_id, player_id, shirt_number, squad_role, primary_position, is_captain)
-- VALUES (
--     (
--         SELECT edition_row.id
--         FROM world_cup_edition edition_row
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--     ),
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         JOIN team team_row ON team_row.id = edition_team_row.team_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--           AND team_row.fifa_code = 'FJD'
--     ),
--     (
--         SELECT call_up.player_id
--         FROM team_call_up call_up
--         JOIN team team_row ON team_row.id = call_up.team_id
--         JOIN world_cup_edition edition_row ON edition_row.id = call_up.edition_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--           AND team_row.fifa_code = 'AUR'
--         ORDER BY call_up.shirt_number
--         LIMIT 1
--     ),
--     30,
--     'PLAYER',
--     'Forward',
--     FALSE
-- );
-- ROLLBACK;

-- Scenario 2: a match event cannot reference a player who is not in the match squad.
-- BEGIN;
-- INSERT INTO match_event (match_id, event_minute, stoppage_minute, event_type, team_id, player_id, related_player_id, description)
-- VALUES (
--     (
--         SELECT match_row.id
--         FROM match_game match_row
--         JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY match_row.kickoff_at
--         LIMIT 1
--     ),
--     88,
--     0,
--     'GOAL',
--     (
--         SELECT match_row.home_team_id
--         FROM match_game match_row
--         JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY match_row.kickoff_at
--         LIMIT 1
--     ),
--     (
--         SELECT player_row.id
--         FROM player player_row
--         WHERE player_row.id NOT IN (
--             SELECT call_up.player_id
--             FROM team_call_up call_up
--             WHERE call_up.edition_id = (
--                 SELECT match_row.edition_id
--                 FROM match_game match_row
--                 JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
--                 WHERE edition_row.year = (
--                     SELECT MAX(edition_year)
--                     FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--                 )
--                 ORDER BY match_row.kickoff_at
--                 LIMIT 1
--             )
--         )
--         ORDER BY player_row.id
--         LIMIT 1
--     ),
--     NULL,
--     'Invalid scorer outside the called-up squad.'
-- );
-- ROLLBACK;

-- Scenario 3: a team cannot play against itself.
-- BEGIN;
-- INSERT INTO match_game (
--     edition_id,
--     edition_phase_id,
--     group_id,
--     stadium_id,
--     kickoff_at,
--     home_team_id,
--     away_team_id,
--     winner_team_id,
--     home_score,
--     away_score,
--     home_extra_score,
--     away_extra_score,
--     home_penalty_score,
--     away_penalty_score,
--     match_day
-- ) VALUES (
--     (
--         SELECT edition_row.id
--         FROM world_cup_edition edition_row
--         WHERE edition_row.year = (
--             SELECT MIN(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--     ),
--     (
--         SELECT edition_phase_row.id
--         FROM edition_phase edition_phase_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_phase_row.edition_id
--         JOIN competition_phase phase_row ON phase_row.id = edition_phase_row.phase_id
--         WHERE edition_row.year = (
--             SELECT MIN(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--           AND phase_row.code = 'GROUP_STAGE'
--     ),
--     (
--         SELECT team_group_row.id
--         FROM team_group team_group_row
--         JOIN world_cup_edition edition_row ON edition_row.id = team_group_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MIN(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY team_group_row.group_letter
--         LIMIT 1
--     ),
--     (
--         SELECT stadium_row.id
--         FROM stadium stadium_row
--         ORDER BY stadium_row.id
--         LIMIT 1
--     ),
--     TIMESTAMP '2034-06-30 12:00:00',
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MIN(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY edition_team_row.final_rank
--         LIMIT 1
--     ),
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MIN(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY edition_team_row.final_rank
--         LIMIT 1
--     ),
--     NULL,
--     1,
--     0,
--     0,
--     0,
--     NULL,
--     NULL,
--     4
-- );
-- ROLLBACK;

-- Scenario 4: knockout matches must declare a qualified team.
-- BEGIN;
-- INSERT INTO match_game (
--     edition_id,
--     edition_phase_id,
--     group_id,
--     stadium_id,
--     kickoff_at,
--     home_team_id,
--     away_team_id,
--     winner_team_id,
--     home_score,
--     away_score,
--     home_extra_score,
--     away_extra_score,
--     home_penalty_score,
--     away_penalty_score,
--     match_day
-- ) VALUES (
--     (
--         SELECT edition_row.id
--         FROM world_cup_edition edition_row
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--     ),
--     (
--         SELECT edition_phase_row.id
--         FROM edition_phase edition_phase_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_phase_row.edition_id
--         JOIN competition_phase phase_row ON phase_row.id = edition_phase_row.phase_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--           AND phase_row.code = 'SEMI_FINAL'
--     ),
--     NULL,
--     (
--         SELECT stadium_row.id
--         FROM stadium stadium_row
--         ORDER BY stadium_row.id DESC
--         LIMIT 1
--     ),
--     TIMESTAMP '2038-07-08 18:00:00',
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY edition_team_row.final_rank
--         LIMIT 1
--     ),
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         WHERE edition_row.year = (
--             SELECT MAX(edition_year)
--             FROM unnest((SELECT edition_years FROM fn_synthetic_data_status())) AS seeded_year(edition_year)
--         )
--         ORDER BY edition_team_row.final_rank
--         OFFSET 1
--         LIMIT 1
--     ),
--     NULL,
--     1,
--     0,
--     0,
--     0,
--     NULL,
--     NULL,
--     NULL
-- );
-- ROLLBACK;

-- Scenario 5: a host city cannot be attached to an edition from another host country.
-- BEGIN;
-- INSERT INTO edition_host_city (edition_id, host_city_id)
-- VALUES (
--     (
--         SELECT edition_row.id
--         FROM world_cup_edition edition_row
--         WHERE edition_row.year = 2034
--     ),
--     (
--         SELECT host_city_row.id
--         FROM host_city host_city_row
--         JOIN country country_row ON country_row.id = host_city_row.country_id
--         WHERE country_row.name = 'Ivernia'
--         LIMIT 1
--     )
-- );
-- SET CONSTRAINTS ALL IMMEDIATE;
-- ROLLBACK;

-- Scenario 6: an edition cannot commit without at least one host city.
-- BEGIN;
-- INSERT INTO world_cup_edition (year, host_country_id, start_date, end_date)
-- VALUES (
--     2042,
--     (SELECT id FROM country WHERE fifa_code = 'AUR'),
--     DATE '2042-06-10',
--     DATE '2042-07-12'
-- );
-- INSERT INTO edition_phase (edition_id, phase_id, label, stage_order)
-- VALUES (
--     (SELECT id FROM world_cup_edition WHERE year = 2042),
--     (SELECT id FROM competition_phase WHERE code = 'GROUP_STAGE'),
--     '2042 Group Stage',
--     1
-- );
-- SET CONSTRAINTS ALL IMMEDIATE;
-- ROLLBACK;

-- Scenario 7: an edition cannot commit without at least one phase.
-- BEGIN;
-- INSERT INTO world_cup_edition (year, host_country_id, start_date, end_date)
-- VALUES (
--     2043,
--     (SELECT id FROM country WHERE fifa_code = 'IVE'),
--     DATE '2043-06-10',
--     DATE '2043-07-12'
-- );
-- INSERT INTO edition_host_city (edition_id, host_city_id)
-- VALUES (
--     (SELECT id FROM world_cup_edition WHERE year = 2043),
--     (
--         SELECT host_city_row.id
--         FROM host_city host_city_row
--         JOIN country country_row ON country_row.id = host_city_row.country_id
--         WHERE country_row.fifa_code = 'IVE'
--         LIMIT 1
--     )
-- );
-- SET CONSTRAINTS ALL IMMEDIATE;
-- ROLLBACK;

-- Scenario 8: podium teams must match the declared final ranks on the edition row.
-- BEGIN;
-- UPDATE world_cup_edition
-- SET champion_team_id = (
--     SELECT edition_team_row.team_id
--     FROM edition_team edition_team_row
--     JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--     WHERE edition_row.year = 2034
--       AND edition_team_row.final_rank = 4
-- )
-- WHERE year = 2034;
-- SET CONSTRAINTS ALL IMMEDIATE;
-- ROLLBACK;

-- Scenario 9: changing a top final_rank must keep the podium row aligned.
-- BEGIN;
-- UPDATE edition_team
-- SET final_rank = 6
-- WHERE edition_id = (
--         SELECT id
--         FROM world_cup_edition
--         WHERE year = 2038
--     )
--   AND final_rank = 1;
-- SET CONSTRAINTS ALL IMMEDIATE;
-- ROLLBACK;

-- Scenario 10: a player cannot switch national teams across editions.
-- BEGIN;
-- INSERT INTO team_call_up (edition_id, team_id, player_id, shirt_number, squad_role, primary_position, is_captain)
-- VALUES (
--     (
--         SELECT id
--         FROM world_cup_edition
--         WHERE year = 2038
--     ),
--     (
--         SELECT edition_team_row.team_id
--         FROM edition_team edition_team_row
--         JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
--         JOIN team team_row ON team_row.id = edition_team_row.team_id
--         WHERE edition_row.year = 2038
--           AND team_row.fifa_code = 'BOR'
--     ),
--     (
--         SELECT call_up.player_id
--         FROM team_call_up call_up
--         JOIN world_cup_edition edition_row ON edition_row.id = call_up.edition_id
--         JOIN team team_row ON team_row.id = call_up.team_id
--         WHERE edition_row.year = 2034
--           AND team_row.fifa_code = 'CAS'
--         ORDER BY call_up.shirt_number
--         LIMIT 1
--     ),
--     99,
--     'PLAYER',
--     'Forward',
--     FALSE
-- );
-- ROLLBACK;
