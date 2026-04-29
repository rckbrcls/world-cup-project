"use client"

import * as React from "react"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useEditionGroupsQuery } from "@/hooks/world-cup/queries/use-groups-queries"
import { groupEditionGroups } from "@/lib/world-cup/selectors"

export function useGroupsSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const groups = useEditionGroupsQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const groupedGroups = React.useMemo(
    () => groupEditionGroups(groups.data),
    [groups.data]
  )

  return {
    databaseReady,
    editions,
    selectedEdition,
    groups,
    groupedGroups,
  }
}
