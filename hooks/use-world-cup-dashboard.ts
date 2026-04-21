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
  SyntheticDataOperationResult,
  SyntheticDataStatus,
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
  const [preferredEditionId, setPreferredEditionId] =
    React.useState<number | null>(null)
  const [preferredTeamId, setPreferredTeamId] = React.useState<number | null>(
    null
  )
  const [preferredGroupId, setPreferredGroupId] = React.useState<number | null>(
    null
  )
  const [preferredMatchId, setPreferredMatchId] = React.useState<number | null>(
    null
  )
  const [isCommandOpen, setIsCommandOpen] = React.useState(false)

  const health = useAsyncResource({
    key: ["health"],
    initialData: null as { status: string } | null,
    load: (signal) => worldCupApi.health({ signal }),
  })

  const syntheticDataStatus = useAsyncResource({
    key: ["synthetic-data-status"],
    initialData: null as SyntheticDataStatus | null,
    load: (signal) => worldCupApi.getSyntheticDataStatus({ signal }),
  })

  const editions = useAsyncResource({
    key: ["editions"],
    initialData: [] as EditionSummary[],
    load: (signal) => worldCupApi.listEditions({ signal }),
  })

  const selectedEditionId = React.useMemo(
    () =>
      selectExistingOrDefault(
        preferredEditionId,
        editions.data.map((edition) => edition.edition_id),
        getLatestEdition(editions.data)?.edition_id ?? null
      ),
    [editions.data, preferredEditionId]
  )

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

  const selectedTeamId = React.useMemo(
    () =>
      selectExistingOrDefault(
        preferredTeamId,
        teams.data.map((team) => team.team_id),
        getDefaultEditionTeamId(selectedEdition, teams.data)
      ),
    [preferredTeamId, selectedEdition, teams.data]
  )

  const selectedTeam = React.useMemo(() => {
    return teams.data.find((team) => team.team_id === selectedTeamId) ?? null
  }, [selectedTeamId, teams.data])

  const selectedGroupId = React.useMemo(
    () =>
      selectExistingOrDefault(
        preferredGroupId,
        groupedGroups.map((group) => group.group_id),
        getDefaultGroupId(groupedGroups)
      ),
    [groupedGroups, preferredGroupId]
  )

  const selectedGroup = React.useMemo(() => {
    return (
      groupedGroups.find((group) => group.group_id === selectedGroupId) ?? null
    )
  }, [groupedGroups, selectedGroupId])

  const selectedMatchId = React.useMemo(
    () =>
      selectExistingOrDefault(
        preferredMatchId,
        matches.data.map((match) => match.match_id),
        getDefaultMatchId(matches.data)
      ),
    [matches.data, preferredMatchId]
  )

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

  const [syntheticMutationAction, setSyntheticMutationAction] =
    React.useState<"populate" | "cleanup" | null>(null)
  const [syntheticMutationErrorMessage, setSyntheticMutationErrorMessage] =
    React.useState<string | null>(null)

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

  const reloadAllData = React.useCallback(() => {
    syntheticDataStatus.reload()
    editions.reload()
    teams.reload()
    groups.reload()
    standings.reload()
    matches.reload()
    knockout.reload()
    topScorers.reload()
    teamHistory.reload()
    squad.reload()
    matchEvents.reload()
  }, [
    editions,
    groups,
    knockout,
    matchEvents,
    matches,
    squad,
    standings,
    syntheticDataStatus,
    teamHistory,
    teams,
    topScorers,
  ])

  const runSyntheticMutation = React.useCallback(
    async (
      action: "populate" | "cleanup"
    ): Promise<SyntheticDataOperationResult> => {
      if (syntheticMutationAction !== null) {
        throw new Error("A synthetic data operation is already in progress.")
      }

      setSyntheticMutationAction(action)
      setSyntheticMutationErrorMessage(null)

      try {
        const result =
          action === "populate"
            ? await worldCupApi.populateSyntheticData()
            : await worldCupApi.removeSyntheticData()

        reloadAllData()
        return result
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to complete the synthetic data operation."

        setSyntheticMutationErrorMessage(errorMessage)
        throw error
      } finally {
        setSyntheticMutationAction(null)
      }
    },
    [reloadAllData, syntheticMutationAction]
  )

  const populateSyntheticData = React.useCallback(
    () => runSyntheticMutation("populate"),
    [runSyntheticMutation]
  )

  const removeSyntheticData = React.useCallback(
    () => runSyntheticMutation("cleanup"),
    [runSyntheticMutation]
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
        setPreferredTeamId(teamId)
        setActiveSection(nextSection)
        setIsCommandOpen(false)
      })
    },
    []
  )

  const focusMatch = React.useCallback((matchId: number) => {
    React.startTransition(() => {
      setPreferredMatchId(matchId)
      setActiveSection("matches")
      setIsCommandOpen(false)
    })
  }, [])

  const focusGroup = React.useCallback((groupId: number) => {
    React.startTransition(() => {
      setPreferredGroupId(groupId)
      setActiveSection("groups")
      setIsCommandOpen(false)
    })
  }, [])

  const focusEdition = React.useCallback((editionId: number) => {
    React.startTransition(() => {
      setPreferredEditionId(editionId)
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
    syntheticDataStatus,
    syntheticDataMutation: {
      action: syntheticMutationAction,
      errorMessage: syntheticMutationErrorMessage,
      isPending: syntheticMutationAction !== null,
    },
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
    populateSyntheticData,
    removeSyntheticData,
    reloadAllData,
  }
}
