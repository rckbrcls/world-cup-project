"use client"

import * as React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  LoaderCircle,
  Play,
  RefreshCcw,
  ShieldAlert,
  Square,
} from "lucide-react"

import {
  PanelEmptyState,
  PanelErrorState,
  SemanticBadge,
} from "@/components/home/panel-states"
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

type NaturalQueryPanelProps = {
  section: HomeSectionId
  editionId: number | null
  editionYear: number | null
  teamId: number | null
  matchId: number | null
  groupId: number | null
}

const providerStatusToneMap = {
  ready: "success",
  unavailable: "destructive",
} as const

const providerStatusLabelMap = {
  ready: "Ready",
  unavailable: "Unavailable",
} as const

function buildSelectionChips(props: NaturalQueryPanelProps) {
  return [
    `Section ${props.section}`,
    `Edition ${props.editionYear ?? "all"}`,
    props.teamId ? `Team #${props.teamId}` : null,
    props.matchId ? `Match #${props.matchId}` : null,
    props.groupId ? `Group #${props.groupId}` : null,
  ].filter((value): value is string => Boolean(value))
}

export function NaturalQueryPanel(props: NaturalQueryPanelProps) {
  const assistant = useSqlAssistant()
  const [prompt, setPrompt] = React.useState("")
  const selectionChips = buildSelectionChips(props)
  const draft = assistant.draft
  const isCheckingProvider =
    assistant.activeOperation === "refresh" && assistant.provider === null
  const providerTone = isCheckingProvider
    ? "neutral"
    : providerStatusToneMap[assistant.providerStatus]
  const providerLabel = isCheckingProvider
    ? "Checking"
    : providerStatusLabelMap[assistant.providerStatus]

  const handleGenerate = React.useCallback(async () => {
    await assistant.generateSql(prompt, {
      section: props.section,
      editionId: props.editionId,
      editionYear: props.editionYear,
      teamId: props.teamId,
      matchId: props.matchId,
      groupId: props.groupId,
    })
  }, [assistant, prompt, props])

  const statusActions = (
    <>
      <SemanticBadge tone={providerTone}>
        {assistant.statusSummary}
      </SemanticBadge>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void assistant.refreshEnvironment()}
        disabled={assistant.isBusy}
      >
        <RefreshCcw />
        Refresh
      </Button>
    </>
  )

  const generationStatusLabel =
    assistant.generationState === "generating"
      ? "Generating SQL"
      : assistant.executionState === "validating"
        ? "Validating SQL"
        : assistant.executionState === "running"
          ? "Executing query"
          : assistant.generationState === "canceled" ||
              assistant.executionState === "canceled"
            ? "Canceled"
            : "Idle"

  return (
    <div className="space-y-6">
      <div className="flex justify-end border-b border-border/80 pb-4">
        <div className="flex flex-wrap items-center gap-2">{statusActions}</div>
      </div>

      {assistant.failure ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Controlled query flow reported a failure</AlertTitle>
          <AlertDescription>
            {assistant.failure.message}
            {assistant.failure.detail ? ` ${assistant.failure.detail}` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardContent className="space-y-4 pt-4">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: Show the semifinal matches for the selected edition with stadium, host city, score, and winner."
                className="min-h-40 resize-none bg-background"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {selectionChips.map((chip) => (
                  <SemanticBadge key={chip} tone="neutral">
                    {chip}
                  </SemanticBadge>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    SQL generation workflow
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {generationStatusLabel}. The prompt remains contextual, the
                    generated SQL stays visible for review, and execution remains a
                    separate backend step.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assistant.activeOperation === "generate" ? (
                    <Button variant="outline" onClick={assistant.cancelOperation}>
                      <Square />
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => void handleGenerate()}
                    disabled={!assistant.canGenerate || prompt.trim().length === 0}
                  >
                    {assistant.generationState === "generating" ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Play />
                    )}
                    Generate SQL
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>SQL preview</CardTitle>
                  <CardDescription>
                    Generated SQL is always inspectable and normalized before controlled
                    execution.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft?.confidence != null ? (
                    <SemanticBadge tone="neutral">
                      Confidence {(draft.confidence * 100).toFixed(0)}%
                    </SemanticBadge>
                  ) : null}
                  {draft?.isExecutable ? (
                    <SemanticBadge tone="success">Read-only validated</SemanticBadge>
                  ) : draft ? (
                    <SemanticBadge tone="warning">Review required</SemanticBadge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <pre className="max-h-72 overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap text-foreground">
                  {draft?.previewSql ??
                    "No SQL draft yet. Check the local Ollama status, submit a natural-language request, and the generated SQL will stay visible here."}
                </pre>
              </div>

              {draft?.clarification ? (
                <Alert>
                  <AlertTriangle />
                  <AlertTitle>Clarification required</AlertTitle>
                  <AlertDescription>{draft.clarification}</AlertDescription>
                </Alert>
              ) : null}

              {draft?.validationIssues.length ? (
                <Alert variant="destructive">
                  <ShieldAlert />
                  <AlertTitle>Execution blocked by validation</AlertTitle>
                  <AlertDescription>{draft.validationIssues.join(" ")}</AlertDescription>
                </Alert>
              ) : null}

              {draft?.warnings.length ? (
                <Alert>
                  <Database />
                  <AlertTitle>Review notes</AlertTitle>
                  <AlertDescription>
                    <ul className="space-y-2">
                      {draft.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                {assistant.activeOperation === "execute" ? (
                  <Button variant="outline" onClick={assistant.cancelOperation}>
                    <Square />
                    Cancel
                  </Button>
                ) : null}
                <Button
                  variant="default"
                  onClick={() => void assistant.executeSql()}
                  disabled={!assistant.canExecute}
                >
                  {assistant.executionState === "running" ||
                  assistant.executionState === "validating" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Database />
                  )}
                  Execute query
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Result surface</CardTitle>
                  <CardDescription>
                    Backend execution remains separate from generation, and the result
                    lands in the same operational workspace.
                  </CardDescription>
                </div>
                {assistant.execution ? (
                  <div className="flex flex-wrap gap-2">
                    <SemanticBadge
                      tone={
                        assistant.executionState === "empty" ? "warning" : "success"
                      }
                    >
                      {assistant.execution.rowCount} rows
                    </SemanticBadge>
                    {assistant.execution.truncated ? (
                      <SemanticBadge tone="warning">Truncated</SemanticBadge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {assistant.executionState === "running" ||
              assistant.executionState === "validating" ? (
                <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  {assistant.executionState === "validating"
                    ? "The generated SQL is being checked locally before controlled execution."
                    : "The validated SQL is running against the existing FastAPI backend."}
                </div>
              ) : assistant.executionState === "empty" && assistant.execution ? (
                <PanelEmptyState
                  title="Query returned no rows"
                  description="The SQL executed successfully, but the current selection and filters produced an empty result set."
                />
              ) : assistant.execution ? (
                <>
                  {assistant.execution.notices.length ? (
                    <Alert>
                      <CheckCircle2 />
                      <AlertTitle>Execution notices</AlertTitle>
                      <AlertDescription>
                        <ul className="space-y-2">
                          {assistant.execution.notices.map((notice) => (
                            <li key={notice}>{notice}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {assistant.execution.columns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assistant.execution.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {assistant.execution.columns.map((column) => (
                            <TableCell key={column}>
                              {String(row[column] ?? "—")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : assistant.executionState === "error" ? (
                <PanelErrorState
                  title="Execution failed"
                  description={
                    assistant.failure?.message ??
                    "The backend rejected the query execution."
                  }
                  onRetry={
                    assistant.canExecute
                      ? () => {
                          void assistant.executeSql()
                        }
                      : undefined
                  }
                />
              ) : (
                <PanelEmptyState
                  title="No execution yet"
                  description="Generate a validated SQL draft first, then run it through the controlled backend path to inspect the result table here."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
