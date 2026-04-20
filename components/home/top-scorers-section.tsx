"use client"

import * as React from "react"

import {
  PanelEmptyState,
  PanelErrorState,
  PanelFilteredEmptyState,
  PanelLoadingState,
  SemanticBadge,
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/world-cup/format"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

export function TopScorersSection({ dashboard }: { dashboard: DashboardState }) {
  const [searchValue, setSearchValue] = React.useState("")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return dashboard.topScorers.data
    }

    return dashboard.topScorers.data.filter((row) =>
      `${row.player_name} ${row.team_name}`.toLowerCase().includes(normalizedSearch)
    )
  }, [dashboard.topScorers.data, deferredSearchValue])

  const leader = filteredRows.at(0) ?? dashboard.topScorers.data.at(0) ?? null

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Scoring output"
        title="Top scorers"
        description="Goals count GOAL and PENALTY_GOAL only, matching the SQL-first business rules from the current schema."
        actions={
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search player or team..."
            className="w-full min-w-56 bg-background sm:w-72"
          />
        }
      />

      {dashboard.topScorers.isLoading ? (
        <PanelLoadingState rows={6} />
      ) : dashboard.topScorers.isError && !dashboard.topScorers.data.length ? (
        <PanelErrorState
          title="Unable to load top scorers"
          description={
            dashboard.topScorers.errorMessage ??
            "The scorer ranking request failed."
          }
          onRetry={dashboard.topScorers.reload}
        />
      ) : !dashboard.topScorers.data.length ? (
        <PanelEmptyState
          title="No scorer ranking returned"
          description="The selected edition does not expose top-scorer rows in the current backend."
        />
      ) : !filteredRows.length ? (
        <PanelFilteredEmptyState
          title="No scorer matches the current search"
          description="Adjust the player or team search to recover ranking rows."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/70">
                <CardTitle>Ranking leader</CardTitle>
                <CardDescription>
                  Quick access to the current scoring reference.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {leader ? (
                  <>
                    <div className="space-y-1">
                      <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                        {leader.player_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leader.team_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                      <span className="text-sm text-muted-foreground">Goals</span>
                      <span className="font-heading text-3xl font-semibold tabular-nums text-foreground">
                        {formatNumber(leader.total_goals)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => dashboard.focusTeam(leader.team_id, "history")}
                    >
                      Open team history
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="border-b border-border/70">
                <CardTitle>Scoring table</CardTitle>
                <CardDescription>
                  Rank is produced by the SQL view and preserved here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {dashboard.topScorers.errorMessage && dashboard.topScorers.data.length ? (
                  <Alert>
                    <AlertTitle>Showing cached ranking</AlertTitle>
                    <AlertDescription>
                      {dashboard.topScorers.errorMessage}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Goals</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.player_id}>
                        <TableCell>
                          <SemanticBadge
                            tone={row.rank_position === 1 ? "champion" : "neutral"}
                          >
                            {row.rank_position}
                          </SemanticBadge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {row.player_name}
                        </TableCell>
                        <TableCell>{row.team_name}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {row.total_goals}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dashboard.focusTeam(row.team_id, "history")}
                          >
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
