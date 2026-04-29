BEGIN;

SET search_path TO world_cup, public;

CREATE OR REPLACE VIEW vw_match_scoreboard AS
SELECT
    match_row.id AS match_id,
    match_row.edition_id,
    edition_row.year AS edition_year,
    edition_phase_row.stage_order,
    phase_row.code AS phase_code,
    phase_row.display_name AS phase_name,
    phase_row.phase_kind,
    team_group_row.group_letter,
    match_row.match_day,
    match_row.kickoff_at,
    stadium_row.name AS stadium_name,
    host_city_row.name AS host_city_name,
    match_row.home_team_id,
    home_team.name AS home_team_name,
    match_row.away_team_id,
    away_team.name AS away_team_name,
    match_row.winner_team_id,
    winner_team.name AS winner_team_name,
    match_row.home_score,
    match_row.away_score,
    match_row.home_extra_score,
    match_row.away_extra_score,
    match_row.home_penalty_score,
    match_row.away_penalty_score,
    match_row.home_score + match_row.home_extra_score AS final_home_goals,
    match_row.away_score + match_row.away_extra_score AS final_away_goals
FROM match_game match_row
JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
JOIN edition_phase edition_phase_row ON edition_phase_row.id = match_row.edition_phase_id
JOIN competition_phase phase_row ON phase_row.id = edition_phase_row.phase_id
JOIN stadium stadium_row ON stadium_row.id = match_row.stadium_id
JOIN host_city host_city_row ON host_city_row.id = stadium_row.host_city_id
JOIN team home_team ON home_team.id = match_row.home_team_id
JOIN team away_team ON away_team.id = match_row.away_team_id
LEFT JOIN team winner_team ON winner_team.id = match_row.winner_team_id
LEFT JOIN team_group team_group_row ON team_group_row.id = match_row.group_id;

CREATE OR REPLACE VIEW vw_match_team_summary AS
SELECT
    scoreboard.match_id,
    scoreboard.edition_id,
    scoreboard.edition_year,
    scoreboard.phase_code,
    scoreboard.phase_name,
    scoreboard.phase_kind,
    scoreboard.group_letter,
    scoreboard.kickoff_at,
    scoreboard.home_team_id AS team_id,
    scoreboard.home_team_name AS team_name,
    scoreboard.away_team_id AS opponent_team_id,
    scoreboard.away_team_name AS opponent_team_name,
    scoreboard.final_home_goals AS goals_for,
    scoreboard.final_away_goals AS goals_against,
    CASE
        WHEN scoreboard.phase_kind = 'GROUP' AND scoreboard.final_home_goals > scoreboard.final_away_goals THEN 'WIN'
        WHEN scoreboard.phase_kind = 'GROUP' AND scoreboard.final_home_goals < scoreboard.final_away_goals THEN 'LOSS'
        WHEN scoreboard.phase_kind = 'GROUP' THEN 'DRAW'
        WHEN scoreboard.winner_team_id = scoreboard.home_team_id THEN 'WIN'
        ELSE 'LOSS'
    END AS result,
    CASE
        WHEN scoreboard.phase_kind <> 'GROUP' THEN NULL
        WHEN scoreboard.final_home_goals > scoreboard.final_away_goals THEN 3
        WHEN scoreboard.final_home_goals = scoreboard.final_away_goals THEN 1
        ELSE 0
    END AS points
FROM vw_match_scoreboard scoreboard
UNION ALL
SELECT
    scoreboard.match_id,
    scoreboard.edition_id,
    scoreboard.edition_year,
    scoreboard.phase_code,
    scoreboard.phase_name,
    scoreboard.phase_kind,
    scoreboard.group_letter,
    scoreboard.kickoff_at,
    scoreboard.away_team_id AS team_id,
    scoreboard.away_team_name AS team_name,
    scoreboard.home_team_id AS opponent_team_id,
    scoreboard.home_team_name AS opponent_team_name,
    scoreboard.final_away_goals AS goals_for,
    scoreboard.final_home_goals AS goals_against,
    CASE
        WHEN scoreboard.phase_kind = 'GROUP' AND scoreboard.final_away_goals > scoreboard.final_home_goals THEN 'WIN'
        WHEN scoreboard.phase_kind = 'GROUP' AND scoreboard.final_away_goals < scoreboard.final_home_goals THEN 'LOSS'
        WHEN scoreboard.phase_kind = 'GROUP' THEN 'DRAW'
        WHEN scoreboard.winner_team_id = scoreboard.away_team_id THEN 'WIN'
        ELSE 'LOSS'
    END AS result,
    CASE
        WHEN scoreboard.phase_kind <> 'GROUP' THEN NULL
        WHEN scoreboard.final_away_goals > scoreboard.final_home_goals THEN 3
        WHEN scoreboard.final_away_goals = scoreboard.final_home_goals THEN 1
        ELSE 0
    END AS points
