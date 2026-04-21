"use client"

import * as React from "react"

import {
  LoadingOverlay,
  MetricGridSkeleton,
  PanelEmptyState,
  PanelErrorState,
  SemanticBadge,
  TableSkeleton,
} from "@/components/home/panel-states"
import { SectionHeading } from "@/components/home/section-heading"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { summarizeTeamHistory } from "@/lib/world-cup/selectors"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <MetricGridSkeleton />
      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Edition-by-edition history</CardTitle>
          <CardDescription>Loading the SQL aggregate history view.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <TableSkeleton rows={5} columns={8} />
        </CardContent>
      </Card>
    </div>
  )
}

export function HistorySection({ dashboard }: { dashboard: DashboardState }) {
  const historySummary = React.useMemo(
    () => summarizeTeamHistory(dashboard.teamHistory.data),
    [dashboard.teamHistory.data]
  )

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Contextual history"
        title={
          dashboard.selectedTeam
            ? `${dashboard.selectedTeam.team_name} history`
            : "Team history"
        }
        description="This section stays contextual by design because the backend exposes team history one team at a time."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => dashboard.focusSection("teams")}
          >
            Open teams route
          </Button>
        }
      />

      {!dashboard.selectedTeam ? (
        <PanelEmptyState
          title="No team selected"
          description="Pick a team from the sidebar, command menu, team table, or scorer ranking to activate this history view."
        />
      ) : dashboard.teamHistory.isLoading ? (
        <HistorySkeleton />
      ) : dashboard.teamHistory.isError && !dashboard.teamHistory.data.length ? (
        <PanelErrorState
          title="Unable to load team history"
          description={
            dashboard.teamHistory.errorMessage ??
            "The historical record request failed for the selected team."
          }
          onRetry={dashboard.teamHistory.reload}
        />
      ) : !dashboard.teamHistory.data.length ? (
        <PanelEmptyState
          title="No historical record returned"
          description="The current backend did not return edition history for this team."
        />
      ) : (
        <LoadingOverlay
          loading={dashboard.teamHistory.isRefreshing}
          skeleton={<HistorySkeleton />}
        >
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border/80 shadow-none">
                <CardContent className="space-y-1 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Participations
                  </p>
                  <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {historySummary.participations}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/80 shadow-none">
                <CardContent className="space-y-1 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Titles
                  </p>
                  <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {historySummary.titles}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/80 shadow-none">
                <CardContent className="space-y-1 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Matches
                  </p>
                  <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {historySummary.totalMatches}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/80 shadow-none">
                <CardContent className="space-y-1 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Goal balance
                  </p>
                  <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {historySummary.goalBalance}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/70">
                <CardTitle>Edition-by-edition history</CardTitle>
                <CardDescription>
                  SQL aggregate view across participations, results, and goals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {dashboard.teamHistory.errorMessage && dashboard.teamHistory.data.length ? (
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
    </div>
  )
}
