"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { HomeCommandCenter } from "@/components/home/command-center"
import { DatabaseSection } from "@/components/home/database-section"
import {
  GroupDetailView,
  MatchDetailView,
  TeamDetailView,
} from "@/components/home/detail-views"
import { homeSectionMap, homeSections } from "@/components/home/home-config"
import { BadgeSkeleton } from "@/components/home/panel-states"
import { GroupsSection } from "@/components/home/groups-section"
import { HistorySection } from "@/components/home/history-section"
import { KnockoutSection } from "@/components/home/knockout-section"
import { MatchesSection } from "@/components/home/matches-section"
import { NaturalQueryDrawer } from "@/components/natural-query/natural-query-drawer"
import { OverviewSection } from "@/components/home/overview-section"
import { TeamsSection } from "@/components/home/teams-section"
import { ThemeToggle } from "@/components/home/theme-toggle"
import { TopScorersSection } from "@/components/home/top-scorers-section"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useGroupsSectionData } from "@/hooks/home/sections/use-groups-section-data"
import { useHistorySectionData } from "@/hooks/home/sections/use-history-section-data"
import { useKnockoutSectionData } from "@/hooks/home/sections/use-knockout-section-data"
import { useMatchesSectionData } from "@/hooks/home/sections/use-matches-section-data"
import { useTeamsSectionData } from "@/hooks/home/sections/use-teams-section-data"
import { useTopScorersSectionData } from "@/hooks/home/sections/use-top-scorers-section-data"
import { useEditionWorkspaceData } from "@/hooks/home/sections/shared"
import { useDashboardNavigation } from "@/hooks/home/use-dashboard-navigation"
import { buildDashboardHref } from "@/lib/home-routing"
import { formatMatchLabel } from "@/lib/world-cup/format"

function getSectionBadgeState(
  options: {
    teamsData: ReturnType<typeof useTeamsSectionData>
    groupsData: ReturnType<typeof useGroupsSectionData>
    matchesData: ReturnType<typeof useMatchesSectionData>
    knockoutData: ReturnType<typeof useKnockoutSectionData>
    topScorersData: ReturnType<typeof useTopScorersSectionData>
    historyData: ReturnType<typeof useHistorySectionData>
  },
  section: keyof typeof homeSectionMap
) {
  const {
    teamsData,
    groupsData,
    matchesData,
    knockoutData,
    topScorersData,
    historyData,
  } = options

  switch (section) {
    case "teams":
      return {
        count: teamsData.teams.data.length,
        isLoading: teamsData.teams.isLoading || teamsData.teams.isRefreshing,
      }
    case "groups":
      return {
        count: groupsData.groupedGroups.length,
        isLoading: groupsData.groups.isLoading || groupsData.groups.isRefreshing,
      }
    case "matches":
      return {
        count: matchesData.matches.data.length,
        isLoading:
          matchesData.matches.isLoading || matchesData.matches.isRefreshing,
      }
    case "knockout":
      return {
        count: knockoutData.knockout.data.length,
        isLoading:
          knockoutData.knockout.isLoading || knockoutData.knockout.isRefreshing,
      }
    case "top-scorers":
      return {
        count: topScorersData.topScorers.data.length,
        isLoading:
          topScorersData.topScorers.isLoading ||
          topScorersData.topScorers.isRefreshing,
      }
    case "history":
      return {
        count: historyData.teamHistory.data.length,
        isLoading:
          historyData.teamHistory.isLoading ||
          historyData.teamHistory.isRefreshing,
      }
    default:
      return null
  }
}

