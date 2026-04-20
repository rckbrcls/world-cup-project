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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

export function TeamsSection({ dashboard }: { dashboard: DashboardState }) {
  const [searchValue, setSearchValue] = React.useState("")
  const [groupFilter, setGroupFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("rank")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const availableGroups = React.useMemo(
    () =>
      Array.from(
        new Set(
          dashboard.teams.data
            .map((team) => team.group_letter)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [dashboard.teams.data]
  )

  const filteredTeams = React.useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase()

    const nextTeams = dashboard.teams.data.filter((team) => {
      const matchesGroup =
        groupFilter === "all" ? true : team.group_letter === groupFilter

      if (!matchesGroup) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        team.team_name,
        team.country_name,
        team.coach_name,
        team.group_letter ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })

    return [...nextTeams].sort((left, right) => {
      switch (sortBy) {
        case "team":
          return left.team_name.localeCompare(right.team_name)
        case "country":
          return left.country_name.localeCompare(right.country_name)
        default: {
          const leftRank = left.final_rank ?? Number.MAX_SAFE_INTEGER
          const rightRank = right.final_rank ?? Number.MAX_SAFE_INTEGER
          return leftRank - rightRank || left.team_name.localeCompare(right.team_name)
        }
      }
    })
  }, [dashboard.teams.data, deferredSearchValue, groupFilter, sortBy])

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Competition registry"
        title="Teams"
        description="The table stays dense and operational: current edition team list, coach ownership, group placement, and final rank from the SQL dataset."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search team, country, or coach..."
              className="w-full min-w-56 bg-background sm:w-64"
            />
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    Group {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Sort by rank</SelectItem>
                <SelectItem value="team">Sort by team</SelectItem>
                <SelectItem value="country">Sort by country</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {dashboard.teams.isLoading ? (
        <PanelLoadingState rows={8} />
      ) : dashboard.teams.isError && !dashboard.teams.data.length ? (
        <PanelErrorState
          title="Unable to load edition teams"
          description={dashboard.teams.errorMessage ?? "The team registry request failed."}
          onRetry={dashboard.teams.reload}
        />
      ) : !dashboard.teams.data.length ? (
        <PanelEmptyState
          title="No teams returned"
          description="The selected edition did not return participating teams from the current backend."
        />
      ) : !filteredTeams.length ? (
        <PanelFilteredEmptyState
          title="No teams match the current filters"
          description="Adjust the text search or group filter to recover the edition roster."
        />
      ) : (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Edition team registry</CardTitle>
            <CardDescription>
              {formatNumber(filteredTeams.length)} teams visible from{" "}
              {formatNumber(dashboard.teams.data.length)} loaded rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {dashboard.teams.errorMessage && dashboard.teams.data.length ? (
              <Alert>
                <AlertTitle>Showing cached registry rows</AlertTitle>
                <AlertDescription>
                  {dashboard.teams.errorMessage}
                </AlertDescription>
              </Alert>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Final rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => {
                  const isSelected = team.team_id === dashboard.selectedTeamId
                  const rankTone =
                    team.final_rank === 1
                      ? "champion"
                      : team.final_rank !== null && team.final_rank <= 4
                        ? "qualified"
                        : "neutral"

                  return (
                    <TableRow
                      key={team.team_id}
                      data-state={isSelected ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => dashboard.focusTeam(team.team_id, "teams")}
                    >
                      <TableCell className="font-medium text-foreground">
                        {team.team_name}
                      </TableCell>
                      <TableCell>{team.country_name}</TableCell>
                      <TableCell className="max-w-[18rem] truncate">
                        {team.coach_name}
                      </TableCell>
                      <TableCell>
                        {team.group_letter ? (
                          <SemanticBadge tone="neutral">
                            Group {team.group_letter}
                          </SemanticBadge>
                        ) : (
                          <span className="text-muted-foreground">Knockout only</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {team.final_rank ? (
                          <SemanticBadge tone={rankTone}>{team.final_rank}</SemanticBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