FROM vw_match_scoreboard scoreboard;

CREATE OR REPLACE FUNCTION fn_list_editions()
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    host_country VARCHAR(100),
    champion_team VARCHAR(100),
    vice_champion_team VARCHAR(100),
    third_place_team VARCHAR(100)
)
LANGUAGE sql
AS $$
    SELECT
        edition_row.id AS edition_id,
        edition_row.year AS edition_year,
        host_country.name AS host_country,
        champion_team.name AS champion_team,
        vice_team.name AS vice_champion_team,
        third_team.name AS third_place_team
    FROM world_cup_edition edition_row
    JOIN country host_country ON host_country.id = edition_row.host_country_id
    LEFT JOIN team champion_team ON champion_team.id = edition_row.champion_team_id
    LEFT JOIN team vice_team ON vice_team.id = edition_row.vice_champion_team_id
    LEFT JOIN team third_team ON third_team.id = edition_row.third_place_team_id
    ORDER BY edition_row.year;
$$;

CREATE OR REPLACE FUNCTION fn_list_edition_teams(p_edition_id BIGINT)
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    team_id BIGINT,
    team_name VARCHAR(100),
    country_name VARCHAR(100),
    coach_name VARCHAR(120),
    group_letter CHAR(1),
    final_rank SMALLINT
)
LANGUAGE sql
AS $$
    SELECT
        edition_team_row.edition_id,
        edition_row.year AS edition_year,
        team_row.id AS team_id,
        team_row.name AS team_name,
        country_row.name AS country_name,
        coach_row.full_name AS coach_name,
        team_group_row.group_letter,
        edition_team_row.final_rank
    FROM edition_team edition_team_row
    JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
    JOIN team team_row ON team_row.id = edition_team_row.team_id
    JOIN country country_row ON country_row.id = team_row.country_id
    JOIN coach coach_row ON coach_row.id = edition_team_row.coach_id
    LEFT JOIN team_group team_group_row ON team_group_row.id = edition_team_row.group_id
    WHERE edition_team_row.edition_id = p_edition_id
    ORDER BY team_group_row.group_letter NULLS LAST, team_row.name;
$$;

CREATE OR REPLACE FUNCTION fn_list_all_edition_teams()
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    team_id BIGINT,
    team_name VARCHAR(100),
    country_name VARCHAR(100),
    coach_name VARCHAR(120),
    group_letter CHAR(1),
    final_rank SMALLINT
)
LANGUAGE sql
AS $$
    SELECT
        edition_team_row.edition_id,
        edition_row.year AS edition_year,
        team_row.id AS team_id,
        team_row.name AS team_name,
        country_row.name AS country_name,
        coach_row.full_name AS coach_name,
        team_group_row.group_letter,
        edition_team_row.final_rank
    FROM edition_team edition_team_row
    JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
    JOIN team team_row ON team_row.id = edition_team_row.team_id
    JOIN country country_row ON country_row.id = team_row.country_id
    JOIN coach coach_row ON coach_row.id = edition_team_row.coach_id
    LEFT JOIN team_group team_group_row ON team_group_row.id = edition_team_row.group_id
    ORDER BY edition_row.year DESC, team_group_row.group_letter NULLS LAST, team_row.name;
$$;

