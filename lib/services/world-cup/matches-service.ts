import type {
  EditionMatchRow,
  KnockoutMatchRow,
  MatchEventRow,
  TopScorerRow,
} from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function listEditionMatches(
  editionId: number,
  options?: RequestOptions
) {
  return requestJson<EditionMatchRow[]>(
    `/editions/${editionId}/matches`,
    options
  )
}

export function listKnockoutMatches(
  editionId: number,
  options?: RequestOptions
) {
  return requestJson<KnockoutMatchRow[]>(
    `/editions/${editionId}/knockout`,
    options
  )
}

export function listMatchEvents(matchId: number, options?: RequestOptions) {
  return requestJson<MatchEventRow[]>(`/matches/${matchId}/events`, options)
}

export function listTopScorers(
  editionId: number,
  options?: RequestOptions
) {
  return requestJson<TopScorerRow[]>(
    `/editions/${editionId}/top-scorers`,
    options
  )
}
