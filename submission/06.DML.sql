BEGIN;

SET search_path TO world_cup, public;
SET CONSTRAINTS ALL DEFERRED;

TRUNCATE TABLE
    match_event,
    match_official,
    match_game,
    team_call_up,
    edition_team,
    team_group,
    edition_phase,
    edition_host_city,
    world_cup_edition,
    stadium,
    host_city,
    player,
    referee,
    coach,
    team,
    country,
    confederation,
    competition_phase
RESTART IDENTITY CASCADE;

INSERT INTO confederation (id, code, name) VALUES
    (1, 'CONMEBOL', 'South American Football Confederation'),
    (2, 'UEFA', 'Union of European Football Associations'),
    (3, 'CAF', 'Confederation of African Football'),
    (4, 'AFC', 'Asian Football Confederation'),
    (5, 'CONCACAF', 'North and Central American Confederation'),
    (6, 'OFC', 'Oceania Football Confederation');

INSERT INTO country (id, name, fifa_code, confederation_id) VALUES
    (1, 'Aurora Republic', 'AUR', 1),
    (2, 'Borealis', 'BOR', 1),
    (3, 'Cascadia', 'CAS', 5),
    (4, 'Duneshire', 'DUN', 2),
    (5, 'Estoria', 'EST', 2),
    (6, 'Fjordland', 'FJD', 2),
    (7, 'Galewood', 'GLW', 3),
    (8, 'Helvetia', 'HLV', 4);

INSERT INTO team (id, name, fifa_code, country_id) VALUES
    (1, 'Aurora Republic', 'AUR', 1),
    (2, 'Borealis', 'BOR', 2),
    (3, 'Cascadia', 'CAS', 3),
    (4, 'Duneshire', 'DUN', 4),
    (5, 'Estoria', 'EST', 5),
    (6, 'Fjordland', 'FJD', 6),
    (7, 'Galewood', 'GLW', 7),
    (8, 'Helvetia', 'HLV', 8);

INSERT INTO coach (id, full_name, birth_date, country_id) VALUES
    (1, 'Adrian Mercer', DATE '1974-03-18', 1),
    (2, 'Mateo Calder', DATE '1972-11-02', 2),
    (3, 'Elliot Navarro', DATE '1976-07-14', 3),
    (4, 'Hugo Renn', DATE '1978-01-27', 4),
    (5, 'Victor Salvi', DATE '1971-09-09', 5),
    (6, 'Jonas Halberg', DATE '1975-05-21', 6),
    (7, 'Martin Keane', DATE '1977-04-11', 7),
    (8, 'Sebastian Vogt', DATE '1973-12-06', 8);

INSERT INTO referee (id, full_name, country_id) VALUES
    (1, 'Marco Ellison', 1),
    (2, 'Santiago Neri', 3),
    (3, 'Noah Kjellsen', 6),
    (4, 'Theo Marceau', 8),
    (5, 'Ruben Faris', 5),
    (6, 'Lorenzo Voss', 2);

INSERT INTO player (id, full_name, birth_date, primary_position, country_of_birth_id)
SELECT
    team_row.id * 100 + player_slot.slot AS id,
    team_row.name || ' Player ' || player_slot.slot AS full_name,
    DATE '1994-01-01' + (team_row.id * 13 + player_slot.slot * 31) AS birth_date,
    CASE player_slot.slot
        WHEN 1 THEN 'Forward'
        WHEN 2 THEN 'Midfielder'
        ELSE 'Defender'
    END AS primary_position,
    team_row.country_id
FROM team team_row
CROSS JOIN (VALUES (1), (2), (3)) AS player_slot(slot)
ORDER BY team_row.id, player_slot.slot;

INSERT INTO world_cup_edition (
    id,
    year,
    host_country_id,
    start_date,
    end_date,
    champion_team_id,
    vice_champion_team_id,
    third_place_team_id
) VALUES (
    1,
    2034,
    1,
    DATE '2034-06-10',
    DATE '2034-07-10',
    NULL,
    NULL,
    NULL
);

