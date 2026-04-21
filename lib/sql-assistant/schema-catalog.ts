const coreTables = [
  "confederation(id, name, code)",
  "country(id, name, fifa_code, confederation_id)",
  "team(id, name, fifa_code, country_id)",
  "coach(id, full_name, birth_date, country_id)",
  "referee(id, full_name, country_id)",
  "player(id, full_name, birth_date, primary_position, country_of_birth_id)",
  "world_cup_edition(id, year, host_country_id, start_date, end_date, champion_team_id, vice_champion_team_id, third_place_team_id)",
  "host_city(id, name, country_id)",
  "stadium(id, name, host_city_id, capacity)",
  "edition_host_city(edition_id, host_city_id)",
  "competition_phase(id, code, display_name, phase_kind, sort_order, allows_draw)",
  "edition_phase(id, edition_id, phase_id, label, stage_order)",
  "team_group(id, edition_id, group_letter)",
  "edition_team(id, edition_id, team_id, coach_id, group_id, final_rank)",
  "team_call_up(edition_id, team_id, player_id, shirt_number, squad_role, primary_position, is_captain)",
  "match_game(id, edition_id, edition_phase_id, group_id, stadium_id, kickoff_at, home_team_id, away_team_id, winner_team_id, home_score, away_score, home_extra_score, away_extra_score, home_penalty_score, away_penalty_score, match_day)",
  "match_official(match_id, referee_id, role)",
  "match_event(id, match_id, event_minute, stoppage_minute, event_type, team_id, player_id, related_player_id, description)",
]

const curatedViews = [
  "world_cup.vw_match_scoreboard(match_id, edition_id, edition_year, stage_order, phase_code, phase_name, phase_kind, group_letter, match_day, kickoff_at, stadium_name, host_city_name, home_team_id, home_team_name, away_team_id, away_team_name, winner_team_id, winner_team_name, home_score, away_score, home_extra_score, away_extra_score, home_penalty_score, away_penalty_score, final_home_goals, final_away_goals)",
  "world_cup.vw_match_team_summary(match_id, edition_id, edition_year, phase_code, phase_name, phase_kind, group_letter, kickoff_at, team_id, team_name, opponent_team_id, opponent_team_name, goals_for, goals_against, result, points)",
]

const curatedFunctions = [
  "world_cup.fn_list_editions() -> (edition_id, edition_year, host_country_name, champion_team_name, vice_champion_team_name, third_place_team_name)",
  "world_cup.fn_list_edition_teams(p_edition_id) -> (edition_id, edition_year, team_id, team_name, country_name, coach_name, group_letter, final_rank)",
  "world_cup.fn_list_all_edition_teams() -> (edition_id, edition_year, team_id, team_name, country_name, coach_name, group_letter, final_rank)",
  "world_cup.fn_list_edition_groups(p_edition_id) -> (edition_id, edition_year, group_id, group_letter, team_id, team_name, coach_name)",
  "world_cup.fn_group_standings(p_group_id) -> (group_id, edition_id, edition_year, group_letter, team_id, team_name, matches_played, wins, draws, losses, goals_for, goals_against, goal_difference, points, standing_position)",
  "world_cup.fn_list_edition_matches(p_edition_id) -> (match_id, edition_id, edition_year, phase_name, phase_kind, group_letter, kickoff_at, stadium_name, host_city_name, home_team_name, away_team_name, final_score, winner_team_name)",
  "world_cup.fn_knockout_path(p_edition_id) -> (match_id, edition_id, edition_year, phase_name, phase_kind, kickoff_at, stadium_name, home_team_name, away_team_name, final_score, winner_team_name)",
  "world_cup.fn_list_team_squad(p_edition_id, p_team_id) -> (edition_id, edition_year, team_id, team_name, player_id, player_name, shirt_number, squad_role, primary_position, is_captain)",
  "world_cup.fn_list_match_events(p_match_id) -> (match_id, edition_year, phase_name, home_team_name, away_team_name, event_minute, stoppage_minute, event_type, team_name, player_name, related_player_name, description)",
  "world_cup.fn_top_scorers(p_edition_id) -> (rank_position, edition_id, edition_year, player_id, player_name, team_id, team_name, total_goals)",
  "world_cup.fn_team_history(p_team_id) -> (edition_id, edition_year, team_id, team_name, final_rank, matches_played, wins, draws, losses, goals_for, goals_against)",
]

const domainVocabulary = [
  "editions",
  "national teams",
  "groups",
  "standings",
  "matches",
  "knockout path",
  "stadiums",
  "host cities",
  "players",
  "coaches",
  "referees",
  "call-ups",
  "match events",
  "top scorers",
  "team history",
]

const preferredReportingMappings = [
  "editions -> SELECT * FROM world_cup.fn_list_editions()",
  "teams of one edition -> SELECT * FROM world_cup.fn_list_edition_teams(<edition_id>)",
  "teams across all editions -> SELECT * FROM world_cup.fn_list_all_edition_teams()",
  "teams of latest edition -> SELECT * FROM world_cup.fn_list_edition_teams((SELECT edition_id FROM world_cup.fn_list_editions() ORDER BY edition_year DESC LIMIT 1))",
  "groups of one edition -> SELECT * FROM world_cup.fn_list_edition_groups(<edition_id>)",
  "group standings -> SELECT * FROM world_cup.fn_group_standings(<group_id>)",
  "edition matches -> SELECT * FROM world_cup.fn_list_edition_matches(<edition_id>)",
  "knockout path -> SELECT * FROM world_cup.fn_knockout_path(<edition_id>)",
  "team squad in one edition -> SELECT * FROM world_cup.fn_list_team_squad(<edition_id>, <team_id>)",
  "match events -> SELECT * FROM world_cup.fn_list_match_events(<match_id>)",
  "top scorers -> SELECT * FROM world_cup.fn_top_scorers(<edition_id>) ORDER BY rank_position LIMIT <n>",
  "team goals from top scorers -> SELECT team_name, SUM(total_goals) AS total_goals FROM world_cup.fn_top_scorers(<edition_id>) GROUP BY team_name ORDER BY total_goals DESC, team_name LIMIT <n>",
  "team history -> SELECT * FROM world_cup.fn_team_history(<team_id>)",
]

export function buildSchemaCatalogPrompt() {
  return [
    "Approved schema namespace:",
    "- world_cup",
    "",
    "Core tables:",
    ...coreTables.map((table) => `- ${table}`),
    "",
    "Reusable SQL surfaces:",
    ...curatedViews.map((view) => `- ${view}`),
    ...curatedFunctions.map((fnName) => `- ${fnName}`),
    "",
    "Preferred reporting mappings:",
    ...preferredReportingMappings.map((mapping) => `- ${mapping}`),
    "",
    "SQL safety reminders:",
    "- Use only columns that exist in the tables, views, or function signatures above.",
    "- Do not invent helper columns such as goals when the function returns total_goals.",
    "- Do not reference an alias from an outer query inside a sibling or nested subquery unless that alias is actually in scope there.",
    "- If an ID is missing, prefer a nested SELECT that derives it from a known reporting surface before asking for clarification.",
    "",
    "Domain vocabulary:",
    `- ${domainVocabulary.join(", ")}`,
  ].join("\n")
}
