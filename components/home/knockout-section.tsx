"use client"

import * as React from "react"

import {
  PanelEmptyState,
  PanelErrorState,
  PanelLoadingState,
  PanelUnsupportedState,
  SemanticBadge,
} from "@/components/home/panel-states"
import { SectionHeading } from "@/components/home/section-heading"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatKickoffDate, formatMatchLabel } from "@/lib/world-cup/format"
import type { useWorldCupDashboard } from "@/hooks/use-world-cup-dashboard"

type DashboardState = ReturnType<typeof useWorldCupDashboard>

export function KnockoutSection({ dashboard }: { dashboard: DashboardState }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Elimination path"
        title="Knockout"
        description="This bracket view stays restrained and factual, grouping matches by phase directly from the knockout SQL function."
      />

      {dashboard.knockout.isLoading ? (
        <PanelLoadingState rows={6} />
      ) : dashboard.knockout.isError && !dashboard.knockout.data.length ? (
        <PanelErrorState
          title="Unable to load knockout path"
          description={
            dashboard.knockout.errorMessage ?? "The knockout request failed."
          }
          onRetry={dashboard.knockout.reload}
        />
      ) : !dashboard.knockout.data.length ? (
        <PanelUnsupportedState
          title="Knockout path unavailable"
          description="The selected edition does not expose knockout rows in the current backend."
        />
      ) : !dashboard.knockoutByPhase.length ? (
        <PanelEmptyState
          title="No knockout phases returned"
          description="The backend returned an empty knockout structure for the current edition."
        />
      ) : (
        <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-border/80 bg-card">
          <div className="grid min-w-max gap-4 p-4 xl:grid-cols-3">
            {dashboard.knockoutByPhase.map((phase) => (
              <Card
                key={phase.phase_name}
                className="min-w-[20rem] border-border/80 shadow-none"
              >
                <CardHeader className="border-b border-border/70">
                  <CardTitle>{phase.phase_name}</CardTitle>
                  <CardDescription>
                    {phase.matches.length} match
                    {phase.matches.length === 1 ? "" : "es"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {phase.matches.map((match) => {
                    const isSelected =
                      dashboard.selectedMatchId === match.match_id

                    return (
                      <button
                        key={match.match_id}
                        type="button"
                        onClick={() => dashboard.focusMatch(match.match_id, "knockout")}
                        className={[
                          "w-full rounded-lg border px-4 py-4 text-left transition-colors",
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/70 bg-muted/20 hover:bg-background",
                        ].join(" ")}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {formatMatchLabel(match)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatKickoffDate(match.kickoff_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                                {match.final_score}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {match.penalty_score
                                  ? `P ${match.penalty_score}`
                                  : "FT"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                              {match.stadium_name}
                            </span>
                            {match.winner_team_name ? (
                              <SemanticBadge tone="qualified">
                                {match.winner_team_name}
                              </SemanticBadge>
                            ) : null}
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Open route
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
