import type {
  EditionTeamRow,
  TeamHistoryRow,
  TeamSquadRow,
} from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function listEditionTeams(
  editionId: number,
  options?: RequestOptions
) {
  return requestJson<EditionTeamRow[]>(`/editions/${editionId}/teams`, options)
}

export function listTeamHistory(teamId: number, options?: RequestOptions) {
  return requestJson<TeamHistoryRow[]>(`/teams/${teamId}/history`, options)
}

export function listTeamSquad(
  editionId: number,
  teamId: number,
  options?: RequestOptions
) {
  return requestJson<TeamSquadRow[]>(
    `/editions/${editionId}/teams/${teamId}/squad`,
    options
  )
}
