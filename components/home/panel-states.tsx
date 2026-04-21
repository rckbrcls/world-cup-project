import * as React from "react"
import {
  CircleOff,
  SearchX,
  ServerCrash,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type PanelStateBaseProps = {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

type SemanticBadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "destructive"
  | "champion"
  | "qualified"

const semanticBadgeToneClasses: Record<SemanticBadgeTone, string> = {
  neutral:
    "border-border/80 bg-muted/80 text-muted-foreground dark:bg-muted/45 dark:text-muted-foreground",
  success:
    "border-success/25 bg-success/12 text-success dark:border-success/35 dark:bg-success/18 dark:text-success",
  warning:
    "border-warning/25 bg-warning/14 text-warning dark:border-warning/35 dark:bg-warning/18 dark:text-warning",
  destructive:
    "border-destructive/25 bg-destructive/12 text-destructive dark:border-destructive/35 dark:bg-destructive/18 dark:text-destructive",
  champion:
    "border-champion/30 bg-champion/14 text-champion dark:border-champion/40 dark:bg-champion/18 dark:text-champion",
  qualified:
    "border-qualified/28 bg-qualified/12 text-qualified dark:border-qualified/38 dark:bg-qualified/18 dark:text-qualified",
}

function PanelStateFrame({
  title,
  description,
  action,
  className,
  icon,
}: PanelStateBaseProps & { icon: React.ReactNode }) {
  return (
    <Empty
      className={cn(
        "min-h-[220px] justify-center rounded-xl border border-dashed border-border bg-muted/20",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

export function SemanticBadge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<typeof Badge> & { tone?: SemanticBadgeTone }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", semanticBadgeToneClasses[tone], className)}
      {...props}
    />
  )
}

export function PanelLoadingState({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-6 w-20 rounded-full", className)} />
}

export function SectionHeadingSkeleton({
  showActions = true,
  className,
}: {
  showActions?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/80 pb-4 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full" />
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
      </div>
      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      ) : null}
    </div>
  )
}

export function MetricGridSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/80 bg-card px-5 py-4"
        >
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-4 w-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${columnIndex}`}
                className={cn(
                  "h-4 w-full",
                  columnIndex === 0 ? "max-w-20" : columnIndex === columns - 1 ? "max-w-16" : "max-w-32"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailHeaderSkeleton({
  badges = 3,
  className,
}: {
  badges?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: badges }).map((_, index) => (
          <BadgeSkeleton key={index} />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}

export function CardListSkeleton({
  cards = 4,
  lines = 3,
  className,
}: {
  cards?: number
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4"
        >
          <div className="space-y-3">
            {Array.from({ length: lines }).map((__, lineIndex) => (
              <Skeleton
                key={lineIndex}
                className={cn(
                  "h-4",
                  lineIndex === 0
                    ? "w-1/2"
                    : lineIndex === lines - 1
                      ? "w-1/3"
                      : "w-2/3"
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CommandMenuSkeleton({
  groups = 4,
  rowsPerGroup = 3,
  className,
}: {
  groups?: number
  rowsPerGroup?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-4 px-2 py-2", className)}>
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <div key={groupIndex} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="space-y-1">
            {Array.from({ length: rowsPerGroup }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center gap-2 rounded-lg px-2 py-2"
              >
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingOverlay({
  loading,
  children,
  skeleton,
  className,
}: {
  loading: boolean
  children: React.ReactNode
  skeleton?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative", className)} aria-busy={loading}>
      {children}
      {loading ? (
        <div className="absolute inset-0 z-10 rounded-[inherit] bg-background/80 p-4 backdrop-blur-[1px]">
          {skeleton ?? <PanelLoadingState rows={4} className="pt-1" />}
        </div>
      ) : null}
    </div>
  )
}

export function PanelEmptyState(props: PanelStateBaseProps) {
  return (
    <PanelStateFrame
      icon={<CircleOff className="size-4" />}
      {...props}
    />
  )
}

export function PanelFilteredEmptyState(props: PanelStateBaseProps) {
  return (
    <PanelStateFrame
      icon={<SearchX className="size-4" />}
      {...props}
    />
  )
}

export function PanelUnsupportedState(props: PanelStateBaseProps) {
  return (
    <PanelStateFrame
      icon={<TriangleAlert className="size-4" />}
      {...props}
    />
  )
}

export function PanelBackendUnavailableState({
  onRetry,
  ...props
}: PanelStateBaseProps & { onRetry?: () => void }) {
  return (
    <PanelStateFrame
      icon={<ServerCrash className="size-4" />}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry request
          </Button>
        ) : undefined
      }
      {...props}
    />
  )
}

export function PanelErrorState({
  onRetry,
  retryLabel = "Retry request",
  ...props
}: PanelStateBaseProps & {
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <PanelStateFrame
      icon={<TriangleAlert className="size-4" />}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
      {...props}
    />
  )
}