INSERT INTO host_city (id, name, country_id) VALUES
    (1, 'Cascade Bay', 1),
    (2, 'Verdant Point', 1),
    (3, 'Red Cedar', 1),
    (4, 'High Timber', 1);

INSERT INTO stadium (id, name, host_city_id, capacity) VALUES
    (1, 'Cascade National Stadium', 1, 74200),
    (2, 'Verdant Arena', 2, 68100),
    (3, 'Red Cedar Park', 3, 65800),
    (4, 'High Timber Field', 4, 62300);

INSERT INTO edition_host_city (edition_id, host_city_id) VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4);

INSERT INTO competition_phase (
    id,
    code,
    display_name,
    phase_kind,
    sort_order,
    allows_draw
) VALUES
    (1, 'GROUP_STAGE', 'Group Stage', 'GROUP', 1, TRUE),
    (2, 'ROUND_OF_16', 'Round of 16', 'KNOCKOUT', 2, FALSE),
    (3, 'QUARTERFINAL', 'Quarterfinal', 'KNOCKOUT', 3, FALSE),
    (4, 'SEMIFINAL', 'Semifinal', 'KNOCKOUT', 4, FALSE),
    (5, 'THIRD_PLACE', 'Third Place Match', 'PLACEMENT', 5, FALSE),
    (6, 'FINAL', 'Final', 'KNOCKOUT', 6, FALSE);

INSERT INTO edition_phase (id, edition_id, phase_id, label, stage_order) VALUES
    (1, 1, 1, '2034 Group Stage', 1),
    (2, 1, 2, '2034 Round of 16', 2),
    (3, 1, 3, '2034 Quarterfinal', 3),
    (4, 1, 4, '2034 Semifinal', 4),
    (5, 1, 5, '2034 Third Place Match', 5),
    (6, 1, 6, '2034 Final', 6);

INSERT INTO team_group (id, edition_id, group_letter) VALUES
    (1, 1, 'A'),
    (2, 1, 'B');

INSERT INTO edition_team (id, edition_id, team_id, coach_id, group_id, final_rank) VALUES
    (1, 1, 1, 1, 1, 1),
    (2, 1, 2, 2, 1, 4),
    (3, 1, 3, 3, 1, 8),
    (4, 1, 4, 4, 1, 7),
    (5, 1, 5, 5, 2, 2),
    (6, 1, 6, 6, 2, 3),
    (7, 1, 7, 7, 2, 5),
    (8, 1, 8, 8, 2, 6);

INSERT INTO team_call_up (
    edition_id,
    team_id,
    player_id,
    shirt_number,
    squad_role,
    primary_position,
    is_captain
)
SELECT
    1 AS edition_id,
    team_row.id AS team_id,
    player_row.id AS player_id,
    player_row.id - (team_row.id * 100) AS shirt_number,
    'PLAYER' AS squad_role,
    player_row.primary_position,
    player_row.id = team_row.id * 100 + 1 AS is_captain
FROM team team_row
JOIN player player_row ON player_row.id BETWEEN team_row.id * 100 + 1 AND team_row.id * 100 + 3
ORDER BY team_row.id, player_row.id;

