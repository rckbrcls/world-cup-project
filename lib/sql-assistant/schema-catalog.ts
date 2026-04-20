const coreTables = [
  "confederation(id, name, code)",
  "country(id, name, confederation_id)",
  "team(id, name, country_id)",
  "coach(id, full_name, country_id)",
  "referee(id, full_name, country_id)",
  "player(id, full_name, birth_date, country_id, preferred_position)",
  "world_cup_edition(id, year, host_country_id, start_date, end_date, champion_team_id, vice_champion_team_id, third_place_team_id)",
  "host_city(id, name, country_id)",
  "stadium(id, name, host_city_id, capacity)",
  "edition_host_city(edition_id, host_city_id)",
  "competition_phase(id, code, display_name, phase_kind, allows_draw)",
  "edition_phase(id, edition_id, phase_id, stage_order)",
  "team_group(id, edition_id, group_letter)",
  "edition_team(id, edition_id, team_id, coach_id, group_id, final_rank)",
  "team_call_up(id, edition_id, team_id, player_id, shirt_number, squad_role, primary_position, is_captain)",
  "match_game(id, edition_id, edition_phase_id, group_id, stadium_id, kickoff_at, home_team_id, away_team_id, winner_team_id, scores..., match_day)",
  "match_official(id, match_id, referee_id, role)",
  "match_event(id, match_id, event_minute, stoppage_minute, event_type, team_id, player_id, related_player_id, description)",
]

const curatedViews = [
  "world_cup.vw_match_scoreboard: match-level reporting surface with edition, phase, group, stadium, teams, final goals, penalty scores, and winner.",
  "world_cup.vw_match_team_summary: team-level match summary with opponent, result, goals for/against, and group-stage points.",
]

const curatedFunctions = [
  "world_cup.fn_list_editions()",
  "world_cup.fn_list_edition_teams(p_edition_id)",
  "world_cup.fn_list_edition_groups(p_edition_id)",
  "world_cup.fn_group_standings(p_group_id)",
  "world_cup.fn_list_edition_matches(p_edition_id)",
  "world_cup.fn_knockout_path(p_edition_id)",
  "world_cup.fn_list_team_squad(p_edition_id, p_team_id)",
  "world_cup.fn_list_match_events(p_match_id)",
  "world_cup.fn_top_scorers(p_edition_id)",
  "world_cup.fn_team_history(p_team_id)",
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
    "Domain vocabulary:",
    `- ${domainVocabulary.join(", ")}`,
  ].join("\n")
}
