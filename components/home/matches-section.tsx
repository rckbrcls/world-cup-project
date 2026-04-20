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
import { formatKickoffDate, formatMatchLabel, formatPenaltyLabel } from "@/lib/world-cup/format"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

export function MatchesSection({ dashboard }: { dashboard: DashboardState }) {
  const [searchValue, setSearchValue] = React.useState("")
  const [phaseFilter, setPhaseFilter] = React.useState("all")
  const [groupFilter, setGroupFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("latest")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const phaseOptions = React.useMemo(
    () =>
      Array.from(new Set(dashboard.matches.data.map((match) => match.phase_name))).sort(),
    [dashboard.matches.data]
  )

  const groupOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          dashboard.matches.data
            .map((match) => match.group_letter)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [dashboard.matches.data]
  )

  const filteredMatches = React.useMemo(() => {
    const normalizedSearch = deferredSearchValue.trim().toLowerCase()

    const nextMatches = dashboard.matches.data.filter((match) => {
      const matchesPhase =
        phaseFilter === "all" ? true : match.phase_name === phaseFilter
      const matchesGroup =
        groupFilter === "all" ? true : match.group_letter === groupFilter

      if (!matchesPhase || !matchesGroup) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        match.home_team_name,
        match.away_team_name,
        match.stadium_name,
        match.host_city_name,
        match.phase_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })

    return [...nextMatches].sort((left, right) =>
      sortBy === "latest"
        ? right.kickoff_at.localeCompare(left.kickoff_at)
        : left.kickoff_at.localeCompare(right.kickoff_at)
    )
  }, [
    dashboard.matches.data,
    deferredSearchValue,
    groupFilter,
    phaseFilter,
    sortBy,
  ])

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Fixture control"
        title="Matches"
        description="Every match row stays tied to the backend contract: phase, date, stadium, host city, score, penalties, and winner."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search team or venue..."
              className="w-full min-w-56 bg-background sm:w-64"
            />
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All phases</SelectItem>
                {phaseOptions.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {groupOptions.map((group) => (
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
                <SelectItem value="latest">Latest first</SelectItem>
                <SelectItem value="earliest">Earliest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {dashboard.matches.isLoading ? (
        <PanelLoadingState rows={8} />
      ) : dashboard.matches.isError && !dashboard.matches.data.length ? (
        <PanelErrorState
          title="Unable to load matches"
          description={dashboard.matches.errorMessage ?? "The matches request failed."}
          onRetry={dashboard.matches.reload}
        />
      ) : !dashboard.matches.data.length ? (
        <PanelEmptyState
          title="No matches returned"
          description="The selected edition did not expose fixtures through the current backend."
        />
      ) : !filteredMatches.length ? (
        <PanelFilteredEmptyState
          title="No fixtures match the current filters"
          description="Adjust the search, phase, or group filter to recover matches."
        />
      ) : (
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Edition fixtures</CardTitle>
            <CardDescription>
              Click any row to inspect events in the shared panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {dashboard.matches.errorMessage && dashboard.matches.data.length ? (
              <Alert>
                <AlertTitle>Showing cached fixtures</AlertTitle>
                <AlertDescription>{dashboard.matches.errorMessage}</AlertDescription>
              </Alert>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow
                    key={match.match_id}
                    data-state={
                      match.match_id === dashboard.selectedMatchId
                        ? "selected"
                        : undefined
                    }
                    className="cursor-pointer"
                    onClick={() => dashboard.focusMatch(match.match_id)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div>{match.phase_name}</div>
                        {match.group_letter ? (
                          <SemanticBadge tone="neutral">
                            Group {match.group_letter}
                          </SemanticBadge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatMatchLabel(match)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatKickoffDate(match.kickoff_at)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{match.stadium_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {match.host_city_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-heading text-lg font-semibold tabular-nums text-foreground">
                          {match.final_score}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPenaltyLabel(match.penalty_score)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {match.winner_team_name ? (
                        <SemanticBadge tone="qualified">
                          {match.winner_team_name}
                        </SemanticBadge>
                      ) : (
                        <span className="text-muted-foreground">Draw</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