INSERT INTO match_game (
    id,
    edition_id,
    edition_phase_id,
    group_id,
    stadium_id,
    kickoff_at,
    home_team_id,
    away_team_id,
    winner_team_id,
    home_score,
    away_score,
    home_extra_score,
    away_extra_score,
    home_penalty_score,
    away_penalty_score,
    match_day
) VALUES
    (1, 1, 1, 1, 1, TIMESTAMP '2034-06-10 18:00:00', 1, 2, 1, 2, 0, 0, 0, NULL, NULL, 1),
    (2, 1, 1, 1, 2, TIMESTAMP '2034-06-11 18:00:00', 3, 4, NULL, 1, 1, 0, 0, NULL, NULL, 1),
    (3, 1, 1, 1, 3, TIMESTAMP '2034-06-15 18:00:00', 1, 3, 1, 3, 1, 0, 0, NULL, NULL, 2),
    (4, 1, 1, 1, 4, TIMESTAMP '2034-06-16 18:00:00', 2, 4, 2, 2, 0, 0, 0, NULL, NULL, 2),
    (5, 1, 1, 1, 1, TIMESTAMP '2034-06-20 18:00:00', 1, 4, NULL, 1, 1, 0, 0, NULL, NULL, 3),
    (6, 1, 1, 1, 2, TIMESTAMP '2034-06-20 21:00:00', 2, 3, 2, 2, 1, 0, 0, NULL, NULL, 3),
    (7, 1, 1, 2, 3, TIMESTAMP '2034-06-12 18:00:00', 5, 6, 5, 2, 1, 0, 0, NULL, NULL, 1),
    (8, 1, 1, 2, 4, TIMESTAMP '2034-06-13 18:00:00', 7, 8, 7, 1, 0, 0, 0, NULL, NULL, 1),
    (9, 1, 1, 2, 1, TIMESTAMP '2034-06-17 18:00:00', 5, 7, NULL, 1, 1, 0, 0, NULL, NULL, 2),
    (10, 1, 1, 2, 2, TIMESTAMP '2034-06-18 18:00:00', 6, 8, 6, 2, 0, 0, 0, NULL, NULL, 2),
    (11, 1, 1, 2, 3, TIMESTAMP '2034-06-22 18:00:00', 5, 8, 5, 2, 0, 0, 0, NULL, NULL, 3),
    (12, 1, 1, 2, 4, TIMESTAMP '2034-06-22 21:00:00', 6, 7, 6, 2, 1, 0, 0, NULL, NULL, 3),
    (13, 1, 4, NULL, 1, TIMESTAMP '2034-07-02 18:00:00', 1, 6, 1, 2, 1, 0, 0, NULL, NULL, 4),
    (14, 1, 4, NULL, 2, TIMESTAMP '2034-07-03 18:00:00', 5, 2, 5, 1, 1, 0, 0, 4, 3, 4),
    (15, 1, 5, NULL, 3, TIMESTAMP '2034-07-09 17:00:00', 6, 2, 6, 2, 0, 0, 0, NULL, NULL, 5),
    (16, 1, 6, NULL, 1, TIMESTAMP '2034-07-10 18:00:00', 1, 5, 1, 3, 2, 0, 0, NULL, NULL, 6);

INSERT INTO match_official (match_id, referee_id, role)
SELECT
    match_row.id AS match_id,
    ((match_row.id - 1) % 6) + 1 AS referee_id,
    'MAIN_REFEREE' AS role
FROM match_game match_row
ORDER BY match_row.id;

