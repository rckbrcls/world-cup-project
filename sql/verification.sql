SET search_path TO world_cup, public;

-- Manual smoke checks after applying sql/ddl.sql and sql/dml.sql.

SELECT
    (SELECT COUNT(*) FROM confederation) AS confederations,
    (SELECT COUNT(*) FROM country) AS countries,
    (SELECT COUNT(*) FROM team) AS teams,
    (SELECT COUNT(*) FROM player) AS players,
    (SELECT COUNT(*) FROM match_game) AS matches,
    (SELECT COUNT(*) FROM match_event) AS match_events;

-- 1. List all World Cup editions with year, host country, and champion.
SELECT * FROM fn_list_editions();

-- 2. List the participating teams of a given edition.
SELECT *
FROM fn_list_edition_teams((
    SELECT id FROM world_cup_edition WHERE year = 2034
));

-- 3. List the groups of an edition and the teams in each group.
SELECT *
FROM fn_list_edition_groups((
    SELECT id FROM world_cup_edition WHERE year = 2034
));

-- 4. Show the group standings table.
SELECT *
FROM fn_group_standings((
    SELECT team_group.id
    FROM team_group
    JOIN world_cup_edition edition ON edition.id = team_group.edition_id
    WHERE edition.year = 2034
      AND team_group.group_letter = 'A'
));

-- 5. List all matches of an edition with phase, date, stadium, and score.
SELECT *
FROM fn_list_edition_matches((
    SELECT id FROM world_cup_edition WHERE year = 2034
));

-- 6. Show the knockout path of an edition and the qualified teams in each phase.
SELECT *
FROM fn_knockout_path((
    SELECT id FROM world_cup_edition WHERE year = 2034
));

-- 7. List the called-up squad of a team in a given edition.
SELECT *
FROM fn_list_team_squad(
    (SELECT id FROM world_cup_edition WHERE year = 2034),
    (SELECT id FROM team WHERE fifa_code = 'AUR')
);

-- 8. List the events of a match.
SELECT *
FROM fn_list_match_events((
    SELECT match_game.id
    FROM match_game
    JOIN edition_phase ON edition_phase.id = match_game.edition_phase_id
    JOIN competition_phase ON competition_phase.id = edition_phase.phase_id
    WHERE competition_phase.code = 'FINAL'
      AND match_game.edition_id = (SELECT id FROM world_cup_edition WHERE year = 2034)
));

-- 9. Show the top scorers of an edition.
SELECT *
FROM fn_top_scorers((
    SELECT id FROM world_cup_edition WHERE year = 2034
));

-- 10. Show the historical record of a team.
SELECT *
FROM fn_team_history((
    SELECT id FROM team WHERE fifa_code = 'AUR'
));

-- Generated SQL validator smoke checks.
SELECT fn_validate_generated_sql('SELECT * FROM world_cup.fn_list_editions()');
SELECT fn_validate_generated_sql('WITH cte AS (SELECT 1 AS value) SELECT value FROM cte');
SELECT * FROM fn_list_all_edition_teams();

-- Consistency checks: the queries below should return zero rows.

-- Scoreboard versus goal events, including own goals for the benefiting side.
WITH scored_matches AS (
    SELECT
        match_game.id AS match_id,
        match_game.home_team_id,
        match_game.away_team_id,
        match_game.home_score + match_game.home_extra_score AS expected_home_goals,
        match_game.away_score + match_game.away_extra_score AS expected_away_goals
    FROM match_game
    JOIN world_cup_edition edition ON edition.id = match_game.edition_id
    WHERE edition.year = 2034
),
event_totals AS (
    SELECT
        scored_matches.match_id,
        SUM(
            CASE
                WHEN event.team_id = scored_matches.home_team_id
                 AND event.event_type IN ('GOAL', 'PENALTY_GOAL') THEN 1
                WHEN event.team_id = scored_matches.away_team_id
                 AND event.event_type = 'OWN_GOAL' THEN 1
                ELSE 0
            END
        )::BIGINT AS derived_home_goals,
        SUM(
            CASE
                WHEN event.team_id = scored_matches.away_team_id
                 AND event.event_type IN ('GOAL', 'PENALTY_GOAL') THEN 1
                WHEN event.team_id = scored_matches.home_team_id
                 AND event.event_type = 'OWN_GOAL' THEN 1
                ELSE 0
            END
        )::BIGINT AS derived_away_goals
    FROM scored_matches
    LEFT JOIN match_event event ON event.match_id = scored_matches.match_id
    GROUP BY scored_matches.match_id
)
SELECT
    scored_matches.match_id,
    scored_matches.expected_home_goals,
    COALESCE(event_totals.derived_home_goals, 0) AS derived_home_goals,
    scored_matches.expected_away_goals,
    COALESCE(event_totals.derived_away_goals, 0) AS derived_away_goals
FROM scored_matches
LEFT JOIN event_totals ON event_totals.match_id = scored_matches.match_id
WHERE scored_matches.expected_home_goals <> COALESCE(event_totals.derived_home_goals, 0)
   OR scored_matches.expected_away_goals <> COALESCE(event_totals.derived_away_goals, 0);

-- Every group in the demo edition should contain exactly four teams.
SELECT
    team_group.group_letter,
    COUNT(edition_team.team_id) AS team_count
FROM team_group
LEFT JOIN edition_team
    ON edition_team.edition_id = team_group.edition_id
   AND edition_team.group_id = team_group.id
WHERE team_group.edition_id = (SELECT id FROM world_cup_edition WHERE year = 2034)
GROUP BY team_group.group_letter
HAVING COUNT(edition_team.team_id) <> 4;

-- Podium columns must match final_rank values.
SELECT
    edition.year,
    champion.name AS champion_team,
    runner_up.name AS runner_up_team,
    third_place.name AS third_place_team
FROM world_cup_edition edition
LEFT JOIN team champion ON champion.id = edition.champion_team_id
LEFT JOIN team runner_up ON runner_up.id = edition.vice_champion_team_id
LEFT JOIN team third_place ON third_place.id = edition.third_place_team_id
LEFT JOIN edition_team champion_rank
    ON champion_rank.edition_id = edition.id
   AND champion_rank.team_id = edition.champion_team_id
LEFT JOIN edition_team runner_up_rank
    ON runner_up_rank.edition_id = edition.id
   AND runner_up_rank.team_id = edition.vice_champion_team_id
LEFT JOIN edition_team third_place_rank
    ON third_place_rank.edition_id = edition.id
   AND third_place_rank.team_id = edition.third_place_team_id
WHERE edition.year = 2034
  AND (
      champion_rank.final_rank <> 1
      OR runner_up_rank.final_rank <> 2
      OR third_place_rank.final_rank <> 3
  );

-- Integrity scenarios to execute manually inside a transaction.
-- Each block should fail and then be rolled back.

-- SELECT fn_validate_generated_sql('DELETE FROM world_cup.team');
-- SELECT fn_validate_generated_sql('SELECT * FROM world_cup.fn_list_editions(); SELECT 1');
