"use client"

import * as React from "react"
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  CheckCircle2,
  Database,
  LoaderCircle,
  Play,
  RefreshCcw,
  ShieldAlert,
  Square,
  Trash2,
  X,
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
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { isAutoRepairUserMessage } from "@/lib/sql-assistant/types"
import type {
  SqlAssistantContext,
  SqlAssistantUiMessage,
  SqlExecutionRecord,
  SqlProposalRecord,
} from "@/lib/sql-assistant/types"

type NaturalQueryDrawerProps = SqlAssistantContext

function extractMessageText(message: SqlAssistantUiMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
}

function getProposalStateBadge(record: SqlProposalRecord) {
  switch (record.proposalState) {
    case "blocked-precheck":
      return { tone: "destructive" as const, label: "Blocked" }
    case "pending-approval":
      return { tone: "warning" as const, label: "Awaiting approval" }
    case "dismissed":
      return { tone: "neutral" as const, label: "Dismissed" }
    case "executing":
      return { tone: "qualified" as const, label: "Running" }
    case "executed":
      return { tone: "success" as const, label: "Executed" }
    case "execution-failed":
      return {
        tone: "destructive" as const,
        label:
          record.execution?.errorReason === "database-validator" ||
          record.execution?.errorReason === "database-preflight"
            ? "Rejected"
            : "Failed",
      }
    case "canceled":
      return { tone: "warning" as const, label: "Canceled" }
  }
}

function getProposalValidationBadge(record: SqlProposalRecord) {
  if (record.draft.validationReason === "database-validator") {
    return {
      tone: "destructive" as const,
      label: "Database validation failed",
    }
  }

  if (record.draft.validationReason === "database-preflight") {
    return {
      tone: "destructive" as const,
      label: "Database preflight failed",
    }
  }

  if (record.proposalState === "blocked-precheck") {
    return { tone: "destructive" as const, label: "Precheck blocked" }
  }

  if (
    record.proposalState === "execution-failed" &&
    (record.execution?.errorReason === "database-validator" ||
      record.execution?.errorReason === "database-preflight")
  ) {
    return {
      tone: "destructive" as const,
      label:
        record.execution?.errorReason === "database-preflight"
          ? "Database preflight failed"
          : "Database validation failed",
    }
  }

  if (record.proposalState === "execution-failed") {
    return { tone: "destructive" as const, label: "Execution failed" }
  }

  if (record.draft.isExecutable) {
    return { tone: "success" as const, label: "Ready for approval" }
  }

  return { tone: "warning" as const, label: "Review required" }
}

function formatProposalDescription(record: SqlProposalRecord) {
  const repairedPrefix =
    record.origin === "repair"
      ? "This repaired proposal supersedes an earlier SQL draft. "
      : ""

  switch (record.proposalState) {
    case "blocked-precheck":
      return `${repairedPrefix}This proposal failed validation and cannot be executed as-is.`
    case "pending-approval":
      return `${repairedPrefix}Review the SQL, then decide whether to run it through the controlled backend path.`
    case "dismissed":
      return `${repairedPrefix}This proposal was dismissed and never reached execution.`
    case "executing":
      return `${repairedPrefix}The approved SQL is currently running through the controlled backend path.`
    case "executed":
      return `${repairedPrefix}This proposal has already been executed.`
    case "execution-failed":
      if (
        record.execution?.errorReason === "database-validator" ||
        record.execution?.errorReason === "database-preflight"
      ) {
        return `${repairedPrefix}PostgreSQL rejected this SQL before execution through the controlled backend path.`
      }

      return `${repairedPrefix}The query compiled, but it failed while running through the controlled backend path.`
    case "canceled":
      return `${repairedPrefix}Execution was canceled before the proposal could complete.`
  }
}

