"use client"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useEditionTeamsQuery } from "@/hooks/world-cup/queries/use-teams-queries"

export function useTeamsSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const teams = useEditionTeamsQuery(selectedEditionId, {
    enabled: databaseReady,
  })

  return {
    databaseReady,
    editions,
    selectedEdition,
    teams,
  }
}
