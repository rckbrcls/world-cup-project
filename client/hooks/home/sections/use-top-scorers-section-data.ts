"use client"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useTopScorersQuery } from "@/hooks/world-cup/queries/use-matches-queries"

export function useTopScorersSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const topScorers = useTopScorersQuery(selectedEditionId, {
    enabled: databaseReady,
  })

  return {
    databaseReady,
    editions,
    selectedEdition,
    topScorers,
  }
}
