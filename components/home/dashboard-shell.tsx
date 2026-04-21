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
import { GroupsSection } from "@/components/home/groups-section"
import { HistorySection } from "@/components/home/history-section"
import { KnockoutSection } from "@/components/home/knockout-section"
import { MatchesSection } from "@/components/home/matches-section"
import { NaturalQueryDrawer } from "@/components/natural-query/natural-query-drawer"
import { OverviewSection } from "@/components/home/overview-section"
import { TeamsSection } from "@/components/home/teams-section"
import { ThemeToggle } from "@/components/home/theme-toggle"
import { TopScorersSection } from "@/components/home/top-scorers-section"
import { BadgeSkeleton } from "@/components/home/panel-states"
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
  SidebarFooter,
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
import { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"
import { buildDashboardHref } from "@/lib/home-routing"
import { formatMatchLabel } from "@/lib/world-cup/format"

function getSectionBadgeState(
  dashboard: ReturnType<typeof useWorldCupDashboard>,
  section: keyof typeof homeSectionMap
) {
  switch (section) {
    case "teams":
      return {
        count: dashboard.teams.data.length,
        isLoading: dashboard.teams.isLoading || dashboard.teams.isRefreshing,
      }
    case "groups":
      return {
        count: dashboard.groupedGroups.length,
        isLoading: dashboard.groups.isLoading || dashboard.groups.isRefreshing,
      }
    case "matches":
      return {
        count: dashboard.matches.data.length,
        isLoading: dashboard.matches.isLoading || dashboard.matches.isRefreshing,
      }
    case "knockout":
      return {
        count: dashboard.knockout.data.length,
        isLoading: dashboard.knockout.isLoading || dashboard.knockout.isRefreshing,
      }
    case "top-scorers":
      return {
        count: dashboard.topScorers.data.length,
        isLoading:
          dashboard.topScorers.isLoading || dashboard.topScorers.isRefreshing,
      }
    case "history":
      return {
        count: dashboard.teamHistory.data.length,
        isLoading:
          dashboard.teamHistory.isLoading || dashboard.teamHistory.isRefreshing,
      }
    default:
      return null
  }
}

export function DashboardShell() {
  const dashboard = useWorldCupDashboard()
  const activeSection = homeSectionMap[dashboard.activeSection]
  const databaseSection = homeSectionMap.database
  const DatabaseSectionIcon = databaseSection.icon
  const workspaceSections = React.useMemo(
    () => homeSections.filter((section) => section.id !== "database"),
    []
  )
  const sectionIndexHref = React.useMemo(
    () =>
      buildDashboardHref({
        section: dashboard.activeSection,
        editionId: dashboard.selectedEditionId,
      }),
    [dashboard.activeSection, dashboard.selectedEditionId]
  )
  const isCommandCatalogLoading =
    dashboard.editions.isLoading ||
    dashboard.teams.isLoading ||
    dashboard.groups.isLoading ||
    dashboard.matches.isLoading
  const isCommandCatalogRefreshing =
    dashboard.editions.isRefreshing ||
    dashboard.teams.isRefreshing ||
    dashboard.groups.isRefreshing ||
    dashboard.matches.isRefreshing
  const activeDetailLabel = React.useMemo(() => {
    if (!dashboard.isDetailRoute) {
      return null
    }

    switch (dashboard.activeSection) {
      case "teams":
      case "history":
        return dashboard.selectedTeam?.team_name ?? `Team ${dashboard.routeDetailId}`
      case "groups":
        return dashboard.selectedGroup
          ? `Group ${dashboard.selectedGroup.group_letter}`
          : `Group ${dashboard.routeDetailId}`
      case "matches":
      case "knockout":
        return dashboard.selectedMatch
          ? formatMatchLabel(dashboard.selectedMatch)
          : `Match ${dashboard.routeDetailId}`
      default:
        return null
    }
  }, [
    dashboard.activeSection,
    dashboard.isDetailRoute,
    dashboard.routeDetailId,
    dashboard.selectedGroup,
    dashboard.selectedMatch,
    dashboard.selectedTeam,
  ])
  const isActiveDetailLoading = React.useMemo(() => {
    if (!dashboard.isDetailRoute) {
      return false
    }

    switch (dashboard.activeSection) {
      case "teams":
      case "history":
        return (
          dashboard.selectedTeam === null &&
          (dashboard.teams.isLoading || dashboard.teams.isRefreshing)
        )
      case "groups":
        return (
          dashboard.selectedGroup === null &&
          (dashboard.groups.isLoading || dashboard.groups.isRefreshing)
        )
      case "matches":
      case "knockout":
        return (
          dashboard.selectedMatch === null &&
          (dashboard.matches.isLoading || dashboard.matches.isRefreshing)
        )
      default:
        return false
    }
  }, [
    dashboard.activeSection,
    dashboard.groups.isLoading,
    dashboard.groups.isRefreshing,
    dashboard.isDetailRoute,
    dashboard.matches.isLoading,
    dashboard.matches.isRefreshing,
    dashboard.selectedGroup,
    dashboard.selectedMatch,
    dashboard.selectedTeam,
    dashboard.teams.isLoading,
    dashboard.teams.isRefreshing,
  ])

  return (
    <SidebarProvider defaultOpen>
      <HomeCommandCenter
        open={dashboard.isCommandOpen}
        onOpenChange={dashboard.setIsCommandOpen}
        activeSection={dashboard.activeSection}
        selectedEditionId={dashboard.selectedEditionId}
        selectedTeamId={dashboard.selectedTeamId}
        selectedGroupId={dashboard.selectedGroupId}
        selectedMatchId={dashboard.selectedMatchId}
        editions={dashboard.editions.data}
        teams={dashboard.teams.data}
        groups={dashboard.groupedGroups}
        matches={dashboard.matches.data}
        isCatalogLoading={isCommandCatalogLoading}
        isCatalogRefreshing={isCommandCatalogRefreshing}
        onSelectEdition={dashboard.focusEdition}
        onSelectSection={dashboard.focusSection}
        onSelectTeam={(teamId) => dashboard.focusTeam(teamId, "teams")}
        onSelectGroup={dashboard.focusGroup}
        onSelectMatch={dashboard.focusMatch}
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
                {workspaceSections.map((section) => {
                  const Icon = section.icon
                  const badgeState = getSectionBadgeState(dashboard, section.id)
                  const href = buildDashboardHref({
                    section: section.id,
                    editionId: dashboard.selectedEditionId,
                  })

                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={dashboard.activeSection === section.id}
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
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={dashboard.activeSection === databaseSection.id}
                tooltip={databaseSection.label}
              >
                <Link
                  href={buildDashboardHref({
                    section: databaseSection.id,
                    editionId: dashboard.selectedEditionId,
                  })}
                >
                  <DatabaseSectionIcon />
                  <span>{databaseSection.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-background shadow-none md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 px-4 pt-4 lg:px-6">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 lg:px-6">
              <div className="min-w-0">
                <div className="flex items-start gap-1">
                  {dashboard.isDetailRoute ? (
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
                                editionId: dashboard.selectedEditionId,
                              })}
                            >
                              World Cup Ops
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        {dashboard.isDetailRoute ? (
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
              {dashboard.activeSection === "database" ? (
                <DatabaseSection dashboard={dashboard} />
              ) : null}
              {dashboard.activeSection === "overview" ? (
                <OverviewSection dashboard={dashboard} />
              ) : null}
              {dashboard.activeSection === "teams" ? (
                dashboard.isDetailRoute ? (
                  <TeamDetailView dashboard={dashboard} initialTab="squad" />
                ) : (
                  <TeamsSection dashboard={dashboard} />
                )
              ) : null}
              {dashboard.activeSection === "groups" ? (
                dashboard.isDetailRoute ? (
                  <GroupDetailView dashboard={dashboard} />
                ) : (
                  <GroupsSection dashboard={dashboard} />
                )
              ) : null}
              {dashboard.activeSection === "matches" ? (
                dashboard.isDetailRoute ? (
                  <MatchDetailView dashboard={dashboard} />
                ) : (
                  <MatchesSection dashboard={dashboard} />
                )
              ) : null}
              {dashboard.activeSection === "knockout" ? (
                dashboard.isDetailRoute ? (
                  <MatchDetailView dashboard={dashboard} />
                ) : (
                  <KnockoutSection dashboard={dashboard} />
                )
              ) : null}
              {dashboard.activeSection === "top-scorers" ? (
                <TopScorersSection dashboard={dashboard} />
              ) : null}
              {dashboard.activeSection === "history" ? (
                dashboard.isDetailRoute ? (
                  <TeamDetailView dashboard={dashboard} initialTab="history" />
                ) : (
                  <HistorySection dashboard={dashboard} />
                )
              ) : null}
            </div>
          </div>
        </div>

        <NaturalQueryDrawer
          section={dashboard.activeSection}
          editionId={dashboard.selectedEditionId}
          editionYear={dashboard.selectedEdition?.edition_year ?? null}
          teamId={dashboard.selectedTeamId}
          matchId={dashboard.selectedMatchId}
          groupId={dashboard.selectedGroupId}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
