"use client"

import * as React from "react"

import { useAsyncResource } from "@/hooks/use-async-resource"
import { worldCupApi } from "@/lib/world-cup/api"
import {
  buildOverviewMetrics,
  getDefaultEditionTeamId,
  getDefaultGroupId,
  getDefaultMatchId,
  getLatestEdition,
  groupEditionGroups,
  groupMatchesByPhase,
} from "@/lib/world-cup/selectors"
import type {
  EditionMatchRow,
  EditionSummary,
  EditionTeamRow,
} from "@/lib/world-cup/types"

export type HomeSectionId =
  | "overview"
  | "teams"
  | "groups"
  | "matches"
  | "knockout"
  | "top-scorers"
  | "history"
  | "natural-query"

function selectExistingOrDefault<TValue extends number | null>(
  currentValue: TValue,
  availableValues: number[],
  defaultValue: number | null
) {
  if (currentValue !== null && availableValues.includes(currentValue)) {
    return currentValue
  }

  return defaultValue
}

export function useWorldCupDashboard() {
  const [activeSection, setActiveSection] =
    React.useState<HomeSectionId>("overview")
  const [selectedEditionId, setSelectedEditionId] = React.useState<number | null>(
    null
  )
  const [selectedTeamId, setSelectedTeamId] = React.useState<number | null>(null)
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(
    null
  )
  const [selectedMatchId, setSelectedMatchId] = React.useState<number | null>(
    null
  )
  const [isCommandOpen, setIsCommandOpen] = React.useState(false)

  const health = useAsyncResource({
    key: ["health"],
    initialData: null as { status: string } | null,
    load: (signal) => worldCupApi.health({ signal }),
  })

  const editions = useAsyncResource({
    key: ["editions"],
    initialData: [] as EditionSummary[],
    load: (signal) => worldCupApi.listEditions({ signal }),
  })

  const selectedEdition = React.useMemo(() => {
    return (
      editions.data.find((edition) => edition.edition_id === selectedEditionId) ??
      null
    )
  }, [editions.data, selectedEditionId])

  const teams = useAsyncResource({
    key: ["teams", selectedEditionId],
    enabled: selectedEditionId !== null,
    initialData: [] as EditionTeamRow[],
    load: (signal) => worldCupApi.listEditionTeams(selectedEditionId!, { signal }),
  })

  const groups = useAsyncResource({
    key: ["groups", selectedEditionId],
    enabled: selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listEditionGroups(selectedEditionId!, { signal }),
  })

  const matches = useAsyncResource({
    key: ["matches", selectedEditionId],
    enabled: selectedEditionId !== null,
    initialData: [] as EditionMatchRow[],
    load: (signal) => worldCupApi.listEditionMatches(selectedEditionId!, { signal }),
  })

  const knockout = useAsyncResource({
    key: ["knockout", selectedEditionId],
    enabled: selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listKnockoutMatches(selectedEditionId!, { signal }),
  })

  const topScorers = useAsyncResource({
    key: ["top-scorers", selectedEditionId],
    enabled: selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listTopScorers(selectedEditionId!, { signal }),
  })

  const groupedGroups = React.useMemo(
    () => groupEditionGroups(groups.data),
    [groups.data]
  )

  const selectedTeam = React.useMemo(() => {
    return teams.data.find((team) => team.team_id === selectedTeamId) ?? null
  }, [selectedTeamId, teams.data])

  const selectedGroup = React.useMemo(() => {
    return (
      groupedGroups.find((group) => group.group_id === selectedGroupId) ?? null
    )
  }, [groupedGroups, selectedGroupId])

  const selectedMatch = React.useMemo(() => {
    return matches.data.find((match) => match.match_id === selectedMatchId) ?? null
  }, [matches.data, selectedMatchId])

  const standings = useAsyncResource({
    key: ["standings", selectedGroupId],
    enabled: selectedGroupId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listGroupStandings(selectedGroupId!, { signal }),
  })

  const teamHistory = useAsyncResource({
    key: ["history", selectedTeamId],
    enabled: selectedTeamId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listTeamHistory(selectedTeamId!, { signal }),
  })

  const squad = useAsyncResource({
    key: ["squad", selectedEditionId, selectedTeamId],
    enabled: selectedEditionId !== null && selectedTeamId !== null,
    initialData: [],
    load: (signal) =>
      worldCupApi.listTeamSquad(selectedEditionId!, selectedTeamId!, { signal }),
  })

  const matchEvents = useAsyncResource({
    key: ["match-events", selectedMatchId],
    enabled: selectedMatchId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listMatchEvents(selectedMatchId!, { signal }),
  })

  React.useEffect(() => {
    if (selectedEditionId !== null || !editions.data.length) {
      return
    }

    setSelectedEditionId(getLatestEdition(editions.data)?.edition_id ?? null)
  }, [editions.data, selectedEditionId])

  React.useEffect(() => {
    const nextTeamId = selectExistingOrDefault(
      selectedTeamId,
      teams.data.map((team) => team.team_id),
      getDefaultEditionTeamId(selectedEdition, teams.data)
    )

    if (nextTeamId !== selectedTeamId) {
      setSelectedTeamId(nextTeamId)
    }
  }, [selectedEdition, selectedTeamId, teams.data])

  React.useEffect(() => {
    const nextGroupId = selectExistingOrDefault(
      selectedGroupId,
      groupedGroups.map((group) => group.group_id),
      getDefaultGroupId(groupedGroups)
    )

    if (nextGroupId !== selectedGroupId) {
      setSelectedGroupId(nextGroupId)
    }
  }, [groupedGroups, selectedGroupId])

  React.useEffect(() => {
    const nextMatchId = selectExistingOrDefault(
      selectedMatchId,
      matches.data.map((match) => match.match_id),
      getDefaultMatchId(matches.data)
    )

    if (nextMatchId !== selectedMatchId) {
      setSelectedMatchId(nextMatchId)
    }
  }, [matches.data, selectedMatchId])

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

  const matchesByPhase = React.useMemo(
    () => groupMatchesByPhase(matches.data),
    [matches.data]
  )

  const knockoutByPhase = React.useMemo(
    () => groupMatchesByPhase(knockout.data),
    [knockout.data]
  )

  const focusSection = React.useCallback((section: HomeSectionId) => {
    React.startTransition(() => {
      setActiveSection(section)
      setIsCommandOpen(false)
    })
  }, [])

  const focusTeam = React.useCallback(
    (teamId: number, nextSection: HomeSectionId = "teams") => {
      React.startTransition(() => {
        setSelectedTeamId(teamId)
        setActiveSection(nextSection)
        setIsCommandOpen(false)
      })
    },
    []
  )

  const focusMatch = React.useCallback((matchId: number) => {
    React.startTransition(() => {
      setSelectedMatchId(matchId)
      setActiveSection("matches")
      setIsCommandOpen(false)
    })
  }, [])

  const focusGroup = React.useCallback((groupId: number) => {
    React.startTransition(() => {
      setSelectedGroupId(groupId)
      setActiveSection("groups")
      setIsCommandOpen(false)
    })
  }, [])

  const focusEdition = React.useCallback((editionId: number) => {
    React.startTransition(() => {
      setSelectedEditionId(editionId)
      setActiveSection("overview")
      setIsCommandOpen(false)
    })
  }, [])

  return {
    activeSection,
    setActiveSection: focusSection,
    isCommandOpen,
    setIsCommandOpen,
    selectedEditionId,
    selectedEdition,
    selectedTeamId,
    selectedTeam,
    selectedGroupId,
    selectedGroup,
    selectedMatchId,
    selectedMatch,
    health,
    editions,
    teams,
    groups,
    groupedGroups,
    standings,
    matches,
    matchesByPhase,
    knockout,
    knockoutByPhase,
    topScorers,
    teamHistory,
    squad,
    matchEvents,
    overviewMetrics,
    focusEdition,
    focusGroup,
    focusMatch,
    focusSection,
    focusTeam,
  }
}
