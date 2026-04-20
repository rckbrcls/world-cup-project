"use client"

import * as React from "react"

import {
  PanelEmptyState,
  PanelErrorState,
  PanelFilteredEmptyState,
  PanelLoadingState,
  PanelUnsupportedState,
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
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

export function GroupsSection({ dashboard }: { dashboard: DashboardState }) {
  const [searchValue, setSearchValue] = React.useState("")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const filteredGroups = React.useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return dashboard.groupedGroups
    }

    return dashboard.groupedGroups.filter((group) => {
      const haystack = [
        group.group_letter,
        ...group.teams.map((team) => team.team_name ?? ""),
        ...group.teams.map((team) => team.coach_name ?? ""),
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [dashboard.groupedGroups, deferredSearchValue])

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Competition structure"
        title="Groups"
        description="Group cards show roster composition first. The selected group then opens the calculated standings table from the SQL layer."
        actions={
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search group, team, or coach..."
            className="w-full min-w-56 bg-background sm:w-72"
          />
        }
      />

      {dashboard.groups.isLoading ? (
        <PanelLoadingState rows={6} />
      ) : dashboard.groups.isError && !dashboard.groupedGroups.length ? (
        <PanelErrorState
          title="Unable to load group composition"
          description={dashboard.groups.errorMessage ?? "The group request failed."}
          onRetry={dashboard.groups.reload}
        />
      ) : !dashboard.groupedGroups.length ? (
        <PanelEmptyState
          title="No groups returned"
          description="The current backend did not expose group composition for the selected edition."
        />
      ) : !filteredGroups.length ? (
        <PanelFilteredEmptyState
          title="No groups match the current search"
          description="Adjust the search text to recover a group card."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredGroups.map((group) => {
              const isSelected = group.group_id === dashboard.selectedGroupId

              return (
                <Card
                  key={group.group_id}
                  className={isSelected ? "border-primary/30 shadow-none" : "border-border/80 shadow-none"}
                >
                  <CardHeader className="border-b border-border/70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>Group {group.group_letter}</CardTitle>
                        <CardDescription>
                          {group.teams.filter((team) => team.team_name).length} teams
                        </CardDescription>
                      </div>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => dashboard.focusGroup(group.group_id)}
                      >
                        {isSelected ? "Selected" : "Open"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    {group.teams.map((team) =>
                      team.team_id ? (
                        <div
                          key={`${group.group_id}-${team.team_id}`}
                          className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {team.team_name}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {team.coach_name}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dashboard.focusTeam(team.team_id!, "history")}
                            >
                              History
                            </Button>
                          </div>
                        </div>
                      ) : null
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>
                {dashboard.selectedGroup
                  ? `Standings · Group ${dashboard.selectedGroup.group_letter}`
                  : "Standings"}
              </CardTitle>
              <CardDescription>
                Points, goal difference, and goals scored are computed in SQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {dashboard.groups.errorMessage && dashboard.groupedGroups.length ? (
                <Alert>
                  <AlertTitle>Group cards loaded with stale data</AlertTitle>
                  <AlertDescription>{dashboard.groups.errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {dashboard.standings.isLoading ? (
                <PanelLoadingState rows={4} />
              ) : dashboard.standings.isError && !dashboard.standings.data.length ? (
                <PanelErrorState
                  title="Unable to compute standings"
                  description={
                    dashboard.standings.errorMessage ??
                    "The standings request failed for the selected group."
                  }
                  onRetry={dashboard.standings.reload}
                />
              ) : !dashboard.selectedGroup ? (
                <PanelUnsupportedState
                  title="No group selected"
                  description="Pick a group card above to open its standings table."
                />
              ) : !dashboard.standings.data.length ? (
                <PanelEmptyState
                  title="No standings rows returned"
                  description="The selected group did not produce any standings rows."
                />
              ) : (
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
                        data-state={
                          row.team_id === dashboard.selectedTeamId
                            ? "selected"
                            : undefined
                        }
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
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
