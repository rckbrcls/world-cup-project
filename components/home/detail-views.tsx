"use client"

import * as React from "react"
import {
  CalendarClock,
  MapPinned,
  TimerReset,
  Trophy,
} from "lucide-react"

import {
  CardListSkeleton,
  DetailHeaderSkeleton,
  LoadingOverlay,
  MetricGridSkeleton,
  PanelEmptyState,
  PanelErrorState,
  PanelUnsupportedState,
  SemanticBadge,
  TableSkeleton,
} from "@/components/home/panel-states"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"
import { summarizeTeamHistory } from "@/lib/world-cup/selectors"
import {
  formatEventTypeLabel,
  formatKickoffDate,
  formatMatchLabel,
} from "@/lib/world-cup/format"
import type { MatchEventType } from "@/lib/world-cup/types"

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

function TeamDetailShellSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <DetailHeaderSkeleton />
        </CardHeader>
        <CardContent className="pt-4">
          <CardListSkeleton cards={6} lines={2} />
        </CardContent>
      </Card>
    </div>
  )
}

function TeamHistorySkeleton() {
  return (
    <div className="space-y-4">
      <MetricGridSkeleton />
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Edition-by-edition history</CardTitle>
          <CardDescription>Loading the SQL aggregate history view.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <TableSkeleton rows={4} columns={8} />
        </CardContent>
      </Card>
    </div>
  )
}

function MatchDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <DetailHeaderSkeleton badges={2} />
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/80 shadow-none">
              <CardContent className="pt-4">
                <CardListSkeleton cards={1} />
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-none">
              <CardContent className="pt-4">
                <CardListSkeleton cards={1} />
              </CardContent>
            </Card>
          </div>
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Event timeline</CardTitle>
              <CardDescription>Loading the current match feed.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <CardListSkeleton cards={5} />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

function GroupDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Group</CardTitle>
          <CardDescription>Loading group composition.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <CardListSkeleton cards={4} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Standings</CardTitle>
          <CardDescription>Loading standings computed in SQL.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <TableSkeleton rows={4} columns={10} />
        </CardContent>
      </Card>
    </div>
  )
}

