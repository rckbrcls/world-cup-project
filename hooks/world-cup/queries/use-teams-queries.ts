"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  listEditionTeams,
  listTeamHistory,
  listTeamSquad,
} from "@/lib/services/world-cup/teams-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useEditionTeamsQuery(
  editionId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "teams"]
        : worldCupQueryKeys.editionTeams(editionId),
    queryFn: ({ signal }) => listEditionTeams(editionId!, { signal }),
    enabled: (options?.enabled ?? true) && editionId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useTeamHistoryQuery(
  teamId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      teamId === null
        ? [...worldCupQueryKeys.all, "team", "unknown", "history"]
        : worldCupQueryKeys.teamHistory(teamId),
    queryFn: ({ signal }) => listTeamHistory(teamId!, { signal }),
    enabled: (options?.enabled ?? true) && teamId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}

export function useTeamSquadQuery(
  editionId: number | null,
  teamId: number | null,
  options?: { enabled?: boolean }
) {
  const query = useQuery({
    queryKey:
      editionId === null || teamId === null
        ? [...worldCupQueryKeys.all, "edition", "unknown", "team", "unknown", "squad"]
        : worldCupQueryKeys.teamSquad(editionId, teamId),
    queryFn: ({ signal }) => listTeamSquad(editionId!, teamId!, { signal }),
    enabled:
      (options?.enabled ?? true) && editionId !== null && teamId !== null,
    placeholderData: keepPreviousData,
  })

  return toQueryResource(query, [])
}
