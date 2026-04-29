"use client"

import * as React from "react"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useKnockoutMatchesQuery } from "@/hooks/world-cup/queries/use-matches-queries"
import { groupMatchesByPhase } from "@/lib/world-cup/selectors"

export function useKnockoutSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const knockout = useKnockoutMatchesQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const knockoutByPhase = React.useMemo(
    () => groupMatchesByPhase(knockout.data),
    [knockout.data]
  )

  return {
    databaseReady,
    editions,
    selectedEdition,
    knockout,
    knockoutByPhase,
  }
}
