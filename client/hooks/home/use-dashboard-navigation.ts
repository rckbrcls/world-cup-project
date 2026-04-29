"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { HomeSectionId } from "@/components/home/home-types"
import {
  buildDashboardHref,
  parseDashboardPathname,
  parseEditionQuery,
} from "@/lib/home-routing"
import { getLatestEdition } from "@/lib/world-cup/selectors"
import type { EditionSummary } from "@/lib/world-cup/types"

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

export type DashboardNavigationState = {
  activeSection: HomeSectionId
  isDetailRoute: boolean
  routeDetailId: number | null
  isCommandOpen: boolean
  setIsCommandOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectedEditionId: number | null
  selectedTeamId: number | null
  selectedGroupId: number | null
  selectedMatchId: number | null
  focusEdition: (editionId: number) => void
  focusGroup: (groupId: number) => void
  focusMatch: (matchId: number, nextSection?: HomeSectionId) => void
  focusSection: (section: HomeSectionId) => void
  focusTeam: (teamId: number, nextSection?: HomeSectionId) => void
}

export function useDashboardNavigation({
  editions,
}: {
  editions: EditionSummary[]
}): DashboardNavigationState {
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
  const routeDetailId = route.detailId
  const isDetailRoute =
    routeDetailId !== null &&
    (activeSection === "teams" ||
      activeSection === "history" ||
      activeSection === "groups" ||
      activeSection === "matches" ||
      activeSection === "knockout")

  const selectedEditionId = React.useMemo(
    () =>
      selectExistingOrDefault(
        routeEditionId,
        editions.map((edition) => edition.edition_id),
        getLatestEdition(editions)?.edition_id ?? null
      ),
    [editions, routeEditionId]
  )

  const selectedTeamId =
    activeSection === "teams" || activeSection === "history"
      ? routeDetailId
      : null
  const selectedGroupId = activeSection === "groups" ? routeDetailId : null
  const selectedMatchId =
    activeSection === "matches" || activeSection === "knockout"
      ? routeDetailId
      : null

  const navigate = React.useCallback(
    (href: string) => {
      React.startTransition(() => {
        router.push(href)
        setIsCommandOpen(false)
      })
    },
    [router]
  )

  const focusSection = React.useCallback(
    (section: HomeSectionId) => {
      navigate(
        buildDashboardHref({
          section,
          editionId: selectedEditionId,
        })
      )
    },
    [navigate, selectedEditionId]
  )

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

  const focusGroup = React.useCallback(
    (groupId: number) => {
      navigate(
        buildDashboardHref({
          section: "groups",
          detailId: groupId,
          editionId: selectedEditionId,
        })
      )
    },
    [navigate, selectedEditionId]
  )

  const focusEdition = React.useCallback(
    (editionId: number) => {
      navigate(
        buildDashboardHref({
          section: "overview",
          editionId,
        })
      )
    },
    [navigate]
  )

  return {
    activeSection,
    isDetailRoute,
    routeDetailId,
    isCommandOpen,
    setIsCommandOpen,
    selectedEditionId,
    selectedTeamId,
    selectedGroupId,
    selectedMatchId,
    focusEdition,
    focusGroup,
    focusMatch,
    focusSection,
    focusTeam,
  }
}
