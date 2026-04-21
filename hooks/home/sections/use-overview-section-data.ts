"use client"

import * as React from "react"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useEditionGroupsQuery } from "@/hooks/world-cup/queries/use-groups-queries"
import {
  useEditionMatchesQuery,
  useKnockoutMatchesQuery,
  useTopScorersQuery,
} from "@/hooks/world-cup/queries/use-matches-queries"
import { useEditionTeamsQuery } from "@/hooks/world-cup/queries/use-teams-queries"
import {
  buildOverviewMetrics,
  groupEditionGroups,
} from "@/lib/world-cup/selectors"

export function useOverviewSectionData({
  selectedEditionId,
}: {
  selectedEditionId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)

  const teams = useEditionTeamsQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const groups = useEditionGroupsQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const matches = useEditionMatchesQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const knockout = useKnockoutMatchesQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const topScorers = useTopScorersQuery(selectedEditionId, {
    enabled: databaseReady,
  })

  const groupedGroups = React.useMemo(
    () => groupEditionGroups(groups.data),
    [groups.data]
  )
  const overviewMetrics = React.useMemo(
    () =>
      buildOverviewMetrics({
        teams: teams.data,
        groups: groupedGroups,
        matches: matches.data,
        knockout: knockout.data,
        topScorers: topScorers.data,
      }),
    [groupedGroups, knockout.data, matches.data, teams.data, topScorers.data]
  )

  return {
    databaseReady,
    editions,
    selectedEdition,
    teams,
    groups,
    groupedGroups,
    matches,
    knockout,
    topScorers,
    overviewMetrics,
  }
}
