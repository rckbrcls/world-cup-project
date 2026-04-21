"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  listEditionGroups,
  listGroupStandings,
} from "@/lib/services/world-cup/groups-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useEditionGroupsQuery(
  editionId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "groups"]
        : worldCupQueryKeys.editionGroups(editionId),
    queryFn: ({ signal }) => listEditionGroups(editionId!, { signal }),
    enabled: (options?.enabled ?? true) && editionId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useGroupStandingsQuery(
  groupId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      groupId === null
        ? [...worldCupQueryKeys.all, "group", "unknown", "standings"]
        : worldCupQueryKeys.groupStandings(groupId),
    queryFn: ({ signal }) => listGroupStandings(groupId!, { signal }),
    enabled: (options?.enabled ?? true) && groupId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}
