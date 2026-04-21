"use client"

import * as React from "react"
import { Activity, Flag, Medal, Trophy } from "lucide-react"

import {
  CardListSkeleton,
  LoadingOverlay,
  MetricGridSkeleton,
  SectionHeadingSkeleton,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useOverviewSectionData } from "@/hooks/home/sections/use-overview-section-data"
import type { DashboardNavigationState } from "@/hooks/home/use-dashboard-navigation"
import { formatKickoffDate, formatMatchLabel, formatNumber } from "@/lib/world-cup/format"

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
}: {
  label: string
  value: string
  meta: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 py-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeadingSkeleton showActions={false} />
      <MetricGridSkeleton />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.8fr]">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <CardListSkeleton cards={index === 1 ? 2 : 3} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <CardListSkeleton cards={index === 0 ? 2 : 5} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function OverviewSection({
  navigation,
}: {
  navigation: DashboardNavigationState
}) {
  const dashboard = useOverviewSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
  const isOverviewLoading =
    dashboard.editions.isLoading ||
    (navigation.selectedEditionId !== null &&
      (dashboard.teams.isLoading ||
        dashboard.groups.isLoading ||
        dashboard.matches.isLoading ||
        dashboard.knockout.isLoading ||
        dashboard.topScorers.isLoading))
  const isOverviewRefreshing =
    dashboard.editions.isRefreshing ||
    dashboard.teams.isRefreshing ||
    dashboard.groups.isRefreshing ||
    dashboard.matches.isRefreshing ||
    dashboard.knockout.isRefreshing ||
    dashboard.topScorers.isRefreshing
  const finalMatch =
    dashboard.matches.data.find((match) => match.phase_name === "Final") ?? null

  const podium = [
    {
      label: "Champion",
      value: dashboard.selectedEdition?.champion_team ?? "Not defined",
      tone: "champion" as const,
    },
    {
      label: "Runner-up",
      value: dashboard.selectedEdition?.vice_champion_team ?? "Not defined",
      tone: "qualified" as const,
    },
    {
      label: "Third place",
      value: dashboard.selectedEdition?.third_place_team ?? "Not defined",
      tone: "neutral" as const,
    },
  ]

  const highlightedGroups = dashboard.groupedGroups.slice(0, 2)

  if (isOverviewLoading) {
    return <OverviewSkeleton />
  }

  return (
    <LoadingOverlay loading={isOverviewRefreshing} skeleton={<OverviewSkeleton />}>
      <div className="space-y-6">
        <SectionHeading
          title={
            dashboard.selectedEdition
              ? `${dashboard.selectedEdition.edition_year} Control Room`
              : "World Cup Control Room"
          }
          actions={
            dashboard.selectedEdition ? (
              <>
                <SemanticBadge tone="neutral">
                  Host {dashboard.selectedEdition.host_country}
                </SemanticBadge>
                {dashboard.overviewMetrics.leadingScorer ? (
                  <SemanticBadge tone="success">
                    Top scorer {dashboard.overviewMetrics.leadingScorer.player_name}
                  </SemanticBadge>
                ) : null}
              </>
            ) : null
          }
        />

        {(dashboard.teams.errorMessage ||
          dashboard.matches.errorMessage ||
          dashboard.groups.errorMessage ||
          dashboard.topScorers.errorMessage) &&
        (dashboard.teams.data.length ||
          dashboard.matches.data.length ||
          dashboard.groupedGroups.length ||
          dashboard.topScorers.data.length) ? (
          <Alert>
            <Activity />
            <AlertTitle>Partial dataset available</AlertTitle>
            <AlertDescription>
              Some overview panels are rendering with the last successful response
              because at least one supporting request failed.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Teams"
            value={formatNumber(dashboard.overviewMetrics.teamCount)}
            meta="edition participants"
            icon={Flag}
          />
          <MetricCard
            label="Groups"
            value={formatNumber(dashboard.overviewMetrics.groupCount)}
            meta="lettered group tables"
            icon={Activity}
          />
          <MetricCard
            label="Matches"
            value={formatNumber(dashboard.overviewMetrics.totalMatches)}
            meta={`${formatNumber(dashboard.overviewMetrics.knockoutMatches)} knockout fixtures`}
            icon={Trophy}
          />
          <MetricCard
            label="Goals"
            value={formatNumber(dashboard.overviewMetrics.totalGoals)}
            meta="derived from final scores"
            icon={Medal}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_0.8fr]">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Podium snapshot</CardTitle>
              <CardDescription>
                Final placement as exposed by the current edition summary endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {podium.map((entry, index) => (
                <div
                  key={entry.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {entry.label}
                    </p>
                    <p className="font-medium text-foreground">{entry.value}</p>
                  </div>
                  <SemanticBadge tone={entry.tone}>{index + 1}</SemanticBadge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Final spotlight</CardTitle>
              <CardDescription>
                The latest final match is promoted as the default operational anchor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {finalMatch ? (
                <>
                  <div className="space-y-2">
                    <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                      {formatMatchLabel(finalMatch)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <SemanticBadge tone="neutral">{finalMatch.phase_name}</SemanticBadge>
                      {finalMatch.group_letter ? (
                        <SemanticBadge tone="neutral">
                          Group {finalMatch.group_letter}
                        </SemanticBadge>
                      ) : null}
                      {finalMatch.winner_team_name ? (
                        <SemanticBadge tone="qualified">
                          Winner {finalMatch.winner_team_name}
                        </SemanticBadge>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {finalMatch.stadium_name}, {finalMatch.host_city_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatKickoffDate(finalMatch.kickoff_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-4xl font-semibold tabular-nums text-foreground">
                          {finalMatch.final_score}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {finalMatch.penalty_score
                            ? `Penalties ${finalMatch.penalty_score}`
                            : "Regular time"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigation.focusMatch(finalMatch.match_id)}>
                    Inspect match
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  No final match is available for the selected edition.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Leading scorer</CardTitle>
              <CardDescription>
                Current SQL ranking for goals in the selected edition.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {dashboard.overviewMetrics.leadingScorer ? (
                <>
                  <div className="space-y-1">
                    <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {dashboard.overviewMetrics.leadingScorer.player_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.overviewMetrics.leadingScorer.team_name}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
                    <span className="text-sm text-muted-foreground">Goals</span>
                    <span className="font-heading text-3xl font-semibold tabular-nums text-foreground">
                      {formatNumber(dashboard.overviewMetrics.leadingScorer.total_goals)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigation.focusTeam(
                        dashboard.overviewMetrics.leadingScorer!.team_id,
                        "history"
                      )
                    }
                  >
                    Open team history
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  Top-scorer data is not available for this edition yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Group preview</CardTitle>
              <CardDescription>
                The first available groups are surfaced to keep the home dense and operational.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
              {highlightedGroups.map((group) => (
                <div
                  key={group.group_id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
                      Group {group.group_letter}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigation.focusGroup(group.group_id)}
                    >
                      Open route
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {group.teams.map((team) =>
                      team.team_id ? (
                        <button
                          key={`${group.group_id}-${team.team_id}`}
                          type="button"
                          onClick={() => navigation.focusTeam(team.team_id!, "teams")}
                          className="flex w-full items-center justify-between rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-background"
                        >
                          <span className="font-medium text-foreground">
                            {team.team_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {team.coach_name}
                          </span>
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Recent match feed</CardTitle>
              <CardDescription>
                Latest fixtures from the selected edition for quick operational jumps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {dashboard.matches.data.slice(-5).reverse().map((match, index) => (
                <React.Fragment key={match.match_id}>
                  <button
                    type="button"
                    onClick={() => navigation.focusMatch(match.match_id)}
                    className="flex w-full items-center justify-between gap-4 rounded-md px-1 py-2 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {formatMatchLabel(match)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.phase_name} · {formatKickoffDate(match.kickoff_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
                        {match.final_score}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.penalty_score ? `P ${match.penalty_score}` : "FT"}
                      </p>
                    </div>
                  </button>
                  {index < 4 ? <Separator /> : null}
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingOverlay>
  )
}
