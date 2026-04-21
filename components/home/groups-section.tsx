"use client"

import * as React from "react"

import {
  CardListSkeleton,
  LoadingOverlay,
  PanelEmptyState,
  PanelErrorState,
  PanelFilteredEmptyState,
} from "@/components/home/panel-states"
import { SectionHeading } from "@/components/home/section-heading"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useGroupsSectionData } from "@/hooks/home/sections/use-groups-section-data"
import type { DashboardNavigationState } from "@/hooks/home/use-dashboard-navigation"

function GroupsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-9 w-16" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <CardListSkeleton cards={4} lines={2} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function GroupsSection({
  navigation,
}: {
  navigation: DashboardNavigationState
}) {
  const dashboard = useGroupsSectionData({
    selectedEditionId: navigation.selectedEditionId,
  })
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
        description="Group cards stay focused on exploration here. Opening a card moves the workspace to the dedicated group detail route."
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
        <GroupsGridSkeleton />
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
        <LoadingOverlay
          loading={dashboard.groups.isRefreshing}
          skeleton={<GroupsGridSkeleton />}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredGroups.map((group) => (
              <Card key={group.group_id} className="border-border/80 shadow-none">
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Group {group.group_letter}</CardTitle>
                      <CardDescription>
                        {group.teams.filter((team) => team.team_name).length} teams
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigation.focusGroup(group.group_id)}
                    >
                      Open
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {group.teams.map((team) =>
                    team.team_id ? (
                      <button
                        key={`${group.group_id}-${team.team_id}`}
                        type="button"
                        onClick={() =>
                          navigation.focusTeam(team.team_id!, "history")
                        }
                        className="w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-background"
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
                          <span className="text-sm font-medium text-muted-foreground">
                            Open history
                          </span>
                        </div>
                      </button>
                    ) : null
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </LoadingOverlay>
      )}
    </div>
  )
}