CREATE OR REPLACE FUNCTION fn_list_edition_groups(p_edition_id BIGINT)
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    group_id BIGINT,
    group_letter CHAR(1),
    team_id BIGINT,
    team_name VARCHAR(100),
    coach_name VARCHAR(120)
)
LANGUAGE sql
AS $$
    SELECT
        team_group_row.edition_id,
        edition_row.year AS edition_year,
        team_group_row.id AS group_id,
        team_group_row.group_letter,
        team_row.id AS team_id,
        team_row.name AS team_name,
        coach_row.full_name AS coach_name
    FROM team_group team_group_row
    JOIN world_cup_edition edition_row ON edition_row.id = team_group_row.edition_id
    LEFT JOIN edition_team edition_team_row
        ON edition_team_row.group_id = team_group_row.id
       AND edition_team_row.edition_id = team_group_row.edition_id
    LEFT JOIN team team_row ON team_row.id = edition_team_row.team_id
    LEFT JOIN coach coach_row ON coach_row.id = edition_team_row.coach_id
    WHERE team_group_row.edition_id = p_edition_id
    ORDER BY team_group_row.group_letter, team_row.name;
$$;

CREATE OR REPLACE FUNCTION fn_group_standings(p_group_id BIGINT)
RETURNS TABLE (
    rank_position BIGINT,
    group_id BIGINT,
    group_letter CHAR(1),
    team_id BIGINT,
    team_name VARCHAR(100),
    matches_played BIGINT,
    wins BIGINT,
    draws BIGINT,
    losses BIGINT,
    goals_for BIGINT,
    goals_against BIGINT,
    goal_difference BIGINT,
    points BIGINT
)
LANGUAGE sql
AS $$
    WITH standings_base AS (
        SELECT
            team_group_row.id AS group_id,
            team_group_row.group_letter,
            edition_team_row.team_id,
            team_row.name AS team_name,
            COUNT(summary_row.match_id) AS matches_played,
            COUNT(*) FILTER (WHERE summary_row.result = 'WIN') AS wins,
            COUNT(*) FILTER (WHERE summary_row.result = 'DRAW') AS draws,
            COUNT(*) FILTER (WHERE summary_row.result = 'LOSS') AS losses,
            COALESCE(SUM(summary_row.goals_for), 0) AS goals_for,
            COALESCE(SUM(summary_row.goals_against), 0) AS goals_against,
            COALESCE(SUM(summary_row.points), 0) AS points
        FROM team_group team_group_row
        JOIN edition_team edition_team_row
            ON edition_team_row.group_id = team_group_row.id
           AND edition_team_row.edition_id = team_group_row.edition_id
        JOIN team team_row ON team_row.id = edition_team_row.team_id
        LEFT JOIN vw_match_team_summary summary_row
            ON summary_row.edition_id = team_group_row.edition_id
           AND summary_row.team_id = edition_team_row.team_id
           AND summary_row.phase_kind = 'GROUP'
           AND summary_row.group_letter = team_group_row.group_letter
        WHERE team_group_row.id = p_group_id
        GROUP BY team_group_row.id, team_group_row.group_letter, edition_team_row.team_id, team_row.name
    )
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY standings_base.points DESC,
                     (standings_base.goals_for - standings_base.goals_against) DESC,
                     standings_base.goals_for DESC,
                     standings_base.team_name
        ) AS rank_position,
        standings_base.group_id,
        standings_base.group_letter,
        standings_base.team_id,
        standings_base.team_name,
        standings_base.matches_played,
        standings_base.wins,
        standings_base.draws,
        standings_base.losses,
        standings_base.goals_for,
        standings_base.goals_against,
        standings_base.goals_for - standings_base.goals_against AS goal_difference,
        standings_base.points
    FROM standings_base
    ORDER BY rank_position;
$$;

