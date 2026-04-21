"use client"

import { useHistorySectionData } from "@/hooks/home/sections/use-history-section-data"
import { useTeamSquadQuery } from "@/hooks/world-cup/queries/use-teams-queries"

export function useTeamDetailData({
  selectedEditionId,
  selectedTeamId,
}: {
  selectedEditionId: number | null
  selectedTeamId: number | null
}) {
  const historyData = useHistorySectionData({
    selectedEditionId,
    selectedTeamId,
  })
  const squad = useTeamSquadQuery(selectedEditionId, selectedTeamId, {
    enabled: historyData.databaseReady && selectedTeamId !== null,
  })

  return {
    ...historyData,
    squad,
  }
}