export function DashboardShell() {
  const editionWorkspace = useEditionWorkspaceData(null)
  const navigation = useDashboardNavigation({
    editions: editionWorkspace.editions.data,
  })
  const teamsData = useTeamsSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const groupsData = useGroupsSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const matchesData = useMatchesSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const knockoutData = useKnockoutSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const topScorersData = useTopScorersSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const historyData = useHistorySectionData({
    selectedEditionId: navigation.selectedEditionId,
    selectedTeamId: navigation.selectedTeamId,
  })

  const selectedEdition = React.useMemo(
    () =>
      editionWorkspace.editions.data.find(
        (edition) => edition.edition_id === navigation.selectedEditionId
      ) ?? null,
    [editionWorkspace.editions.data, navigation.selectedEditionId]
  )
  const selectedTeam = React.useMemo(
    () =>
      teamsData.teams.data.find(
        (team) => team.team_id === navigation.selectedTeamId
      ) ?? null,
    [navigation.selectedTeamId, teamsData.teams.data]
  )
  const selectedGroup = React.useMemo(
    () =>
      groupsData.groupedGroups.find(
        (group) => group.group_id === navigation.selectedGroupId
      ) ?? null,
    [groupsData.groupedGroups, navigation.selectedGroupId]
  )
  const selectedMatch = React.useMemo(
    () =>
      matchesData.matches.data.find(
        (match) => match.match_id === navigation.selectedMatchId
      ) ?? null,
    [matchesData.matches.data, navigation.selectedMatchId]
  )

  const activeSection = homeSectionMap[navigation.activeSection]
  const sectionIndexHref = React.useMemo(
    () =>
      buildDashboardHref({
        section: navigation.activeSection,
        editionId: navigation.selectedEditionId,
      }),
    [navigation.activeSection, navigation.selectedEditionId]
  )
  const isCommandCatalogLoading =
    editionWorkspace.editions.isLoading ||
    teamsData.teams.isLoading ||
    groupsData.groups.isLoading ||
    matchesData.matches.isLoading
  const isCommandCatalogRefreshing =
    editionWorkspace.editions.isRefreshing ||
    teamsData.teams.isRefreshing ||
    groupsData.groups.isRefreshing ||
    matchesData.matches.isRefreshing
  const activeDetailLabel = React.useMemo(() => {
    if (!navigation.isDetailRoute) {
      return null
    }

    switch (navigation.activeSection) {
      case "teams":
      case "history":
        return selectedTeam?.team_name ?? `Team ${navigation.routeDetailId}`
      case "groups":
        return selectedGroup
          ? `Group ${selectedGroup.group_letter}`
          : `Group ${navigation.routeDetailId}`
      case "matches":
      case "knockout":
        return selectedMatch
          ? formatMatchLabel(selectedMatch)
          : `Match ${navigation.routeDetailId}`
      default:
        return null
    }
  }, [
    navigation.activeSection,
    navigation.isDetailRoute,
    navigation.routeDetailId,
    selectedGroup,
    selectedMatch,
    selectedTeam,
  ])
  const isActiveDetailLoading = React.useMemo(() => {
    if (!navigation.isDetailRoute) {
      return false
    }

    switch (navigation.activeSection) {
      case "teams":
      case "history":
        return (
          selectedTeam === null &&
          (teamsData.teams.isLoading || teamsData.teams.isRefreshing)
        )
      case "groups":
        return (
          selectedGroup === null &&
          (groupsData.groups.isLoading || groupsData.groups.isRefreshing)
        )
      case "matches":
      case "knockout":
        return (
          selectedMatch === null &&
          (matchesData.matches.isLoading || matchesData.matches.isRefreshing)
        )
      default:
        return false
    }
  }, [
    groupsData.groups.isLoading,
    groupsData.groups.isRefreshing,
    matchesData.matches.isLoading,
    matchesData.matches.isRefreshing,
    navigation.activeSection,
    navigation.isDetailRoute,
    selectedGroup,
    selectedMatch,
    selectedTeam,
    teamsData.teams.isLoading,
    teamsData.teams.isRefreshing,
  ])

  return (
    <SidebarProvider defaultOpen>
      <HomeCommandCenter
        open={navigation.isCommandOpen}
        onOpenChange={navigation.setIsCommandOpen}
        activeSection={navigation.activeSection}
        selectedEditionId={navigation.selectedEditionId}
        selectedTeamId={navigation.selectedTeamId}
        selectedGroupId={navigation.selectedGroupId}
        selectedMatchId={navigation.selectedMatchId}
        editions={editionWorkspace.editions.data}
        teams={teamsData.teams.data}
        groups={groupsData.groupedGroups}
        matches={matchesData.matches.data}
        isCatalogLoading={isCommandCatalogLoading}
        isCatalogRefreshing={isCommandCatalogRefreshing}
        onSelectEdition={navigation.focusEdition}
        onSelectSection={navigation.focusSection}
        onSelectTeam={(teamId) => navigation.focusTeam(teamId, "teams")}
        onSelectGroup={navigation.focusGroup}
        onSelectMatch={navigation.focusMatch}
      />

      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <div className="flex min-h-12 items-center gap-3 overflow-hidden px-1 text-sidebar-foreground transition-[gap,padding] duration-200 ease-linear group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/80 bg-sidebar-accent text-sidebar-foreground">
              <span className="font-heading text-lg font-semibold tracking-[0.08em]">
                WC
              </span>
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
                World Cup Ops
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {homeSections.map((section) => {
                  const Icon = section.icon
                  const badgeState = getSectionBadgeState(
                    {
                      teamsData,
                      groupsData,
                      matchesData,
                      knockoutData,
                      topScorersData,
                      historyData,
                    },
                    section.id
                  )
                  const href = buildDashboardHref({
                    section: section.id,
                    editionId: navigation.selectedEditionId,
                  })

                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={navigation.activeSection === section.id}
                        tooltip={section.label}
                      >
                        <Link href={href}>
                          <Icon />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badgeState !== null ? (
                        <SidebarMenuBadge>
                          {badgeState.isLoading ? (
                            <BadgeSkeleton className="h-4 w-8 rounded-md" />
                          ) : (
                            badgeState.count
                          )}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-background shadow-none md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 px-4 pt-4 lg:px-6">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 lg:px-6">
              <div className="min-w-0">
                <div className="flex items-start gap-1">
                  {navigation.isDetailRoute ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="-ml-2 mt-[-0.125rem] size-8 shrink-0"
                    >
                      <Link
                        href={sectionIndexHref}
                        aria-label={`Back to ${activeSection.label}`}
                      >
                        <ChevronLeft className="size-4" />
                      </Link>
                    </Button>
                  ) : null}
                  <div className="min-w-0">
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link
                              href={buildDashboardHref({
                                section: "overview",
                                editionId: navigation.selectedEditionId,
                              })}
                            >
                              World Cup Ops
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        {navigation.isDetailRoute ? (
                          <>
                            <BreadcrumbItem>
                              <BreadcrumbLink asChild>
                                <Link href={sectionIndexHref}>
                                  {activeSection.shortLabel}
                                </Link>
                              </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                              <BreadcrumbPage>
                                {isActiveDetailLoading ? (
                                  <Skeleton className="h-4 w-32" />
                                ) : (
                                  activeDetailLabel
                                )}
                              </BreadcrumbPage>
                            </BreadcrumbItem>
                          </>
                        ) : (
                          <BreadcrumbItem>
                            <BreadcrumbPage>{activeSection.shortLabel}</BreadcrumbPage>
                          </BreadcrumbItem>
                        )}
                      </BreadcrumbList>
                    </Breadcrumb>
                    <div className="min-w-0">
                      {isActiveDetailLoading ? (
                        <Skeleton className="h-7 w-56 max-w-full" />
                      ) : (
                        <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground">
                          {activeDetailLabel ?? activeSection.label}
                        </h1>
                      )}
                      {activeDetailLabel ? (
                        isActiveDetailLoading ? (
                          <Skeleton className="mt-2 h-4 w-28" />
                        ) : (
                          <p className="truncate text-sm text-muted-foreground">
                            {activeSection.label}
                          </p>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
            <div className="space-y-6">
              {navigation.activeSection === "database" ? <DatabaseSection /> : null}
              {navigation.activeSection === "overview" ? (
                <OverviewSection navigation={navigation} />
              ) : null}
              {navigation.activeSection === "teams" ? (
                navigation.isDetailRoute ? (
                  <TeamDetailView navigation={navigation} initialTab="squad" />
                ) : (
                  <TeamsSection navigation={navigation} />
                )
              ) : null}
              {navigation.activeSection === "groups" ? (
                navigation.isDetailRoute ? (
                  <GroupDetailView navigation={navigation} />
                ) : (
                  <GroupsSection navigation={navigation} />
                )
              ) : null}
              {navigation.activeSection === "matches" ? (
                navigation.isDetailRoute ? (
                  <MatchDetailView navigation={navigation} />
                ) : (
                  <MatchesSection navigation={navigation} />
                )
              ) : null}
              {navigation.activeSection === "knockout" ? (
                navigation.isDetailRoute ? (
                  <MatchDetailView navigation={navigation} />
                ) : (
                  <KnockoutSection navigation={navigation} />
                )
              ) : null}
              {navigation.activeSection === "top-scorers" ? (
                <TopScorersSection navigation={navigation} />
              ) : null}
              {navigation.activeSection === "history" ? (
                navigation.isDetailRoute ? (
                  <TeamDetailView navigation={navigation} initialTab="history" />
                ) : (
                  <HistorySection navigation={navigation} />
                )
              ) : null}
            </div>
          </div>
        </div>

        <NaturalQueryDrawer
          section={navigation.activeSection}
          editionId={navigation.selectedEditionId}
          editionYear={selectedEdition?.edition_year ?? null}
          teamId={navigation.selectedTeamId}
          matchId={navigation.selectedMatchId}
          groupId={navigation.selectedGroupId}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
