"use client"

import * as React from "react"
import { Bot, Database, LoaderCircle, Play, RefreshCcw } from "lucide-react"

import { SemanticBadge } from "@/components/home/panel-states"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useSqlAssistant } from "@/hooks/use-sql-assistant"
import type { HomeSectionId } from "@/hooks/use-world-cup-dashboard"
import type { ModelStatus } from "@/lib/sql-assistant/types"

type NaturalQueryPanelProps = {
  section: HomeSectionId
  editionId: number | null
  editionYear: number | null
  teamId: number | null
  matchId: number | null
  groupId: number | null
}

const statusToneMap: Record<
  ModelStatus,
  "neutral" | "warning" | "destructive" | "success"
> = {
  unavailable: "destructive",
  "not-downloaded": "warning",
  downloading: "warning",
  initializing: "warning",
  ready: "success",
  processing: "warning",
  error: "destructive",
  fallback: "neutral",
}

export function NaturalQueryPanel({
  section,
  editionId,
  editionYear,
  teamId,
  matchId,
  groupId,
}: NaturalQueryPanelProps) {
  const assistant = useSqlAssistant()
  const [prompt, setPrompt] = React.useState("")

  const canSubmit =
    !assistant.isSubmitting && prompt.trim().length > 0 && editionId !== null

  const handleSubmit = React.useCallback(async () => {
    await assistant.submit(prompt, {
      section,
      editionId,
      editionYear,
      teamId,
      matchId,
      groupId,
    })
  }, [
    assistant,
    editionId,
    editionYear,
    groupId,
    matchId,
    prompt,
    section,
    teamId,
  ])

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Prepared Capability"
        title="Natural Query Workspace"
        description="This area is intentionally secondary to the operational UI. It prepares the lifecycle, contracts, and review surfaces for local Gemma 4 SQL generation without making chat the center of the product."
        actions={
          <>
            <SemanticBadge
              tone={assistant.status ? statusToneMap[assistant.status.status] : "neutral"}
            >
              {assistant.status?.summary ?? "Checking model status"}
            </SemanticBadge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void assistant.refreshStatus()}
              disabled={assistant.isLoading}
            >
              {assistant.isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCcw />
              )}
              Refresh
            </Button>
          </>
        }
      />

      {assistant.status?.detail ? (
        <Alert>
          <Bot />
          <AlertTitle>Gemma 4 readiness</AlertTitle>
          <AlertDescription>{assistant.status.detail}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Natural-language prompt</CardTitle>
            <CardDescription>
              Ask for an analytical SQL query tied to the currently selected
              edition or object. The generated SQL remains visible for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Show all semifinal matches for the selected edition with stadium, score, and winner."
              className="min-h-36 resize-none bg-background"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SemanticBadge tone="neutral">Edition {editionYear ?? "N/A"}</SemanticBadge>
              <SemanticBadge tone="neutral">Section {section}</SemanticBadge>
              {teamId ? <SemanticBadge tone="neutral">Team #{teamId}</SemanticBadge> : null}
              {matchId ? <SemanticBadge tone="neutral">Match #{matchId}</SemanticBadge> : null}
              {groupId ? <SemanticBadge tone="neutral">Group #{groupId}</SemanticBadge> : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted-foreground">
                The future engine will remain local-first and browser-first when
                viable. Until then, this panel exposes the exact states and
                review surfaces without faking SQL.
              </p>
              <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
                {assistant.isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Play />
                )}
                Generate SQL
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>SQL preview</CardTitle>
              <CardDescription>
                Generated SQL must stay inspectable instead of hidden behind chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 font-mono text-xs leading-6 text-muted-foreground">
                {assistant.response?.generatedSql ??
                  "Generated SQL will appear here once the real Gemma 4 adapter is connected."}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <CardTitle>Model and execution status</CardTitle>
              <CardDescription>
                Complete lifecycle states are already modeled for future local execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Primary model</span>
                <span className="font-medium text-foreground">Gemma 4</span>
              </div>
              <div className="flex items-center gap-2">
                <SemanticBadge
                  tone={assistant.status ? statusToneMap[assistant.status.status] : "neutral"}
                >
                  {assistant.status?.status ?? "loading"}
                </SemanticBadge>
                <span className="text-muted-foreground">
                  {assistant.errorMessage ??
                    assistant.status?.summary ??
                    "Loading model metadata"}
                </span>
              </div>
              {assistant.response?.notices.length ? (
                <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
                  {assistant.response.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Result surface</CardTitle>
          <CardDescription>
            Query results will land in the same workspace, not in a detached AI thread.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {assistant.response?.resultRows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {assistant.response.resultColumns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistant.response.resultRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {assistant.response?.resultColumns.map((column) => (
                      <TableCell key={column}>{String(row[column] ?? "—")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No result set yet. The panel is intentionally live-ready but model-empty.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