export function TeamDetailView({
  dashboard,
  initialTab = "squad",
}: {
  dashboard: DashboardState
  initialTab?: "squad" | "history"
}) {
  const historySummary = React.useMemo(
    () => summarizeTeamHistory(dashboard.teamHistory.data),
    [dashboard.teamHistory.data]
  )
  const [activeTab, setActiveTab] = React.useState<"squad" | "history">(initialTab)

  React.useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  if (dashboard.teams.isLoading && !dashboard.teams.data.length) {
    return <TeamDetailShellSkeleton />
  }

  if (dashboard.teams.isError && !dashboard.teams.data.length) {
    return (
      <PanelErrorState
        title="Unable to load team detail"
        description={dashboard.teams.errorMessage ?? "The team registry request failed."}
        onRetry={dashboard.teams.reload}
      />
    )
  }

  if (!dashboard.selectedTeam) {
    return (
      <PanelEmptyState
        title="Team not found"
        description="The current route does not map to a team in the selected edition."
      />
    )
  }

  return (
    <LoadingOverlay
      loading={dashboard.teams.isRefreshing}
      skeleton={<TeamDetailShellSkeleton />}
    >
      <div className="space-y-6">
        <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SemanticBadge tone="neutral">
                  {dashboard.selectedTeam.country_name}
                </SemanticBadge>
                {dashboard.selectedTeam.group_letter ? (
                  <SemanticBadge tone="qualified">
                    Group {dashboard.selectedTeam.group_letter}
                  </SemanticBadge>
                ) : null}
                {dashboard.selectedTeam.final_rank ? (
                  <SemanticBadge
                    tone={
                      dashboard.selectedTeam.final_rank === 1
                        ? "champion"
                        : "qualified"
                    }
                  >
                    Rank {dashboard.selectedTeam.final_rank}
                  </SemanticBadge>
                ) : null}
              </div>
              <div>
                <CardTitle className="font-heading text-3xl tracking-tight">
                  {dashboard.selectedTeam.team_name}
                </CardTitle>
                <CardDescription className="pt-1 text-sm">
                  Current coach: {dashboard.selectedTeam.coach_name}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
          <CardContent className="pt-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "squad" | "history")}
            >
            <TabsList variant="line">
              <TabsTrigger value="squad">Current squad</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="squad" className="space-y-3 pt-2">
              {dashboard.squad.isLoading ? (
                <CardListSkeleton cards={6} lines={2} />
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
                <LoadingOverlay
                  loading={dashboard.squad.isRefreshing}
                  skeleton={<CardListSkeleton cards={6} lines={2} />}
                >
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
                          <SemanticBadge tone="neutral">
                            #{player.shirt_number}
                          </SemanticBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </LoadingOverlay>
              )}
            </TabsContent>
            <TabsContent value="history" className="space-y-4 pt-2">
              {dashboard.teamHistory.isLoading ? (
                <TeamHistorySkeleton />
              ) : dashboard.teamHistory.isError && !dashboard.teamHistory.data.length ? (
                <PanelErrorState
                  title="Unable to load history"
                  description={
                    dashboard.teamHistory.errorMessage ??
                    "The history request failed."
                  }
                  onRetry={dashboard.teamHistory.reload}
                />
              ) : !dashboard.teamHistory.data.length ? (
                <PanelUnsupportedState
                  title="History unavailable"
                  description="The backend did not return historical rows for this team."
                />
              ) : (
                <LoadingOverlay
                  loading={dashboard.teamHistory.isRefreshing}
                  skeleton={<TeamHistorySkeleton />}
                >
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Participations"
                        value={historySummary.participations}
                      />
                      <MetricCard label="Titles" value={historySummary.titles} />
                      <MetricCard
                        label="Matches"
                        value={historySummary.totalMatches}
                      />
                      <MetricCard
                        label="Goal balance"
                        value={historySummary.goalBalance}
                      />
                    </div>
                    <Card className="border-border/80 shadow-none">
                      <CardHeader className="border-b border-border/70">
                        <CardTitle>Edition-by-edition history</CardTitle>
                        <CardDescription>
                          SQL aggregate view across participations, results, and goals.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {dashboard.teamHistory.errorMessage &&
                        dashboard.teamHistory.data.length ? (
                          <Alert>
                            <AlertTitle>Showing cached history rows</AlertTitle>
                            <AlertDescription>
                              {dashboard.teamHistory.errorMessage}
                            </AlertDescription>
                          </Alert>
                        ) : null}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Edition</TableHead>
                              <TableHead>Final rank</TableHead>
                              <TableHead className="text-right">MP</TableHead>
                              <TableHead className="text-right">W</TableHead>
                              <TableHead className="text-right">D</TableHead>
                              <TableHead className="text-right">L</TableHead>
                              <TableHead className="text-right">GF</TableHead>
                              <TableHead className="text-right">GA</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboard.teamHistory.data.map((row) => (
                              <TableRow key={`${row.team_id}-${row.edition_id}`}>
                                <TableCell className="font-medium text-foreground">
                                  {row.edition_year}
                                </TableCell>
                                <TableCell>
                                  {row.final_rank ? (
                                    <SemanticBadge
                                      tone={
                                        row.final_rank === 1
                                          ? "champion"
                                          : row.final_rank <= 4
                                            ? "qualified"
                                            : "neutral"
                                      }
                                    >
                                      {row.final_rank}
                                    </SemanticBadge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.matches_played}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.wins}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.draws}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.losses}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.goals_for}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.goals_against}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                </LoadingOverlay>
              )}
            </TabsContent>
          </Tabs>
          </CardContent>
        </Card>
      </div>
    </LoadingOverlay>
  )
}

