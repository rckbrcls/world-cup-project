"use client"

import * as React from "react"

import { useGroupsSectionData } from "@/hooks/home/sections/use-groups-section-data"
import { useGroupStandingsQuery } from "@/hooks/world-cup/queries/use-groups-queries"

export function useGroupDetailData({
  selectedEditionId,
  selectedGroupId,
}: {
  selectedEditionId: number | null
  selectedGroupId: number | null
}) {
  const groupsData = useGroupsSectionData({
    selectedEditionId,
  })
  const selectedGroup = React.useMemo(
    () =>
      groupsData.groupedGroups.find(
        (group) => group.group_id === selectedGroupId
      ) ?? null,
    [groupsData.groupedGroups, selectedGroupId]
  )
  const standings = useGroupStandingsQuery(selectedGroupId, {
    enabled: groupsData.databaseReady && selectedGroupId !== null,
  })

  return {
    ...groupsData,
    selectedGroup,
    standings,
  }
}
