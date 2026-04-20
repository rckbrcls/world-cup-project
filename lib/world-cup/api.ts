import type {
  ApiHealth,
  EditionGroupRow,
  EditionMatchRow,
  EditionSummary,
  EditionTeamRow,
  GroupStandingRow,
  KnockoutMatchRow,
  MatchEventRow,
  TeamHistoryRow,
  TeamSquadRow,
  TopScorerRow,
} from "@/lib/world-cup/types"

const WORLD_CUP_PROXY_BASE = "/api/world-cup"

export class WorldCupApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly path: string
  ) {
    super(message)
    this.name = "WorldCupApiError"
  }
}

type RequestOptions = {
  signal?: AbortSignal
}

async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${WORLD_CUP_PROXY_BASE}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
    signal: options.signal,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Ignore invalid JSON payloads and surface the default error message.
    }

    throw new WorldCupApiError(message, response.status, path)
  }

  return (await response.json()) as T
}

export const worldCupApi = {
  health: (options?: RequestOptions) =>
    requestJson<ApiHealth>("/health", options),
  listEditions: (options?: RequestOptions) =>
    requestJson<EditionSummary[]>("/editions", options),
  listEditionTeams: (editionId: number, options?: RequestOptions) =>
    requestJson<EditionTeamRow[]>(`/editions/${editionId}/teams`, options),
  listEditionGroups: (editionId: number, options?: RequestOptions) =>
    requestJson<EditionGroupRow[]>(`/editions/${editionId}/groups`, options),
  listGroupStandings: (groupId: number, options?: RequestOptions) =>
    requestJson<GroupStandingRow[]>(`/groups/${groupId}/standings`, options),
  listEditionMatches: (editionId: number, options?: RequestOptions) =>
    requestJson<EditionMatchRow[]>(`/editions/${editionId}/matches`, options),
  listKnockoutMatches: (editionId: number, options?: RequestOptions) =>
    requestJson<KnockoutMatchRow[]>(
      `/editions/${editionId}/knockout`,
      options
    ),
  listTeamSquad: (
    editionId: number,
    teamId: number,
    options?: RequestOptions
  ) =>
    requestJson<TeamSquadRow[]>(
      `/editions/${editionId}/teams/${teamId}/squad`,
      options
    ),
  listMatchEvents: (matchId: number, options?: RequestOptions) =>
    requestJson<MatchEventRow[]>(`/matches/${matchId}/events`, options),
  listTopScorers: (editionId: number, options?: RequestOptions) =>
    requestJson<TopScorerRow[]>(`/editions/${editionId}/top-scorers`, options),
  listTeamHistory: (teamId: number, options?: RequestOptions) =>
    requestJson<TeamHistoryRow[]>(`/teams/${teamId}/history`, options),
}