export function MatchDetailView({ dashboard }: { dashboard: DashboardState }) {
  if (dashboard.matches.isLoading && !dashboard.matches.data.length) {
    return <MatchDetailSkeleton />
  }

  if (dashboard.matches.isError && !dashboard.matches.data.length) {
    return (
      <PanelErrorState
        title="Unable to load match detail"
        description={dashboard.matches.errorMessage ?? "The matches request failed."}
        onRetry={dashboard.matches.reload}
      />
    )
  }

  if (!dashboard.selectedMatch) {
    return (
      <PanelEmptyState
        title="Match not found"
        description="The current route does not map to a match in the selected edition."
      />
    )
  }

  return (
    <LoadingOverlay
      loading={dashboard.matches.isRefreshing}
      skeleton={<MatchDetailSkeleton />}
    >
      <div className="space-y-6">
        <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SemanticBadge tone="neutral">
                {dashboard.selectedMatch.phase_name}
              </SemanticBadge>
              {dashboard.selectedMatch.group_letter ? (
                <SemanticBadge tone="qualified">
                  Group {dashboard.selectedMatch.group_letter}
                </SemanticBadge>
              ) : null}
            </div>
            <div>
              <CardTitle className="font-heading text-3xl tracking-tight">
                {formatMatchLabel(dashboard.selectedMatch)}
              </CardTitle>
              <CardDescription className="pt-1 text-sm">
                {formatKickoffDate(dashboard.selectedMatch.kickoff_at)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/80 shadow-none">
              <CardContent className="px-4 py-4">
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
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-none">
              <CardContent className="px-4 py-4">
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
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            Match officials are not available in the current backend, so referee
            coverage is intentionally marked as unsupported here.
          </div>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-2">
                <TimerReset className="size-4 text-muted-foreground" />
                <CardTitle>Event timeline</CardTitle>
              </div>
              <CardDescription>
                Event feed tied to the current match route.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {dashboard.matchEvents.isLoading ? (
                <CardListSkeleton cards={5} />
              ) : dashboard.matchEvents.isError &&
                !dashboard.matchEvents.data.length ? (
                <PanelErrorState
                  title="Unable to load match events"
                  description={
                    dashboard.matchEvents.errorMessage ??
                    "The match events request failed."
                  }
                  onRetry={dashboard.matchEvents.reload}
                />
              ) : !dashboard.matchEvents.data.length ? (
                <PanelUnsupportedState
                  title="No event timeline returned"
                  description="The selected match does not expose event rows in the current backend."
                />
              ) : (
                <LoadingOverlay
                  loading={dashboard.matchEvents.isRefreshing}
                  skeleton={<CardListSkeleton cards={5} />}
                >
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
                </LoadingOverlay>
              )}
            </CardContent>
          </Card>
          </CardContent>
        </Card>
      </div>
    </LoadingOverlay>
  )
}

export function GroupDetailView({ dashboard }: { dashboard: DashboardState }) {
  if (dashboard.groups.isLoading && !dashboard.groupedGroups.length) {
    return <GroupDetailSkeleton />
  }

  if (dashboard.groups.isError && !dashboard.groupedGroups.length) {
    return (
      <PanelErrorState
        title="Unable to load group detail"
        description={dashboard.groups.errorMessage ?? "The group request failed."}
        onRetry={dashboard.groups.reload}
      />
    )
  }

  if (!dashboard.selectedGroup) {
    return (
      <PanelEmptyState
        title="Group not found"
        description="The current route does not map to a group in the selected edition."
      />
    )
  }

  return (
    <LoadingOverlay
      loading={dashboard.groups.isRefreshing}
      skeleton={<GroupDetailSkeleton />}
    >
      <div className="space-y-6">
        <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="font-heading text-3xl tracking-tight">
            Group {dashboard.selectedGroup.group_letter}
          </CardTitle>
          <CardDescription>
            {dashboard.selectedGroup.teams.filter((team) => team.team_name).length} teams
            {" "}in the current edition route.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.selectedGroup.teams.map((team) =>
              team.team_id ? (
                <button
                  key={`${dashboard.selectedGroup!.group_id}-${team.team_id}`}
                  type="button"
                  onClick={() => dashboard.focusTeam(team.team_id!, "history")}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-background"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {team.team_name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {team.coach_name}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Open history
                  </span>
                </button>
              ) : null
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>
            Standings · Group {dashboard.selectedGroup.group_letter}
          </CardTitle>
          <CardDescription>
            Points, goal difference, and goals scored are computed in SQL.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {dashboard.groups.errorMessage && dashboard.groupedGroups.length ? (
              <Alert>
                <AlertTitle>Group detail loaded with stale group data</AlertTitle>
                <AlertDescription>{dashboard.groups.errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {dashboard.standings.isLoading ? (
              <TableSkeleton rows={4} columns={10} />
            ) : dashboard.standings.isError && !dashboard.standings.data.length ? (
              <PanelErrorState
                title="Unable to compute standings"
                description={
                  dashboard.standings.errorMessage ??
                  "The standings request failed for the selected group."
                }
                onRetry={dashboard.standings.reload}
              />
            ) : !dashboard.standings.data.length ? (
              <PanelEmptyState
                title="No standings rows returned"
                description="The selected group did not produce any standings rows."
              />
            ) : (
              <LoadingOverlay
                loading={dashboard.standings.isRefreshing}
                skeleton={<TableSkeleton rows={4} columns={10} />}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">MP</TableHead>
                      <TableHead className="text-right">W</TableHead>
                      <TableHead className="text-right">D</TableHead>
                      <TableHead className="text-right">L</TableHead>
                      <TableHead className="text-right">GF</TableHead>
                      <TableHead className="text-right">GA</TableHead>
                      <TableHead className="text-right">GD</TableHead>
                      <TableHead className="text-right">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.standings.data.map((row) => (
                      <TableRow
                        key={row.team_id}
                        className="cursor-pointer"
                        onClick={() => dashboard.focusTeam(row.team_id, "history")}
                      >
                        <TableCell>
                          <SemanticBadge
                            tone={row.rank_position <= 2 ? "qualified" : "neutral"}
                          >
                            {row.rank_position}
                          </SemanticBadge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {row.team_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.matches_played}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.wins}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.draws}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.losses}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.goals_for}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.goals_against}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.goal_difference}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {row.points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </LoadingOverlay>
            )}
          </CardContent>
      </Card>

      {!dashboard.selectedEdition ? null : (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <CardTitle>Edition context</CardTitle>
            </div>
            <CardDescription>
              Group detail remains scoped to the selected World Cup edition.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <SemanticBadge tone="neutral">
                {dashboard.selectedEdition.edition_year} edition
              </SemanticBadge>
              <SemanticBadge tone="neutral">
                Host {dashboard.selectedEdition.host_country}
              </SemanticBadge>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </LoadingOverlay>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="space-y-1 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
