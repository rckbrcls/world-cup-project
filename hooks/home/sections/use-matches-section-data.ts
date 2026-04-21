"use client"

import * as React from "react"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useEditionMatchesQuery } from "@/hooks/world-cup/queries/use-matches-queries"
import { groupMatchesByPhase } from "@/lib/world-cup/selectors"

export function useMatchesSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const matches = useEditionMatchesQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const matchesByPhase = React.useMemo(
    () => groupMatchesByPhase(matches.data),
    [matches.data]
  )

  return {
    databaseReady,
    editions,
    selectedEdition,
    matches,
    matchesByPhase,
  }
}