function getExecutionErrorPresentation(execution: SqlExecutionRecord) {
  if (execution.errorReason === "database-validator") {
    return {
      title: "Database validation failed",
      description:
        execution.errorMessage ??
        "PostgreSQL rejected the local-prechecked SQL during the controlled validation step.",
    }
  }

  if (execution.errorReason === "database-preflight") {
    return {
      title: "Execution blocked before run",
      description:
        execution.errorMessage ??
        "PostgreSQL rejected the approved SQL during controlled preflight before the query could run.",
    }
  }

  return {
    title: "Execution failed",
    description:
      execution.errorMessage ??
      "The approved SQL compiled, but failed while running through the controlled backend flow.",
  }
}

function ExecutionResult({ execution }: { execution: SqlExecutionRecord }) {
  const executionErrorPresentation = getExecutionErrorPresentation(execution)

  return (
    <Card className="min-w-0 w-full max-w-full border-primary/12 shadow-none">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Query result</CardTitle>
            <CardDescription>
              The approved SQL was submitted through the controlled backend flow.
            </CardDescription>
          </div>
          {execution.result ? (
            <div className="flex flex-wrap gap-2">
              <SemanticBadge
                tone={execution.state === "empty" ? "warning" : "success"}
              >
                {execution.result.rowCount} rows
              </SemanticBadge>
              {execution.result.truncated ? (
                <SemanticBadge tone="warning">Truncated</SemanticBadge>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 w-full max-w-full space-y-4 pt-4">
        <div className="min-w-0 rounded-lg border border-primary/12 bg-primary/5 p-4">
          <pre className="max-h-32 max-w-full overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap break-words text-foreground">
            {execution.sql}
          </pre>
        </div>

        {execution.state === "executing" ? (
          <div className="rounded-lg border border-primary/12 bg-primary/5 px-4 py-10 text-center text-sm text-muted-foreground">
            The local-prechecked SQL is running through the controlled backend flow.
          </div>
        ) : null}

        {execution.state === "canceled" ? (
          <PanelErrorState
            title="Execution canceled"
            description={
              execution.errorMessage ??
              "The query was canceled before completion."
            }
          />
        ) : null}

        {execution.state === "error" ? (
          <PanelErrorState
            title={executionErrorPresentation.title}
            description={executionErrorPresentation.description}
          />
        ) : null}

        {execution.state === "empty" ? (
          <PanelEmptyState
            title="Query returned no rows"
            description="The SQL executed successfully, but the current request produced an empty result set."
          />
        ) : null}

        {execution.result && execution.result.notices.length ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Execution notices</AlertTitle>
            <AlertDescription>
              <ul className="space-y-2">
                {execution.result.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {execution.result &&
        execution.state !== "empty" &&
        execution.state !== "error" ? (
          <div className="min-w-0 w-full max-w-full overflow-x-auto rounded-lg border border-border/70">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  {execution.result.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {execution.result.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {execution.result.columns.map((column) => (
                      <TableCell key={column}>
                        {String(row[column] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ProposalCard({
  record,
  isBusy,
  onApprove,
  onDismiss,
}: {
  record: SqlProposalRecord
  isBusy: boolean
  onApprove: (messageId: string) => void
  onDismiss: (messageId: string) => void
}) {
  const proposalStateBadge = getProposalStateBadge(record)
  const proposalValidationBadge = getProposalValidationBadge(record)
  const canRun =
    record.proposalState === "pending-approval" &&
    Boolean(record.draft.normalizedSql) &&
    !isBusy
  const canDismiss = record.proposalState === "pending-approval" && !isBusy

  return (
    <Card className="min-w-0 w-full max-w-full border-primary/20 bg-primary/5 shadow-none">
      <CardHeader className="border-b border-primary/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">SQL proposal</CardTitle>
            <CardDescription>
              {formatProposalDescription(record)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SemanticBadge tone={proposalStateBadge.tone}>
              {proposalStateBadge.label}
            </SemanticBadge>
            {record.origin === "repair" ? (
              <SemanticBadge tone="warning">Repair</SemanticBadge>
            ) : null}
            {record.draft.confidence != null ? (
              <SemanticBadge tone="neutral">
                Confidence {(record.draft.confidence * 100).toFixed(0)}%
              </SemanticBadge>
            ) : null}
            <SemanticBadge tone={proposalValidationBadge.tone}>
              {proposalValidationBadge.label}
            </SemanticBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 w-full max-w-full space-y-4 pt-4">
        <div className="min-w-0 rounded-lg border border-primary/12 bg-background p-4">
          <pre className="max-h-64 max-w-full overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap break-words text-foreground">
            {record.draft.previewSql ?? "No SQL preview available."}
          </pre>
        </div>

        {record.draft.clarification ? (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Clarification required</AlertTitle>
            <AlertDescription>{record.draft.clarification}</AlertDescription>
          </Alert>
        ) : null}

        {record.draft.validationIssues.length ? (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>
              {record.draft.validationReason === "database-validator"
                ? "Database validation blocked approval"
                : record.draft.validationReason === "database-preflight"
                  ? "Database preflight blocked approval"
                  : "Local precheck blocked approval"}
            </AlertTitle>
            <AlertDescription>
              {record.draft.validationIssues.join(" ")}
            </AlertDescription>
          </Alert>
        ) : null}

        {record.draft.warnings.length ? (
          <Alert>
            <Database />
            <AlertTitle>Review notes</AlertTitle>
            <AlertDescription>
              <ul className="space-y-2">
                {record.draft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onDismiss(record.messageId)}
            disabled={!canDismiss}
          >
            <X />
            Dismiss
          </Button>
          <Button
            onClick={() => onApprove(record.messageId)}
            disabled={!canRun}
          >
            {record.proposalState === "executing" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Play />
            )}
            Run query
          </Button>
        </div>

        {record.execution ? (
          <ExecutionResult execution={record.execution} />
        ) : null}
      </CardContent>
    </Card>
  )
}

function PlanningPlaceholder({ detail }: { detail: string }) {
  return (
    <Card className="border-primary/12 bg-primary/4 shadow-none">
      <CardContent className="flex items-center gap-3 py-4">
        <LoaderCircle className="size-4 animate-spin text-primary" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">Planning SQL proposal</p>
          <p className="text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ConversationEntry({
  message,
  proposalRecord,
  isBusy,
  onApprove,
  onDismiss,
}: {
  message: SqlAssistantUiMessage
  proposalRecord: SqlProposalRecord | null
  isBusy: boolean
  onApprove: (messageId: string) => void
  onDismiss: (messageId: string) => void
}) {
  const text = extractMessageText(message)

  if (message.role === "user") {
    if (isAutoRepairUserMessage(text)) {
      return null
    }

    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    )
  }

  if (!text && !proposalRecord) {
    return null
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-4">
      {text ? (
        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-card px-4 py-3 text-sm text-foreground">
            {text}
          </div>
        </div>
      ) : null}
      {proposalRecord ? (
        <ProposalCard
          record={proposalRecord}
          isBusy={isBusy}
          onApprove={onApprove}
          onDismiss={onDismiss}
        />
      ) : null}
    </div>
  )
}

export function NaturalQueryDrawer(props: NaturalQueryDrawerProps) {
  const assistant = useSqlAssistant()
  const [open, setOpen] = React.useState(false)
  const [prompt, setPrompt] = React.useState("")
  const endRef = React.useRef<HTMLDivElement | null>(null)
  const context = React.useMemo<SqlAssistantContext>(
    () => ({
      section: props.section,
      editionId: props.editionId,
      editionYear: props.editionYear,
      teamId: props.teamId,
      matchId: props.matchId,
      groupId: props.groupId,
    }),
    [
      props.editionId,
      props.editionYear,
      props.groupId,
      props.matchId,
      props.section,
      props.teamId,
    ]
  )
  const hasConversation = assistant.messages.length > 0

  React.useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: hasConversation ? "smooth" : "auto",
      block: "end",
    })
  }, [
    assistant.messages.length,
    assistant.activeOperation,
    assistant.executionState,
    hasConversation,
  ])

  const handleSubmit = React.useCallback(async () => {
    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      return
    }

    setPrompt("")
    await assistant.sendPrompt(nextPrompt, context)
  }, [assistant, context, prompt])

  const handlePromptKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <div className="pointer-events-none fixed right-5 bottom-5 z-30 sm:right-6 sm:bottom-6">
        <div className="pointer-events-auto">
          <PopoverTrigger asChild>
            <Button
              type="button"
              aria-label="Open query assistant"
              className="h-12 w-12 rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
            >
              <Bot className="size-4" />
            </Button>
          </PopoverTrigger>
        </div>
      </div>

      <PopoverContent
        aria-label="Query assistant"
        className="bg-background p-0 sm:max-w-[44rem] lg:max-w-[54rem] xl:max-w-[62rem]"
      >
        <div className="border-b border-primary/12 bg-muted/20 px-4 py-2.5">
          <div className="relative flex min-h-9 items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void assistant.refreshEnvironment()}
                disabled={assistant.isBusy}
              >
                <RefreshCcw />
                Refresh
              </Button>
              {assistant.isBusy ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={assistant.cancelOperation}
                >
                  <Square />
                  Cancel
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => assistant.clearThread()}
                disabled={!hasConversation && !assistant.isBusy}
              >
                <Trash2 />
                New session
              </Button>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 font-heading text-base font-medium text-foreground">
                <Bot className="size-4" />
                <span>Natural Query</span>
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X />
                <span className="sr-only">Close assistant panel</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            <div className="min-w-0 w-full max-w-full space-y-4 pb-44">
              {assistant.failure ? (
                <Alert variant="destructive">
                  <ShieldAlert />
                  <AlertTitle>Operational issue</AlertTitle>
                  <AlertDescription>
                    {assistant.failure.message}
                    {assistant.failure.detail
                      ? ` ${assistant.failure.detail}`
                      : ""}
                  </AlertDescription>
                </Alert>
              ) : null}

              {!hasConversation ? (
                <div className="space-y-4">
                  <PanelEmptyState
                    title="No query session yet"
                    description="Start with a database question such as asking for knockout teams, top scorers, match events, or group standings."
                  />
                  <Card className="border-primary/12 bg-primary/5 shadow-none">
                    <CardContent className="space-y-3 pt-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        How this works
                      </p>
                      <p>
                        The assistant only exists to retrieve information from
                        the database. It will plan one SQL query, wait for
                        approval, and run the approved query through the
                        existing FastAPI backend.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                assistant.messages.map((message) => (
                  <ConversationEntry
                    key={message.id}
                    message={message}
                    proposalRecord={assistant.proposalRecords[message.id] ?? null}
                    isBusy={assistant.isBusy}
                    onApprove={(messageId) => {
                      void assistant.approveProposal(messageId)
                    }}
                    onDismiss={assistant.dismissProposal}
                  />
                ))
              )}

              {assistant.activeOperation === "generate" ? (
                <PlanningPlaceholder detail={assistant.statusDetail} />
              ) : null}

              <div ref={endRef} />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10">
            <div className="pointer-events-auto relative">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Example: How many teams are in the knockout stage for the selected edition?"
                className="min-h-32 resize-none rounded-[1.8rem] border-border/70 bg-background/68 px-5 py-5 pr-18 text-sm shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-colors focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
                disabled={assistant.isBusy}
              />
              <Button
                onClick={() => void handleSubmit()}
                disabled={assistant.isBusy || prompt.trim().length === 0}
                size="icon"
                className="absolute right-4 bottom-4 size-11 rounded-full shadow-none"
              >
                {assistant.generationState === "generating" ||
                assistant.executionState === "running" ||
                assistant.executionState === "validating" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ArrowUp />
                )}
                <span className="sr-only">Send prompt</span>
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
