"use client"

import * as React from "react"
import { Search, Server } from "lucide-react"

import { HomeCommandCenter } from "@/components/home/command-center"
import { homeSectionMap, homeSections } from "@/components/home/home-config"
import { GroupsSection } from "@/components/home/groups-section"
import { HistorySection } from "@/components/home/history-section"
import { InspectorPanel } from "@/components/home/inspector-panel"
import { KnockoutSection } from "@/components/home/knockout-section"
import { MatchesSection } from "@/components/home/matches-section"
import { OverviewSection } from "@/components/home/overview-section"
import { SemanticBadge } from "@/components/home/panel-states"
import { TeamsSection } from "@/components/home/teams-section"
import { ThemeToggle } from "@/components/home/theme-toggle"
import { TopScorersSection } from "@/components/home/top-scorers-section"
import { NaturalQueryPanel } from "@/components/natural-query/natural-query-panel"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

function getHealthPresentation(dashboard: ReturnType<typeof useWorldCupDashboard>) {
  if (dashboard.health.isLoading) {
    return {
      label: "Checking backend",
      tone: "neutral" as const,
    }
  }

  if (dashboard.health.data?.status === "ok") {
    return {
      label: "Backend connected",
      tone: "success" as const,
    }
  }

  return {
    label: "Backend unavailable",
    tone: "destructive" as const,
  }
}

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
  const healthPresentation = getHealthPresentation(dashboard)

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
        <SidebarHeader>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground">
                <span className="font-heading text-lg font-semibold tracking-[0.08em]">
                  WC
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
                  World Cup Ops
                </p>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-sidebar-foreground/70">
                  SQL-first control room
                </p>
              </div>
            </div>
            <SemanticBadge tone="neutral" className="w-fit">
              {dashboard.selectedEdition
                ? `Edition ${dashboard.selectedEdition.edition_year}`
                : "Waiting for edition"}
            </SemanticBadge>
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

                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        isActive={dashboard.activeSection === section.id}
                        tooltip={section.label}
                        onClick={() => dashboard.focusSection(section.id)}
                      >
                        <Icon />
                        <span>{section.label}</span>
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
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Current selection</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/65">
                    Section
                  </p>
                  <p className="font-medium text-sidebar-foreground">
                    {activeSection.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/65">
                    Team
                  </p>
                  <p className="font-medium text-sidebar-foreground">
                    {dashboard.selectedTeam?.team_name ?? "No team in focus"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-sidebar-foreground/65">
                    Match
                  </p>
                  <p className="font-medium text-sidebar-foreground">
                    {dashboard.selectedMatch
                      ? `${dashboard.selectedMatch.home_team_name} vs ${dashboard.selectedMatch.away_team_name}`
                      : "No match in focus"}
                  </p>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <Server className="size-4 text-sidebar-foreground/70" />
              <span className="font-medium text-sidebar-foreground">
                {healthPresentation.label}
              </span>
            </div>
            <p className="text-xs leading-5 text-sidebar-foreground/65">
              The workspace consumes the existing FastAPI surface through a same-origin frontend proxy, preserving the real backend contracts.
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-svh bg-background">
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-background/92 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />
                <div className="min-w-0">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>World Cup Ops</BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{activeSection.shortLabel}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="min-w-0">
                    <h1 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground">
                      {activeSection.label}
                    </h1>
                    <p className="truncate text-sm text-muted-foreground">
                      {activeSection.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={dashboard.selectedEditionId?.toString()}
                  onValueChange={(value) => dashboard.focusEdition(Number(value))}
                >
                  <SelectTrigger className="min-w-36 bg-background">
                    <SelectValue placeholder="Edition" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboard.editions.data.map((edition) => (
                      <SelectItem
                        key={edition.edition_id}
                        value={edition.edition_id.toString()}
                      >
                        {edition.edition_year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dashboard.setIsCommandOpen(true)}
                >
                  <Search />
                  Command menu
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Ctrl/⌘ K
                  </span>
                </Button>

                <SemanticBadge tone={healthPresentation.tone}>
                  {healthPresentation.label}
                </SemanticBadge>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-4 lg:px-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-6">
                <div hidden={dashboard.activeSection !== "overview"}>
                  <OverviewSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "teams"}>
                  <TeamsSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "groups"}>
                  <GroupsSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "matches"}>
                  <MatchesSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "knockout"}>
                  <KnockoutSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "top-scorers"}>
                  <TopScorersSection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "history"}>
                  <HistorySection dashboard={dashboard} />
                </div>
                <div hidden={dashboard.activeSection !== "natural-query"}>
                  <NaturalQueryPanel
                    section={dashboard.activeSection}
                    editionId={dashboard.selectedEditionId}
                    editionYear={dashboard.selectedEdition?.edition_year ?? null}
                    teamId={dashboard.selectedTeamId}
                    matchId={dashboard.selectedMatchId}
                    groupId={dashboard.selectedGroupId}
                  />
                </div>
              </div>

              <div className="xl:sticky xl:top-[5.25rem] xl:self-start">
                <InspectorPanel dashboard={dashboard} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
