export type MatchEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "PENALTY_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"

export type ApiHealth = {
  status: string
}

export type EditionSummary = {
  edition_id: number
  edition_year: number
  host_country: string
  champion_team: string | null
  vice_champion_team: string | null
  third_place_team: string | null
}

export type EditionTeamRow = {
  edition_id: number
  edition_year: number
  team_id: number
  team_name: string
  country_name: string
  coach_name: string
  group_letter: string | null
  final_rank: number | null
}

export type EditionGroupRow = {
  edition_id: number
  edition_year: number
  group_id: number
  group_letter: string
  team_id: number | null
  team_name: string | null
  coach_name: string | null
}

export type GroupStandingRow = {
  rank_position: number
  group_id: number
  group_letter: string
  team_id: number
  team_name: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export type EditionMatchRow = {
  match_id: number
  edition_id: number
  edition_year: number
  phase_name: string
  group_letter: string | null
  kickoff_at: string
  stadium_name: string
  host_city_name: string
  home_team_name: string
  away_team_name: string
  final_score: string
  penalty_score: string | null
  winner_team_name: string | null
}

export type KnockoutMatchRow = {
  match_id: number
  edition_year: number
  phase_name: string
  kickoff_at: string
  stadium_name: string
  home_team_name: string
  away_team_name: string
  final_score: string
  penalty_score: string | null
  winner_team_name: string | null
}

export type TeamSquadRow = {
  edition_id: number
  edition_year: number
  team_id: number
  team_name: string
  shirt_number: number
  player_id: number
  player_name: string
  primary_position: string
  squad_role: string
  is_captain: boolean
}

export type MatchEventRow = {
  event_id: number
  match_id: number
  minute_label: string
  event_type: MatchEventType
  team_name: string
  player_name: string | null
  related_player_name: string | null
  description: string | null
}

export type TopScorerRow = {
  rank_position: number
  edition_id: number
  edition_year: number
  player_id: number
  player_name: string
  team_id: number
  team_name: string
  total_goals: number
}

export type TeamHistoryRow = {
  edition_id: number
  edition_year: number
  team_id: number
  team_name: string
  final_rank: number | null
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
}
