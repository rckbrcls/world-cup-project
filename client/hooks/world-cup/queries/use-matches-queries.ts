"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  listEditionMatches,
  listKnockoutMatches,
  listMatchEvents,
  listTopScorers,
} from "@/lib/services/world-cup/matches-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useEditionMatchesQuery(
  editionId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "matches"]
        : worldCupQueryKeys.editionMatches(editionId),
    queryFn: ({ signal }) => listEditionMatches(editionId!, { signal }),
    enabled: (options?.enabled ?? true) && editionId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useKnockoutMatchesQuery(
  editionId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "knockout"]
        : worldCupQueryKeys.knockoutMatches(editionId),
    queryFn: ({ signal }) => listKnockoutMatches(editionId!, { signal }),
    enabled: (options?.enabled ?? true) && editionId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useTopScorersQuery(
  editionId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "top-scorers"]
        : worldCupQueryKeys.topScorers(editionId),
    queryFn: ({ signal }) => listTopScorers(editionId!, { signal }),
    enabled: (options?.enabled ?? true) && editionId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useMatchEventsQuery(
  matchId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      matchId === null
        ? [...worldCupQueryKeys.all, "match", "unknown", "events"]
        : worldCupQueryKeys.matchEvents(matchId),
    queryFn: ({ signal }) => listMatchEvents(matchId!, { signal }),
    enabled: (options?.enabled ?? true) && matchId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}