CREATE OR REPLACE FUNCTION fn_list_edition_matches(p_edition_id BIGINT)
RETURNS TABLE (
    match_id BIGINT,
    edition_id BIGINT,
    edition_year SMALLINT,
    phase_name VARCHAR(120),
    group_letter CHAR(1),
    kickoff_at TIMESTAMP,
    stadium_name VARCHAR(120),
    host_city_name VARCHAR(120),
    home_team_name VARCHAR(100),
    away_team_name VARCHAR(100),
    final_score VARCHAR(20),
    penalty_score VARCHAR(20),
    winner_team_name VARCHAR(100)
)
LANGUAGE sql
AS $$
    SELECT
        scoreboard.match_id,
        scoreboard.edition_id,
        scoreboard.edition_year,
        scoreboard.phase_name,
        scoreboard.group_letter,
        scoreboard.kickoff_at,
        scoreboard.stadium_name,
        scoreboard.host_city_name,
        scoreboard.home_team_name,
        scoreboard.away_team_name,
        scoreboard.final_home_goals::VARCHAR || ' - ' || scoreboard.final_away_goals::VARCHAR AS final_score,
        CASE
            WHEN scoreboard.home_penalty_score IS NULL THEN NULL
            ELSE scoreboard.home_penalty_score::VARCHAR || ' - ' || scoreboard.away_penalty_score::VARCHAR
        END AS penalty_score,
        scoreboard.winner_team_name
    FROM vw_match_scoreboard scoreboard
    WHERE scoreboard.edition_id = p_edition_id
    ORDER BY scoreboard.kickoff_at, scoreboard.match_id;
$$;

CREATE OR REPLACE FUNCTION fn_knockout_path(p_edition_id BIGINT)
RETURNS TABLE (
    match_id BIGINT,
    edition_year SMALLINT,
    phase_name VARCHAR(120),
    kickoff_at TIMESTAMP,
    stadium_name VARCHAR(120),
    home_team_name VARCHAR(100),
    away_team_name VARCHAR(100),
    final_score VARCHAR(20),
    penalty_score VARCHAR(20),
    winner_team_name VARCHAR(100)
)
LANGUAGE sql
AS $$
    SELECT
        scoreboard.match_id,
        scoreboard.edition_year,
        scoreboard.phase_name,
        scoreboard.kickoff_at,
        scoreboard.stadium_name,
        scoreboard.home_team_name,
        scoreboard.away_team_name,
        scoreboard.final_home_goals::VARCHAR || ' - ' || scoreboard.final_away_goals::VARCHAR AS final_score,
        CASE
            WHEN scoreboard.home_penalty_score IS NULL THEN NULL
            ELSE scoreboard.home_penalty_score::VARCHAR || ' - ' || scoreboard.away_penalty_score::VARCHAR
        END AS penalty_score,
        scoreboard.winner_team_name
    FROM vw_match_scoreboard scoreboard
    WHERE scoreboard.edition_id = p_edition_id
      AND scoreboard.phase_kind <> 'GROUP'
    ORDER BY scoreboard.stage_order, scoreboard.kickoff_at, scoreboard.match_id;
$$;

CREATE OR REPLACE FUNCTION fn_list_team_squad(p_edition_id BIGINT, p_team_id BIGINT)
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    team_id BIGINT,
    team_name VARCHAR(100),
    shirt_number SMALLINT,
    player_id BIGINT,
    player_name VARCHAR(120),
    primary_position VARCHAR(40),
    squad_role VARCHAR(30),
    is_captain BOOLEAN
)
LANGUAGE sql
AS $$
    SELECT
        call_up.edition_id,
        edition_row.year AS edition_year,
        call_up.team_id,
        team_row.name AS team_name,
        call_up.shirt_number,
        player_row.id AS player_id,
        player_row.full_name AS player_name,
        call_up.primary_position,
        call_up.squad_role,
        call_up.is_captain
    FROM team_call_up call_up
    JOIN world_cup_edition edition_row ON edition_row.id = call_up.edition_id
    JOIN team team_row ON team_row.id = call_up.team_id
    JOIN player player_row ON player_row.id = call_up.player_id
    WHERE call_up.edition_id = p_edition_id
      AND call_up.team_id = p_team_id
    ORDER BY call_up.shirt_number, player_row.full_name;
$$;

CREATE OR REPLACE FUNCTION fn_list_match_events(p_match_id BIGINT)
RETURNS TABLE (
    event_id BIGINT,
    match_id BIGINT,
    minute_label VARCHAR(10),
    event_type game_event_type,
    team_name VARCHAR(100),
    player_name VARCHAR(120),
    related_player_name VARCHAR(120),
    description TEXT
)
LANGUAGE sql
AS $$
    SELECT
        event_row.id AS event_id,
        event_row.match_id,
        CASE
            WHEN event_row.stoppage_minute = 0 THEN event_row.event_minute::VARCHAR
            ELSE event_row.event_minute::VARCHAR || '+' || event_row.stoppage_minute::VARCHAR
        END AS minute_label,
        event_row.event_type,
        team_row.name AS team_name,
        player_row.full_name AS player_name,
        related_player_row.full_name AS related_player_name,
        event_row.description
    FROM match_event event_row
    JOIN team team_row ON team_row.id = event_row.team_id
    LEFT JOIN player player_row ON player_row.id = event_row.player_id
    LEFT JOIN player related_player_row ON related_player_row.id = event_row.related_player_id
    WHERE event_row.match_id = p_match_id
    ORDER BY event_row.event_minute, event_row.stoppage_minute, event_row.id;
