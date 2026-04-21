"use client"

import * as React from "react"
import Link from "next/link"

import { HomeCommandCenter } from "@/components/home/command-center"
import { DatabaseSection } from "@/components/home/database-section"
import { homeSectionMap, homeSections } from "@/components/home/home-config"
import { GroupsSection } from "@/components/home/groups-section"
import { HistorySection } from "@/components/home/history-section"
import { InspectorPanel } from "@/components/home/inspector-panel"
import { KnockoutSection } from "@/components/home/knockout-section"
import { MatchesSection } from "@/components/home/matches-section"
import { OverviewSection } from "@/components/home/overview-section"
import { TeamsSection } from "@/components/home/teams-section"
import { ThemeToggle } from "@/components/home/theme-toggle"
import { TopScorersSection } from "@/components/home/top-scorers-section"
import { NaturalQueryPanel } from "@/components/natural-query/natural-query-panel"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"
import { buildDashboardHref } from "@/lib/home-routing"
import { formatMatchLabel } from "@/lib/world-cup/format"

function getSectionBadgeCount(
  dashboard: ReturnType<typeof useWorldCupDashboard>,
  section: keyof typeof homeSectionMap
) {
  switch (section) {
    case "teams":
      return dashboard.teams.data.length
    case "groups":
      return dashboard.groupedGroups.length
    case "matches":
      return dashboard.matches.data.length
    case "knockout":
      return dashboard.knockout.data.length
    case "top-scorers":
      return dashboard.topScorers.data.length
    case "history":
      return dashboard.teamHistory.data.length
    default:
      return null
  }
}

export function DashboardShell() {
  const dashboard = useWorldCupDashboard()
  const activeSection = homeSectionMap[dashboard.activeSection]
  const activeDetailLabel = React.useMemo(() => {
    switch (dashboard.activeSection) {
      case "teams":
      case "top-scorers":
      case "history":
        return (
          dashboard.selectedTeam?.team_name ??
          dashboard.teamHistory.data.at(0)?.team_name ??
          null
        )
      case "groups":
        return dashboard.selectedGroup
          ? `Group ${dashboard.selectedGroup.group_letter}`
          : null
      case "matches":
      case "knockout":
        return dashboard.selectedMatch ? formatMatchLabel(dashboard.selectedMatch) : null
      default:
        return null
    }
  }, [
    dashboard.activeSection,
    dashboard.selectedGroup,
    dashboard.selectedMatch,
    dashboard.selectedTeam,
    dashboard.teamHistory.data,
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
                {homeSections.map((section) => {
                  const Icon = section.icon
                  const badgeCount = getSectionBadgeCount(dashboard, section.id)
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
                      {badgeCount !== null ? (
                        <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>
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
                    {activeDetailLabel ? (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink asChild>
                            <Link
                              href={buildDashboardHref({
                                section: dashboard.activeSection,
                                editionId: dashboard.selectedEditionId,
                              })}
                            >
                              {activeSection.shortLabel}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>{activeDetailLabel}</BreadcrumbPage>
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
                  <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground">
                    {activeDetailLabel ?? activeSection.label}
                  </h1>
                  {activeDetailLabel ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {activeSection.label}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
            <div
              className={
                dashboard.activeSection === "database"
                  ? "grid gap-4"
                  : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
              }
            >
              <div className="space-y-6">
                {dashboard.activeSection === "database" ? (
                  <DatabaseSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "overview" ? (
                  <OverviewSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "teams" ? (
                  <TeamsSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "groups" ? (
                  <GroupsSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "matches" ? (
                  <MatchesSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "knockout" ? (
                  <KnockoutSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "top-scorers" ? (
                  <TopScorersSection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "history" ? (
                  <HistorySection dashboard={dashboard} />
                ) : null}
                {dashboard.activeSection === "natural-query" ? (
                  <NaturalQueryPanel
                    section={dashboard.activeSection}
                    editionId={dashboard.selectedEditionId}
                    editionYear={dashboard.selectedEdition?.edition_year ?? null}
                    teamId={dashboard.selectedTeamId}
                    matchId={dashboard.selectedMatchId}
                    groupId={dashboard.selectedGroupId}
                  />
                ) : null}
              </div>

              {dashboard.activeSection !== "database" ? (
                <div className="xl:sticky xl:top-[6.5rem] xl:self-start">
                  <InspectorPanel dashboard={dashboard} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
