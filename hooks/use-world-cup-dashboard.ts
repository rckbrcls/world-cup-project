"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { HomeSectionId } from "@/components/home/home-types"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { buildDashboardHref, parseDashboardPathname, parseEditionQuery } from "@/lib/home-routing"
import { worldCupApi } from "@/lib/world-cup/api"
import {
  buildOverviewMetrics,
  getLatestEdition,
  groupEditionGroups,
  groupMatchesByPhase,
} from "@/lib/world-cup/selectors"
import type {
  DatabaseStatus,
  DatabaseOperationResult,
  EditionMatchRow,
  EditionSummary,
  EditionTeamRow,
} from "@/lib/world-cup/types"

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isCommandOpen, setIsCommandOpen] = React.useState(false)

  const route = React.useMemo(
    () => parseDashboardPathname(pathname),
    [pathname]
  )
  const routeEditionId = React.useMemo(
    () => parseEditionQuery(searchParams.get("edition")),
    [searchParams]
  )
  const activeSection = route.section

  const health = useAsyncResource({
    key: ["health"],
    initialData: null as { status: string } | null,
    load: (signal) => worldCupApi.health({ signal }),
  })

  const databaseStatus = useAsyncResource({
    key: ["database-status"],
    initialData: null as DatabaseStatus | null,
    load: (signal) => worldCupApi.getDatabaseStatus({ signal }),
  })

  const databaseReady = databaseStatus.data?.reporting_layer_ready ?? false

  const editions = useAsyncResource({
    key: ["editions"],
    enabled: databaseReady,
    initialData: [] as EditionSummary[],
    load: (signal) => worldCupApi.listEditions({ signal }),
  })

  const selectedEditionId = React.useMemo(
    () =>
      selectExistingOrDefault(
        routeEditionId,
        editions.data.map((edition) => edition.edition_id),
        getLatestEdition(editions.data)?.edition_id ?? null
      ),
    [editions.data, routeEditionId]
  )

  const selectedEdition = React.useMemo(() => {
    return (
      editions.data.find((edition) => edition.edition_id === selectedEditionId) ??
      null
    )
  }, [editions.data, selectedEditionId])

  const teams = useAsyncResource({
    key: ["teams", selectedEditionId],
    enabled: databaseReady && selectedEditionId !== null,
    initialData: [] as EditionTeamRow[],
    load: (signal) => worldCupApi.listEditionTeams(selectedEditionId!, { signal }),
  })

  const groups = useAsyncResource({
    key: ["groups", selectedEditionId],
    enabled: databaseReady && selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listEditionGroups(selectedEditionId!, { signal }),
  })

  const matches = useAsyncResource({
    key: ["matches", selectedEditionId],
    enabled: databaseReady && selectedEditionId !== null,
    initialData: [] as EditionMatchRow[],
    load: (signal) => worldCupApi.listEditionMatches(selectedEditionId!, { signal }),
  })

  const knockout = useAsyncResource({
    key: ["knockout", selectedEditionId],
    enabled: databaseReady && selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listKnockoutMatches(selectedEditionId!, { signal }),
  })

  const topScorers = useAsyncResource({
    key: ["top-scorers", selectedEditionId],
    enabled: databaseReady && selectedEditionId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listTopScorers(selectedEditionId!, { signal }),
  })

  const groupedGroups = React.useMemo(
    () => groupEditionGroups(groups.data),
    [groups.data]
  )

  const selectedTeamId =
    activeSection === "teams" ||
    activeSection === "top-scorers" ||
    activeSection === "history"
      ? route.detailId
      : null

  const selectedTeam = React.useMemo(() => {
    return teams.data.find((team) => team.team_id === selectedTeamId) ?? null
  }, [selectedTeamId, teams.data])

  const selectedGroupId = activeSection === "groups" ? route.detailId : null

  const selectedGroup = React.useMemo(() => {
    return (
      groupedGroups.find((group) => group.group_id === selectedGroupId) ?? null
    )
  }, [groupedGroups, selectedGroupId])

  const selectedMatchId =
    activeSection === "matches" || activeSection === "knockout"
      ? route.detailId
      : null

  const selectedMatch = React.useMemo(() => {
    return matches.data.find((match) => match.match_id === selectedMatchId) ?? null
  }, [matches.data, selectedMatchId])

  const standings = useAsyncResource({
    key: ["standings", selectedGroupId],
    enabled: databaseReady && selectedGroupId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listGroupStandings(selectedGroupId!, { signal }),
  })

  const teamHistory = useAsyncResource({
    key: ["history", selectedTeamId],
    enabled: databaseReady && selectedTeamId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listTeamHistory(selectedTeamId!, { signal }),
  })

  const squad = useAsyncResource({
    key: ["squad", selectedEditionId, selectedTeamId],
    enabled: databaseReady && selectedEditionId !== null && selectedTeamId !== null,
    initialData: [],
    load: (signal) =>
      worldCupApi.listTeamSquad(selectedEditionId!, selectedTeamId!, { signal }),
  })

  const matchEvents = useAsyncResource({
    key: ["match-events", selectedMatchId],
    enabled: databaseReady && selectedMatchId !== null,
    initialData: [],
    load: (signal) => worldCupApi.listMatchEvents(selectedMatchId!, { signal }),
  })

  const [databaseMutationAction, setDatabaseMutationAction] =
    React.useState<"initialize" | "reporting" | "populate" | "cleanup" | null>(null)
  const [databaseMutationErrorMessage, setDatabaseMutationErrorMessage] =
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
    databaseStatus.reload()
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
    databaseStatus,
    editions,
    groups,
    knockout,
    matchEvents,
    matches,
    squad,
    standings,
    teamHistory,
    teams,
    topScorers,
  ])

  const runDatabaseMutation = React.useCallback(
    async (
      action: "initialize" | "reporting" | "populate" | "cleanup"
    ): Promise<DatabaseOperationResult> => {
      if (databaseMutationAction !== null) {
        throw new Error("A database operation is already in progress.")
      }

      setDatabaseMutationAction(action)
      setDatabaseMutationErrorMessage(null)

      try {
        const result = await (() => {
          switch (action) {
            case "initialize":
              return worldCupApi.initializeDatabase()
            case "reporting":
              return worldCupApi.applyReportingQueries()
            case "populate":
              return worldCupApi.populateDatabase()
            case "cleanup":
              return worldCupApi.cleanupDatabase()
          }
        })()

        reloadAllData()
        return result
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to complete the database operation."

        setDatabaseMutationErrorMessage(errorMessage)
        throw error
      } finally {
        setDatabaseMutationAction(null)
      }
    },
    [databaseMutationAction, reloadAllData]
  )

  const initializeDatabase = React.useCallback(
    () => runDatabaseMutation("initialize"),
    [runDatabaseMutation]
  )

  const applyReportingQueries = React.useCallback(
    () => runDatabaseMutation("reporting"),
    [runDatabaseMutation]
  )

  const populateSyntheticData = React.useCallback(
    () => runDatabaseMutation("populate"),
    [runDatabaseMutation]
  )

  const removeSyntheticData = React.useCallback(
    () => runDatabaseMutation("cleanup"),
    [runDatabaseMutation]
  )

  const navigate = React.useCallback(
    (href: string) => {
      React.startTransition(() => {
        router.push(href)
        setIsCommandOpen(false)
      })
    },
    [router]
  )

  const focusSection = React.useCallback((section: HomeSectionId) => {
    navigate(
      buildDashboardHref({
        section,
        editionId: selectedEditionId,
      })
    )
  }, [navigate, selectedEditionId])

  const focusTeam = React.useCallback(
    (teamId: number, nextSection: HomeSectionId = "teams") => {
      navigate(
        buildDashboardHref({
          section: nextSection,
          detailId: teamId,
          editionId: selectedEditionId,
        })
      )
    },
    [navigate, selectedEditionId]
  )

  const focusMatch = React.useCallback(
    (matchId: number, nextSection: HomeSectionId = "matches") => {
      navigate(
        buildDashboardHref({
          section: nextSection,
          detailId: matchId,
          editionId: selectedEditionId,
        })
      )
    },
    [navigate, selectedEditionId]
  )

  const focusGroup = React.useCallback((groupId: number) => {
    navigate(
      buildDashboardHref({
        section: "groups",
        detailId: groupId,
        editionId: selectedEditionId,
      })
    )
  }, [navigate, selectedEditionId])

  const focusEdition = React.useCallback((editionId: number) => {
    navigate(
      buildDashboardHref({
        section: "overview",
        editionId,
      })
    )
  }, [navigate])

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
    databaseStatus,
    databaseMutation: {
      action: databaseMutationAction,
      errorMessage: databaseMutationErrorMessage,
      isPending: databaseMutationAction !== null,
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
    initializeDatabase,
    applyReportingQueries,
    populateSyntheticData,
    removeSyntheticData,
    reloadAllData,
  }
}
