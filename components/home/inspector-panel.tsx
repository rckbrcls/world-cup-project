"use client"

import * as React from "react"
import {
  CalendarClock,
  MapPinned,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react"

import {
  PanelEmptyState,
  PanelErrorState,
  PanelLoadingState,
  PanelUnsupportedState,
  SemanticBadge,
} from "@/components/home/panel-states"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatEventTypeLabel, formatKickoffDate, formatMatchLabel } from "@/lib/world-cup/format"
import type { MatchEventType } from "@/lib/world-cup/types"
import { summarizeTeamHistory } from "@/lib/world-cup/selectors"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

const eventToneMap: Record<
  MatchEventType,
  "neutral" | "success" | "warning" | "destructive"
> = {
  GOAL: "success",
  PENALTY_GOAL: "success",
  OWN_GOAL: "warning",
  YELLOW_CARD: "warning",
  RED_CARD: "destructive",
  SUBSTITUTION: "neutral",
}

function getInspectorMode(activeSection: DashboardState["activeSection"]) {
  switch (activeSection) {
    case "teams":
    case "top-scorers":
    case "history":
      return "team"
    case "matches":
    case "knockout":
      return "match"
    default:
      return "edition"
  }
}

function TeamInspector({ dashboard }: { dashboard: DashboardState }) {
  const historySummary = React.useMemo(
    () => summarizeTeamHistory(dashboard.teamHistory.data),
    [dashboard.teamHistory.data]
  )

  if (!dashboard.selectedTeam) {
    return (
      <PanelEmptyState
        title="No team selected"
        description="Select a team from the registry, ranking, or command menu to inspect current squad and history."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SemanticBadge tone="neutral">{dashboard.selectedTeam.country_name}</SemanticBadge>
          {dashboard.selectedTeam.group_letter ? (
            <SemanticBadge tone="qualified">
              Group {dashboard.selectedTeam.group_letter}
            </SemanticBadge>
          ) : null}
          {dashboard.selectedTeam.final_rank ? (
            <SemanticBadge
              tone={
                dashboard.selectedTeam.final_rank === 1 ? "champion" : "qualified"
              }
            >
              Rank {dashboard.selectedTeam.final_rank}
            </SemanticBadge>
          ) : null}
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {dashboard.selectedTeam.team_name}
          </p>
          <p className="text-sm text-muted-foreground">
            Current coach: {dashboard.selectedTeam.coach_name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="squad">
        <TabsList variant="line">
          <TabsTrigger value="squad">Current squad</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="squad" className="space-y-3 pt-2">
          {dashboard.squad.isLoading ? (
            <PanelLoadingState rows={6} />
          ) : dashboard.squad.isError && !dashboard.squad.data.length ? (
            <PanelErrorState
              title="Unable to load squad"
              description={
                dashboard.squad.errorMessage ?? "The squad request failed."
              }
              onRetry={dashboard.squad.reload}
            />
          ) : !dashboard.squad.data.length ? (
            <PanelUnsupportedState
              title="Squad unavailable"
              description="The selected edition/team combination did not return a squad list."
            />
          ) : (
            <div className="space-y-2">
              {dashboard.squad.data.map((player) => (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {player.player_name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {player.primary_position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_captain ? (
                      <SemanticBadge tone="champion">Captain</SemanticBadge>
                    ) : null}
                    <SemanticBadge tone="neutral">#{player.shirt_number}</SemanticBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="space-y-3 pt-2">
          {dashboard.teamHistory.isLoading ? (
            <PanelLoadingState rows={4} />
          ) : dashboard.teamHistory.isError && !dashboard.teamHistory.data.length ? (
            <PanelErrorState
              title="Unable to load history"
              description={
                dashboard.teamHistory.errorMessage ?? "The history request failed."
              }
              onRetry={dashboard.teamHistory.reload}
            />
          ) : !dashboard.teamHistory.data.length ? (
            <PanelUnsupportedState
              title="History unavailable"
              description="The backend did not return historical rows for this team."
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Participations
                  </p>
                  <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                    {historySummary.participations}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Titles
                  </p>
                  <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                    {historySummary.titles}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {dashboard.teamHistory.data.map((row) => (
                  <div
                    key={row.edition_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{row.edition_year}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.wins}-{row.draws}-{row.losses} · {row.goals_for}:{row.goals_against}
                      </p>
                    </div>
                    {row.final_rank ? (
                      <SemanticBadge
                        tone={row.final_rank === 1 ? "champion" : "neutral"}
                      >
                        Rank {row.final_rank}
                      </SemanticBadge>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MatchInspector({ dashboard }: { dashboard: DashboardState }) {
  if (!dashboard.selectedMatch) {
    return (
      <PanelEmptyState
        title="No match selected"
        description="Pick a fixture or knockout match to inspect venue, score, and event timeline."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SemanticBadge tone="neutral">{dashboard.selectedMatch.phase_name}</SemanticBadge>
          {dashboard.selectedMatch.group_letter ? (
            <SemanticBadge tone="qualified">
              Group {dashboard.selectedMatch.group_letter}
            </SemanticBadge>
          ) : null}
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {formatMatchLabel(dashboard.selectedMatch)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatKickoffDate(dashboard.selectedMatch.kickoff_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Trophy className="size-4" />
            <span className="text-sm">Score</span>
          </div>
          <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
            {dashboard.selectedMatch.final_score}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {dashboard.selectedMatch.penalty_score
              ? `Penalties ${dashboard.selectedMatch.penalty_score}`
              : "No penalty shootout"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <MapPinned className="size-4" />
            <span className="text-sm">Venue</span>
          </div>
          <p className="font-medium text-foreground">
            {dashboard.selectedMatch.stadium_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {dashboard.selectedMatch.host_city_name}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        Match officials are not available in the current backend, so referee
        coverage is intentionally marked as unsupported here.
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TimerReset className="size-4 text-muted-foreground" />
          <p className="font-medium text-foreground">Event timeline</p>
        </div>
        {dashboard.matchEvents.isLoading ? (
          <PanelLoadingState rows={5} />
        ) : dashboard.matchEvents.isError && !dashboard.matchEvents.data.length ? (
          <PanelErrorState
            title="Unable to load match events"
            description={
              dashboard.matchEvents.errorMessage ?? "The match events request failed."
            }
            onRetry={dashboard.matchEvents.reload}
          />
        ) : !dashboard.matchEvents.data.length ? (
          <PanelUnsupportedState
            title="No event timeline returned"
            description="The selected match does not expose event rows in the current backend."
          />
        ) : (
          <div className="space-y-2">
            {dashboard.matchEvents.data.map((event) => (
              <div
                key={event.event_id}
                className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <SemanticBadge tone={eventToneMap[event.event_type]}>
                    {formatEventTypeLabel(event.event_type)}
                  </SemanticBadge>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {event.minute_label}&apos;
                  </span>
                </div>
                <p className="font-medium text-foreground">
                  {event.player_name ?? "Team event"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {event.team_name}
                  {event.related_player_name
                    ? ` · Related: ${event.related_player_name}`
                    : ""}
                </p>
                {event.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {event.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EditionInspector({ dashboard }: { dashboard: DashboardState }) {
  if (!dashboard.selectedEdition) {
    return (
      <PanelEmptyState
        title="No edition selected"
        description="Choose an edition from the topbar to activate the workspace inspector."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SemanticBadge tone="neutral">
            {dashboard.selectedEdition.host_country}
          </SemanticBadge>
          {dashboard.health.data?.status === "ok" ? (
            <SemanticBadge tone="success">Backend connected</SemanticBadge>
          ) : (
            <SemanticBadge tone="destructive">Backend unavailable</SemanticBadge>
          )}
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {dashboard.selectedEdition.edition_year} edition
          </p>
          <p className="text-sm text-muted-foreground">
            Shared edition context, current selection defaults, and known backend gaps.
          </p>
        </div>
      </div>

      <Tabs defaultValue="podium">
        <TabsList variant="line">
          <TabsTrigger value="podium">Podium</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>
        <TabsContent value="podium" className="space-y-3 pt-2">
          {[
            {
              label: "Champion",
              value: dashboard.selectedEdition.champion_team ?? "Not defined",
              tone: "champion" as const,
            },
            {
              label: "Runner-up",
              value: dashboard.selectedEdition.vice_champion_team ?? "Not defined",
              tone: "qualified" as const,
            },
            {
              label: "Third place",
              value: dashboard.selectedEdition.third_place_team ?? "Not defined",
              tone: "neutral" as const,
            },
          ].map((entry) => (
            <div
              key={entry.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {entry.label}
                </p>
                <p className="font-medium text-foreground">{entry.value}</p>
              </div>
              <SemanticBadge tone={entry.tone}>{entry.label}</SemanticBadge>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="coverage" className="space-y-3 pt-2">
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4" />
              <span className="text-sm font-medium">Edition dates</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Start date and end date are modeled in PostgreSQL, but the current
              API does not expose them to the frontend yet.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" />
              <span className="text-sm font-medium">Host cities</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Host-city coverage also remains unavailable in the current backend
              contract, so the inspector marks it explicitly instead of faking it.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {dashboard.activeSection === "groups" && dashboard.selectedGroup ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-foreground">
              Selected group · {dashboard.selectedGroup.group_letter}
            </p>
            <SemanticBadge tone="neutral">
              {dashboard.selectedGroup.teams.length} teams
            </SemanticBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            Standings remain in the main workspace while this inspector preserves
            edition context and selection metadata.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function InspectorPanel({ dashboard }: { dashboard: DashboardState }) {
  const inspectorMode = getInspectorMode(dashboard.activeSection)

  return (
    <Card className="h-full border-border/80 shadow-none">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Inspector</CardTitle>
        <CardDescription>
          Shared detail surface that follows the current operational selection.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[28rem] xl:h-[calc(100svh-11.5rem)]">
          <div className="space-y-4 p-4">
            {inspectorMode === "team" ? <TeamInspector dashboard={dashboard} /> : null}
            {inspectorMode === "match" ? <MatchInspector dashboard={dashboard} /> : null}
            {inspectorMode === "edition" ? (
              <EditionInspector dashboard={dashboard} />
            ) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