$$;

CREATE OR REPLACE FUNCTION fn_top_scorers(p_edition_id BIGINT)
RETURNS TABLE (
    rank_position BIGINT,
    edition_id BIGINT,
    edition_year SMALLINT,
    player_id BIGINT,
    player_name VARCHAR(120),
    team_id BIGINT,
    team_name VARCHAR(100),
    total_goals BIGINT
)
LANGUAGE sql
AS $$
    WITH scorer_base AS (
        SELECT
            match_row.edition_id,
            edition_row.year AS edition_year,
            event_row.player_id,
            player_row.full_name AS player_name,
            call_up.team_id,
            team_row.name AS team_name,
            COUNT(*) AS total_goals
        FROM match_event event_row
        JOIN match_game match_row ON match_row.id = event_row.match_id
        JOIN world_cup_edition edition_row ON edition_row.id = match_row.edition_id
        JOIN player player_row ON player_row.id = event_row.player_id
        JOIN team_call_up call_up
            ON call_up.edition_id = match_row.edition_id
           AND call_up.player_id = event_row.player_id
        JOIN team team_row ON team_row.id = call_up.team_id
        WHERE match_row.edition_id = p_edition_id
          AND event_row.event_type IN ('GOAL', 'PENALTY_GOAL')
        GROUP BY
            match_row.edition_id,
            edition_row.year,
            event_row.player_id,
            player_row.full_name,
            call_up.team_id,
            team_row.name
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY scorer_base.total_goals DESC, scorer_base.player_name) AS rank_position,
        scorer_base.edition_id,
        scorer_base.edition_year,
        scorer_base.player_id,
        scorer_base.player_name,
        scorer_base.team_id,
        scorer_base.team_name,
        scorer_base.total_goals
    FROM scorer_base
    ORDER BY rank_position;
$$;

CREATE OR REPLACE FUNCTION fn_team_history(p_team_id BIGINT)
RETURNS TABLE (
    edition_id BIGINT,
    edition_year SMALLINT,
    team_id BIGINT,
    team_name VARCHAR(100),
    final_rank SMALLINT,
    matches_played BIGINT,
    wins BIGINT,
    draws BIGINT,
    losses BIGINT,
    goals_for BIGINT,
    goals_against BIGINT
)
LANGUAGE sql
AS $$
    SELECT
        edition_team_row.edition_id,
        edition_row.year AS edition_year,
        edition_team_row.team_id,
        team_row.name AS team_name,
        edition_team_row.final_rank,
        COUNT(summary_row.match_id) AS matches_played,
        COUNT(*) FILTER (WHERE summary_row.result = 'WIN') AS wins,
        COUNT(*) FILTER (WHERE summary_row.result = 'DRAW') AS draws,
        COUNT(*) FILTER (WHERE summary_row.result = 'LOSS') AS losses,
        COALESCE(SUM(summary_row.goals_for), 0) AS goals_for,
        COALESCE(SUM(summary_row.goals_against), 0) AS goals_against
    FROM edition_team edition_team_row
    JOIN world_cup_edition edition_row ON edition_row.id = edition_team_row.edition_id
    JOIN team team_row ON team_row.id = edition_team_row.team_id
    LEFT JOIN vw_match_team_summary summary_row
        ON summary_row.edition_id = edition_team_row.edition_id
       AND summary_row.team_id = edition_team_row.team_id
    WHERE edition_team_row.team_id = p_team_id
    GROUP BY
        edition_team_row.edition_id,
        edition_row.year,
        edition_team_row.team_id,
        team_row.name,
        edition_team_row.final_rank
    ORDER BY edition_row.year;
$$;

COMMIT;
