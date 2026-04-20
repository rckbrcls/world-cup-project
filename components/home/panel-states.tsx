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
    "border-border bg-muted/70 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground",
  success:
    "border-success/20 bg-success/12 text-success dark:border-success/30 dark:bg-success/18 dark:text-success",
  warning:
    "border-warning/20 bg-warning/12 text-warning dark:border-warning/30 dark:bg-warning/18 dark:text-warning",
  destructive:
    "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/16 dark:text-destructive",
  champion:
    "border-champion/25 bg-champion/12 text-champion dark:border-champion/35 dark:bg-champion/16 dark:text-champion",
  qualified:
    "border-qualified/25 bg-qualified/12 text-qualified dark:border-qualified/35 dark:bg-qualified/18 dark:text-qualified",
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
