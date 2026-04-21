"use client"

import * as React from "react"

import { useMatchesSectionData } from "@/hooks/home/sections/use-matches-section-data"
import { useMatchEventsQuery } from "@/hooks/world-cup/queries/use-matches-queries"

export function useMatchDetailData({
  selectedEditionId,
  selectedMatchId,
}: {
  selectedEditionId: number | null
  selectedMatchId: number | null
}) {
  const matchesData = useMatchesSectionData({
    selectedEditionId,
  })
  const selectedMatch = React.useMemo(
    () =>
      matchesData.matches.data.find(
        (match) => match.match_id === selectedMatchId
      ) ?? null,
    [matchesData.matches.data, selectedMatchId]
  )
  const matchEvents = useMatchEventsQuery(selectedMatchId, {
    enabled: matchesData.databaseReady && selectedMatchId !== null,
  })

  return {
    ...matchesData,
    selectedMatch,
    matchEvents,
  }
}
