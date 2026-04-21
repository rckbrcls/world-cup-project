"use client"

import * as React from "react"

import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import {
  useEditionTeamsQuery,
  useTeamHistoryQuery,
} from "@/hooks/world-cup/queries/use-teams-queries"

export function useHistorySectionData({
  selectedEditionId,
  selectedTeamId,
}: {
  selectedEditionId: number | null
  selectedTeamId: number | null
}) {
  const { databaseReady, editions, selectedEdition } =
    useEditionWorkspaceData(selectedEditionId)
  const teams = useEditionTeamsQuery(selectedEditionId, {
    enabled: databaseReady,
  })
  const teamHistory = useTeamHistoryQuery(selectedTeamId, {
    enabled: databaseReady && selectedTeamId !== null,
  })

  const selectedTeam = React.useMemo(
    () => teams.data.find((team) => team.team_id === selectedTeamId) ?? null,
    [selectedTeamId, teams.data]
  )

  return {
    databaseReady,
    editions,
    selectedEdition,
    teams,
    selectedTeam,
    teamHistory,
  }
}
