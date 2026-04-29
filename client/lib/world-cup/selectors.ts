import type {
  EditionGroupRow,
  EditionMatchRow,
  EditionSummary,
  EditionTeamRow,
  GroupStandingRow,
  KnockoutMatchRow,
  TeamHistoryRow,
  TopScorerRow,
} from "@/lib/world-cup/types"

export type GroupSummary = {
  group_id: number
  group_letter: string
  teams: EditionGroupRow[]
}

export type MatchPhaseSummary<TMatch> = {
  phase_name: string
  matches: TMatch[]
}

export type OverviewMetrics = {
  teamCount: number
  groupCount: number
  totalMatches: number
  knockoutMatches: number
  leadingScorer: TopScorerRow | null
  totalGoals: number
}

export type TeamHistorySummary = {
  participations: number
  titles: number
  podiums: number
  totalMatches: number
  totalWins: number
  totalDraws: number
  totalLosses: number
  goalBalance: number
}

function sortByStringValue(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "")
}

export function getLatestEdition(editions: EditionSummary[]) {
  return [...editions].sort((left, right) => left.edition_year - right.edition_year).at(-1) ?? null
}

export function groupEditionGroups(rows: EditionGroupRow[]) {
  const groups = new Map<number, GroupSummary>()

  for (const row of rows) {
    const current = groups.get(row.group_id)

    if (current) {
      current.teams.push(row)
      continue
    }

    groups.set(row.group_id, {
      group_id: row.group_id,
      group_letter: row.group_letter,
      teams: [row],
    })
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      teams: [...group.teams].sort((left, right) =>
        sortByStringValue(left.team_name, right.team_name)
      ),
    }))
    .sort((left, right) => left.group_letter.localeCompare(right.group_letter))
}

export function groupMatchesByPhase<TMatch extends { phase_name: string }>(
  matches: TMatch[]
) {
  const phases = new Map<string, MatchPhaseSummary<TMatch>>()

  for (const match of matches) {
    const current = phases.get(match.phase_name)

    if (current) {
      current.matches.push(match)
      continue
    }

    phases.set(match.phase_name, {
      phase_name: match.phase_name,
      matches: [match],
    })
  }

  return [...phases.values()]
}

export function getDefaultEditionTeamId(
  edition: EditionSummary | null,
  teams: EditionTeamRow[]
) {
  if (!teams.length) {
    return null
  }

  if (edition?.champion_team) {
    const champion = teams.find((team) => team.team_name === edition.champion_team)
    if (champion) {
      return champion.team_id
    }
  }

  return [...teams]
    .sort((left, right) => {
      const byRank = (left.final_rank ?? Number.MAX_SAFE_INTEGER) -
        (right.final_rank ?? Number.MAX_SAFE_INTEGER)

      if (byRank !== 0) {
        return byRank
      }

      return left.team_name.localeCompare(right.team_name)
    })
    .at(0)?.team_id ?? null
}

export function getDefaultGroupId(groups: GroupSummary[]) {
  return groups.at(0)?.group_id ?? null
}

export function getDefaultMatchId(matches: EditionMatchRow[]) {
  return matches.at(-1)?.match_id ?? null
}

export function buildOverviewMetrics(params: {
  teams: EditionTeamRow[]
  groups: GroupSummary[]
  matches: EditionMatchRow[]
  knockout: KnockoutMatchRow[]
  topScorers: TopScorerRow[]
}) {
  const totalGoals = params.matches.reduce((total, match) => {
    const parsed = parseScore(match.final_score)
    if (!parsed) {
      return total
    }

    return total + parsed.homeGoals + parsed.awayGoals
  }, 0)

  return {
    teamCount: params.teams.length,
    groupCount: params.groups.length,
    totalMatches: params.matches.length,
    knockoutMatches: params.knockout.length,
    leadingScorer: params.topScorers.at(0) ?? null,
    totalGoals,
  } satisfies OverviewMetrics
}

export function summarizeTeamHistory(history: TeamHistoryRow[]) {
  return history.reduce<TeamHistorySummary>(
    (summary, row) => {
      summary.participations += 1
      summary.titles += row.final_rank === 1 ? 1 : 0
      summary.podiums +=
        row.final_rank !== null && row.final_rank <= 3 ? 1 : 0
      summary.totalMatches += row.matches_played
      summary.totalWins += row.wins
      summary.totalDraws += row.draws
      summary.totalLosses += row.losses
      summary.goalBalance += row.goals_for - row.goals_against
      return summary
    },
    {
      participations: 0,
      titles: 0,
      podiums: 0,
      totalMatches: 0,
      totalWins: 0,
      totalDraws: 0,
      totalLosses: 0,
      goalBalance: 0,
    }
  )
}

export function getSelectedGroupStandings(
  standings: GroupStandingRow[],
  selectedTeamId: number | null
) {
  if (!selectedTeamId) {
    return null
  }

  return standings.find((row) => row.team_id === selectedTeamId) ?? null
}

export function parseScore(score: string) {
  const [homeValue, awayValue] = score.split("-").map((value) => value.trim())
  const homeGoals = Number(homeValue)
  const awayGoals = Number(awayValue)

  if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) {
    return null
  }

  return { homeGoals, awayGoals }
}
