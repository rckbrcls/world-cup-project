"use client"

import * as React from "react"
import {
  Database,
  FileCode2,
  Loader2,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"

import {
  CardListSkeleton,
  LoadingOverlay,
  MetricGridSkeleton,
  PanelErrorState,
  SemanticBadge,
} from "@/components/home/panel-states"
import { SectionHeading } from "@/components/home/section-heading"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatabaseSectionData } from "@/hooks/home/sections/use-database-section-data"
import { formatNumber } from "@/lib/world-cup/format"

type DatabaseAction = "initialize" | "reporting" | "populate" | "cleanup"

function formatSyntheticTimestamp(value: string | null) {
  if (!value) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatTableLabel(tableName: string) {
  return tableName.replaceAll("_", " ")
}

function getActionLabel(action: DatabaseAction) {
  switch (action) {
    case "initialize":
      return "initialize the database"
    case "reporting":
      return "apply the reporting queries"
    case "populate":
      return "populate the synthetic dataset"
    case "cleanup":
      return "remove the synthetic dataset"
  }
}

function DatabaseActionCard({
  title,
  description,
  actionLabel,
  icon: Icon,
  disabled,
  isPending,
  onClick,
  variant = "default",
}: {
  title: string
  description: string
  actionLabel: string
  icon: React.ComponentType<{ className?: string }>
  disabled: boolean
  isPending: boolean
  onClick: () => void
  variant?: "default" | "outline" | "destructive"
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border/80 bg-muted/30 p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Button variant={variant} disabled={disabled} onClick={onClick}>
          {isPending ? <Loader2 className="animate-spin" /> : <Icon />}
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function DatabaseWorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-2">
                <Skeleton className="size-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <MetricGridSkeleton count={5} className="xl:grid-cols-5" />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/80 shadow-none">
          <CardContent className="space-y-3 pt-4">
            <CardListSkeleton cards={4} />
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardContent className="space-y-3 pt-4">
            <CardListSkeleton cards={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function DatabaseSection() {
  const dashboard = useDatabaseSectionData()
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false)
  const status = dashboard.databaseStatus.data
  const isStatusLoading =
    dashboard.databaseStatus.isLoading && dashboard.databaseStatus.data === null
  const isMutating = dashboard.databaseMutation.isPending
  const tableCounts = React.useMemo(
    () =>
      Object.entries(status?.table_counts ?? {}).sort(([left], [right]) =>
        left.localeCompare(right)
      ),
    [status?.table_counts]
  )

  const runAction = React.useCallback(
    async (
      action: DatabaseAction,
      callback: () => Promise<{ status: string; message: string }>
    ) => {
      try {
        const result = await callback()

        if (result.status === "already_initialized" || result.status === "already_seeded") {
          toast.info(result.message)
          return
        }

        if (result.status === "nothing_to_clean") {
          toast.info(result.message)
          return
        }

        toast.success(result.message)
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Unable to ${getActionLabel(action)}.`
        )
      }
    },
    []
  )

  const handleInitialize = React.useCallback(
    () => runAction("initialize", dashboard.initializeDatabase),
    [dashboard.initializeDatabase, runAction]
  )

  const handleApplyReporting = React.useCallback(
    () => runAction("reporting", dashboard.applyReportingQueries),
    [dashboard.applyReportingQueries, runAction]
  )

  const handlePopulate = React.useCallback(
    () => runAction("populate", dashboard.populateSyntheticData),
    [dashboard.populateSyntheticData, runAction]
  )

  const handleRemove = React.useCallback(async () => {
    await runAction("cleanup", dashboard.removeSyntheticData)
    setIsRemoveDialogOpen(false)
  }, [dashboard.removeSyntheticData, runAction])

  if (isStatusLoading) {
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Operations"
          title="Database Workspace"
          description="Initialize schema objects, reapply query artifacts, and manage the canonical synthetic batch from one dedicated workspace."
        />
        <DatabaseWorkspaceSkeleton />
      </div>
    )
  }

  if (dashboard.databaseStatus.isError && status === null) {
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Operations"
          title="Database Workspace"
          description="Initialize schema objects, reapply query artifacts, and manage the canonical synthetic batch from one dedicated workspace."
        />
        <PanelErrorState
          title="Unable to inspect the database"
          description={
            dashboard.databaseStatus.errorMessage ??
            "The database status request failed."
          }
          onRetry={dashboard.databaseStatus.reload}
        />
      </div>
    )
  }

  return (
    <LoadingOverlay
      loading={dashboard.databaseStatus.isRefreshing}
      skeleton={<DatabaseWorkspaceSkeleton />}
    >
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Operations"
          title="Database Workspace"
          description="Initialize schema objects, reapply query artifacts, and manage the canonical synthetic batch from one dedicated workspace."
          actions={
            <div className="flex flex-wrap gap-2">
              <SemanticBadge tone={status?.schema_exists ? "success" : "warning"}>
                {status?.schema_exists ? "Schema ready" : "Schema missing"}
              </SemanticBadge>
              <SemanticBadge
                tone={status?.reporting_layer_ready ? "success" : "warning"}
              >
                {status?.reporting_layer_ready
                  ? "Query layer ready"
                  : "Query layer pending"}
              </SemanticBadge>
              <SemanticBadge
                tone={status?.has_active_batch ? "qualified" : "neutral"}
              >
                {status?.has_active_batch ? "Synthetic batch active" : "No active batch"}
              </SemanticBadge>
            </div>
          }
        />

        {status?.inspection_warning || dashboard.databaseStatus.errorMessage ? (
          <Alert>
            <ShieldAlert />
            <AlertTitle>Database status warning</AlertTitle>
            <AlertDescription>
              {status?.inspection_warning ?? dashboard.databaseStatus.errorMessage}
            </AlertDescription>
          </Alert>
        ) : null}

        {dashboard.databaseMutation.errorMessage ? (
          <Alert>
            <ShieldAlert />
            <AlertTitle>Last database operation failed</AlertTitle>
            <AlertDescription>
              {dashboard.databaseMutation.errorMessage}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <DatabaseActionCard
            title="Initialize database"
            description="Apply `sql/ddl.sql`, `sql/synthetic_support.sql`, and `sql/queries.sql` for the current database state."
            actionLabel="Initialize database"
            icon={Wrench}
            disabled={
              isMutating ||
              Boolean(
                status?.schema_exists &&
                  status?.reporting_layer_ready &&
                  status?.seed_functions_ready &&
                  status?.cleanup_function_ready &&
                  status?.synthetic_status_ready,
              )
            }
            isPending={isMutating && dashboard.databaseMutation.action === "initialize"}
            onClick={handleInitialize}
          />

          <DatabaseActionCard
            title="Apply reporting queries"
            description="Reapply `sql/queries.sql` after schema changes or partial setup."
            actionLabel="Apply reporting queries"
            icon={FileCode2}
            variant="outline"
            disabled={isMutating || !status?.schema_exists}
            isPending={isMutating && dashboard.databaseMutation.action === "reporting"}
            onClick={handleApplyReporting}
          />

          <DatabaseActionCard
            title="Populate synthetic data"
            description="Seed the canonical SQL-backed sample dataset for editions, groups, matches, and events."
            actionLabel="Populate synthetic data"
            icon={Database}
            disabled={isMutating || !status?.seed_functions_ready}
            isPending={isMutating && dashboard.databaseMutation.action === "populate"}
            onClick={handlePopulate}
          />

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-border/80 bg-muted/30 p-2 text-muted-foreground">
                  <Trash2 className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Remove synthetic data</CardTitle>
                  <CardDescription>
                    Clean only the rows tracked in the active synthetic batch.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <AlertDialog
                open={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
              >
                <Button
                  variant="destructive"
                  disabled={isMutating || !status?.has_active_batch}
                  onClick={() => setIsRemoveDialogOpen(true)}
                >
                  {isMutating && dashboard.databaseMutation.action === "cleanup" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                  Remove synthetic data
                </Button>

                <AlertDialogContent size="default">
                  <AlertDialogHeader>
                    <AlertDialogMedia>
                      <ShieldAlert className="size-5" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Remove synthetic dataset?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This operation removes only the tracked synthetic batch and
                      keeps the database schema in place.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isMutating}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isMutating}
                      onClick={handleRemove}
                    >
                      Confirm removal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Active batch
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
              {status?.active_batch_id ?? "None"}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Editions
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
              {formatNumber(status?.edition_count ?? 0)}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Teams
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
              {formatNumber(status?.team_count ?? 0)}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Matches
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
              {formatNumber(status?.match_count ?? 0)}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tracked rows
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
              {formatNumber(status?.total_rows ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Dataset key
              </p>
              <p className="mt-1 font-medium text-foreground">
                {status?.dataset_key ?? "Not seeded"}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Edition years
              </p>
              <p className="mt-1 font-medium text-foreground">
                {status?.edition_years.length
                  ? status.edition_years.join(", ")
                  : "None"}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Created at
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formatSyntheticTimestamp(status?.created_at ?? null)}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Last cleanup
              </p>
              <p className="mt-1 font-medium text-foreground">
                {formatSyntheticTimestamp(status?.cleaned_at ?? null)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Tracked row counts</p>
              <SemanticBadge tone="neutral">{tableCounts.length} tables</SemanticBadge>
            </div>

            {tableCounts.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {tableCounts.map(([tableName, rowCount]) => (
                  <div
                    key={tableName}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {formatTableLabel(tableName)}
                    </p>
                    <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {formatNumber(rowCount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No tracked synthetic rows are available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </LoadingOverlay>
  )
}