INSERT INTO match_event (
    match_id,
    event_minute,
    stoppage_minute,
    event_type,
    team_id,
    player_id,
    related_player_id,
    description
) VALUES
    (1, 18, 0, 'GOAL', 1, 101, NULL, 'Opening goal from Aurora.'),
    (1, 64, 0, 'GOAL', 1, 102, NULL, 'Aurora doubles the lead.'),
    (2, 10, 0, 'OWN_GOAL', 4, 401, NULL, 'Own goal gives Cascadia the lead.'),
    (2, 70, 0, 'GOAL', 4, 402, NULL, 'Duneshire equalizes.'),
    (3, 12, 0, 'GOAL', 1, 101, NULL, 'Aurora scores early.'),
    (3, 38, 0, 'GOAL', 3, 301, NULL, 'Cascadia responds.'),
    (3, 52, 0, 'GOAL', 1, 103, NULL, 'Aurora retakes the lead.'),
    (3, 81, 0, 'GOAL', 1, 102, NULL, 'Aurora closes the match.'),
    (4, 22, 0, 'GOAL', 2, 201, NULL, 'Borealis opens the score.'),
    (4, 58, 0, 'GOAL', 2, 202, NULL, 'Borealis adds a second goal.'),
    (5, 44, 0, 'GOAL', 1, 103, NULL, 'Aurora scores before halftime.'),
    (5, 79, 0, 'GOAL', 4, 403, NULL, 'Duneshire equalizes late.'),
    (6, 9, 0, 'GOAL', 2, 201, NULL, 'Borealis scores first.'),
    (6, 33, 0, 'GOAL', 3, 302, NULL, 'Cascadia equalizes.'),
    (6, 73, 0, 'GOAL', 2, 203, NULL, 'Borealis wins the match.'),
    (7, 16, 0, 'GOAL', 5, 501, NULL, 'Estoria opens the match.'),
    (7, 41, 0, 'GOAL', 6, 601, NULL, 'Fjordland equalizes.'),
    (7, 77, 0, 'GOAL', 5, 502, NULL, 'Estoria finds the winner.'),
    (8, 55, 0, 'GOAL', 7, 701, NULL, 'Galewood scores the only goal.'),
    (9, 29, 0, 'GOAL', 5, 503, NULL, 'Estoria scores first.'),
    (9, 62, 0, 'GOAL', 7, 702, NULL, 'Galewood equalizes.'),
    (10, 21, 0, 'GOAL', 6, 601, NULL, 'Fjordland scores first.'),
    (10, 68, 0, 'GOAL', 6, 602, NULL, 'Fjordland seals the win.'),
    (11, 14, 0, 'GOAL', 5, 501, NULL, 'Estoria breaks through.'),
    (11, 49, 0, 'GOAL', 5, 502, NULL, 'Estoria scores again.'),
    (12, 8, 0, 'GOAL', 6, 603, NULL, 'Fjordland starts fast.'),
    (12, 36, 0, 'GOAL', 7, 703, NULL, 'Galewood levels the match.'),
    (12, 83, 0, 'GOAL', 6, 601, NULL, 'Fjordland wins late.'),
    (13, 25, 0, 'GOAL', 1, 101, NULL, 'Aurora scores in the semifinal.'),
    (13, 61, 0, 'GOAL', 6, 601, NULL, 'Fjordland equalizes.'),
    (13, 88, 0, 'GOAL', 1, 102, NULL, 'Aurora reaches the final.'),
    (13, 89, 0, 'SUBSTITUTION', 1, 103, 102, 'Aurora makes a late substitution.'),
    (14, 37, 0, 'PENALTY_GOAL', 5, 501, NULL, 'Estoria converts a penalty.'),
    (14, 74, 0, 'GOAL', 2, 201, NULL, 'Borealis forces penalties.'),
    (15, 31, 0, 'GOAL', 6, 602, NULL, 'Fjordland takes the lead.'),
    (15, 69, 0, 'GOAL', 6, 603, NULL, 'Fjordland confirms third place.'),
    (16, 11, 0, 'GOAL', 1, 101, NULL, 'Aurora scores in the final.'),
    (16, 28, 0, 'GOAL', 5, 501, NULL, 'Estoria equalizes.'),
    (16, 45, 2, 'YELLOW_CARD', 1, 103, NULL, 'Aurora defender is booked.'),
    (16, 53, 0, 'GOAL', 1, 102, NULL, 'Aurora retakes the lead.'),
    (16, 66, 0, 'GOAL', 5, 502, NULL, 'Estoria levels the final.'),
    (16, 78, 0, 'RED_CARD', 5, 503, NULL, 'Estoria midfielder is sent off.'),
    (16, 84, 0, 'GOAL', 1, 103, NULL, 'Aurora wins the final.');

UPDATE world_cup_edition
SET
    champion_team_id = 1,
    vice_champion_team_id = 5,
    third_place_team_id = 6
WHERE id = 1;

COMMIT;
