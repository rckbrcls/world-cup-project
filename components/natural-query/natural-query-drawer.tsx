"use client"

import * as React from "react"
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  LoaderCircle,
  Play,
  RefreshCcw,
  SendHorizonal,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react"

import {
  BadgeSkeleton,
  CardListSkeleton,
  PanelEmptyState,
  PanelErrorState,
  SemanticBadge,
  TableSkeleton,
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
import { CosmicButton } from "@/components/ui/cosmic-button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
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
import type {
  SqlAssistantContext,
  SqlAssistantExecutionResultEntry,
  SqlAssistantSqlProposalEntry,
  SqlAssistantSystemStatusEntry,
  SqlAssistantThreadEntry,
} from "@/lib/sql-assistant/types"
import { cn } from "@/lib/utils"

type NaturalQueryDrawerProps = SqlAssistantContext

const providerStatusToneMap = {
  ready: "success",
  unavailable: "destructive",
} as const

const providerStatusLabelMap = {
  ready: "Ready",
  unavailable: "Unavailable",
} as const

const proposalStateToneMap = {
  "pending-approval": "warning",
  dismissed: "neutral",
  executing: "qualified",
  executed: "success",
  failed: "destructive",
  canceled: "warning",
} as const

const proposalStateLabelMap = {
  "pending-approval": "Awaiting approval",
  dismissed: "Dismissed",
  executing: "Running",
  executed: "Executed",
  failed: "Blocked",
  canceled: "Canceled",
} as const

function buildSelectionChips(context: SqlAssistantContext) {
  return [
    `Section ${context.section}`,
    `Edition ${context.editionYear ?? "all"}`,
    context.teamId ? `Team #${context.teamId}` : null,
    context.matchId ? `Match #${context.matchId}` : null,
    context.groupId ? `Group #${context.groupId}` : null,
  ].filter((value): value is string => Boolean(value))
}

function formatProposalDescription(entry: SqlAssistantSqlProposalEntry) {
  switch (entry.proposalState) {
    case "pending-approval":
      return "Review the SQL, then decide whether to run it through the controlled backend path."
    case "dismissed":
      return "This proposal was dismissed and never reached execution."
    case "executing":
      return "The approved SQL is currently running through the controlled backend path."
    case "executed":
      return "This proposal has already been executed."
    case "failed":
      return "This proposal is blocked until the operator reviews the validation feedback."
    case "canceled":
      return "Execution was canceled before the proposal could complete."
  }
}

function StatusEntry({ entry }: { entry: SqlAssistantSystemStatusEntry }) {
  return (
    <Alert
      variant={entry.tone === "destructive" ? "destructive" : "default"}
      className="border-border/80 bg-background"
    >
      {entry.tone === "destructive" ? <ShieldAlert /> : <AlertTriangle />}
      <AlertTitle>{entry.title}</AlertTitle>
      <AlertDescription>{entry.detail}</AlertDescription>
    </Alert>
  )
}

function ProposalEntry({
  entry,
  isBusy,
  onApprove,
  onDismiss,
}: {
  entry: SqlAssistantSqlProposalEntry
  isBusy: boolean
  onApprove: (proposalId: string) => void
  onDismiss: (proposalId: string) => void
}) {
  const canRun =
    entry.proposalState === "pending-approval" && entry.draft.isExecutable && !isBusy
  const canDismiss = entry.proposalState === "pending-approval" && !isBusy

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none">
      <CardHeader className="border-b border-primary/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">SQL proposal</CardTitle>
            <CardDescription>{formatProposalDescription(entry)}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SemanticBadge tone={proposalStateToneMap[entry.proposalState]}>
              {proposalStateLabelMap[entry.proposalState]}
            </SemanticBadge>
            {entry.draft.confidence != null ? (
              <SemanticBadge tone="neutral">
                Confidence {(entry.draft.confidence * 100).toFixed(0)}%
              </SemanticBadge>
            ) : null}
            {entry.draft.isExecutable ? (
              <SemanticBadge tone="success">Read-only validated</SemanticBadge>
            ) : (
              <SemanticBadge tone="warning">Review required</SemanticBadge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-lg border border-border/70 bg-background p-4">
          <pre className="max-h-64 overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap text-foreground">
            {entry.draft.previewSql ?? "No SQL preview available."}
          </pre>
        </div>

        {entry.draft.clarification ? (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Clarification required</AlertTitle>
            <AlertDescription>{entry.draft.clarification}</AlertDescription>
          </Alert>
        ) : null}

        {entry.draft.validationIssues.length ? (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Execution blocked by validation</AlertTitle>
            <AlertDescription>{entry.draft.validationIssues.join(" ")}</AlertDescription>
          </Alert>
        ) : null}

        {entry.draft.warnings.length ? (
          <Alert>
            <Database />
            <AlertTitle>Review notes</AlertTitle>
            <AlertDescription>
              <ul className="space-y-2">
                {entry.draft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onDismiss(entry.id)}
            disabled={!canDismiss}
          >
            <X />
            Dismiss
          </Button>
          <Button onClick={() => onApprove(entry.id)} disabled={!canRun}>
            {entry.proposalState === "executing" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Play />
            )}
            Run query
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ExecutionEntry({ entry }: { entry: SqlAssistantExecutionResultEntry }) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Query result</CardTitle>
            <CardDescription>
              The approved SQL was executed through the controlled backend flow.
            </CardDescription>
          </div>
          {entry.result ? (
            <div className="flex flex-wrap gap-2">
              <SemanticBadge tone={entry.state === "empty" ? "warning" : "success"}>
                {entry.result.rowCount} rows
              </SemanticBadge>
              {entry.result.truncated ? (
                <SemanticBadge tone="warning">Truncated</SemanticBadge>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <pre className="max-h-32 overflow-auto font-mono text-xs leading-6 whitespace-pre-wrap text-foreground">
            {entry.sql}
          </pre>
        </div>

        {entry.state === "executing" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <CardListSkeleton cards={1} />
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <TableSkeleton rows={4} columns={4} />
            </div>
          </div>
        ) : null}

        {entry.state === "canceled" ? (
          <PanelErrorState
            title="Execution canceled"
            description={entry.errorMessage ?? "The query was canceled before completion."}
          />
        ) : null}

        {entry.state === "error" ? (
          <PanelErrorState
            title="Execution failed"
            description={
              entry.errorMessage ?? "The backend rejected the approved SQL execution."
            }
          />
        ) : null}

        {entry.state === "empty" ? (
          <PanelEmptyState
            title="Query returned no rows"
            description="The SQL executed successfully, but the current request produced an empty result set."
          />
        ) : null}

        {entry.result && entry.result.notices.length ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Execution notices</AlertTitle>
            <AlertDescription>
              <ul className="space-y-2">
                {entry.result.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {entry.result && entry.state !== "empty" && entry.state !== "error" ? (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  {entry.result.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.result.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {entry.result!.columns.map((column) => (
                      <TableCell key={column}>{String(row[column] ?? "—")}</TableCell>
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

function ConversationEntry({
  entry,
  isBusy,
  onApprove,
  onDismiss,
}: {
  entry: SqlAssistantThreadEntry
  isBusy: boolean
  onApprove: (proposalId: string) => void
  onDismiss: (proposalId: string) => void
}) {
  if (entry.kind === "user-message") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
          {entry.text}
        </div>
      </div>
    )
  }

  if (entry.kind === "assistant-message") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-card px-4 py-3 text-sm text-foreground">
          {entry.text}
        </div>
      </div>
    )
  }

  if (entry.kind === "system-status") {
    return <StatusEntry entry={entry} />
  }

  if (entry.kind === "sql-proposal-card") {
    return (
      <ProposalEntry
        entry={entry}
        isBusy={isBusy}
        onApprove={onApprove}
        onDismiss={onDismiss}
      />
    )
  }

  return <ExecutionEntry entry={entry} />
}

function AssistantThinkingEntry() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-card px-4 py-4">
        <CardListSkeleton cards={1} />
      </div>
    </div>
  )
}

function NaturalQueryIntroSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-muted/20 shadow-none">
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-none">
        <CardContent className="space-y-3 pt-4">
          <CardListSkeleton cards={3} />
        </CardContent>
      </Card>
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
  const selectionChips = React.useMemo(() => buildSelectionChips(context), [context])
  const isCheckingProvider =
    assistant.activeOperation === "refresh" && assistant.provider === null
  const providerTone = isCheckingProvider
    ? "neutral"
    : providerStatusToneMap[assistant.providerStatus]
  const providerLabel = isCheckingProvider
    ? "Checking"
    : providerStatusLabelMap[assistant.providerStatus]

  React.useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: assistant.thread.length > 1 ? "smooth" : "auto",
      block: "end",
    })
  }, [assistant.thread.length])

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
    <>
      <div className="pointer-events-none fixed right-5 bottom-5 z-30 sm:right-6 sm:bottom-6">
        <div className="pointer-events-auto">
          <CosmicButton
            as="button"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open query assistant"
            className="shadow-none [&>span.relative.z-10]:px-3.5 [&>span.relative.z-10]:py-3 [&>span.relative.z-10]:gap-0"
          >
            <Sparkles className="size-4" />
          </CosmicButton>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent className="h-dvh w-[min(100vw,40rem)] max-w-none border-l border-border bg-background p-0 sm:w-[36rem] lg:w-[40rem]">
          <DrawerHeader className="gap-4 border-b border-border/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DrawerTitle className="flex items-center gap-2">
                  <Bot className="size-4" />
                  Natural Query Assistant
                </DrawerTitle>
                <DrawerDescription>
                  Ask for information from the World Cup database. The assistant plans SQL,
                  waits for approval, runs the query, and summarizes the observed result.
                </DrawerDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => assistant.clearThread()}
                  disabled={assistant.thread.length === 0 && !assistant.isBusy}
                >
                  <Trash2 />
                  New session
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X />
                  <span className="sr-only">Close assistant drawer</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isCheckingProvider ? (
                <>
                  <BadgeSkeleton className="w-24" />
                  <BadgeSkeleton className="w-40" />
                </>
              ) : (
                <>
                  <SemanticBadge tone={providerTone}>
                    {providerLabel}
                  </SemanticBadge>
                  <SemanticBadge tone="neutral">
                    Model {assistant.provider?.model ?? "unavailable"}
                  </SemanticBadge>
                </>
              )}
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
                <Button variant="outline" size="sm" onClick={assistant.cancelOperation}>
                  <Square />
                  Cancel
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {selectionChips.map((chip) => (
                <SemanticBadge key={chip} tone="neutral">
                  {chip}
                </SemanticBadge>
              ))}
            </div>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1 px-4 py-4">
              <div className="space-y-4 pb-4">
                {assistant.failure ? (
                  <Alert variant="destructive">
                    <ShieldAlert />
                    <AlertTitle>Operational issue</AlertTitle>
                    <AlertDescription>
                      {assistant.failure.message}
                      {assistant.failure.detail ? ` ${assistant.failure.detail}` : ""}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {assistant.thread.length === 0 ? (
                  <div className="space-y-4">
                    {isCheckingProvider ? (
                      <NaturalQueryIntroSkeleton />
                    ) : (
                      <>
                        <PanelEmptyState
                          title="No query session yet"
                          description="Start with a database question such as asking for knockout teams, top scorers, match events, or group standings."
                        />
                        <Card className="border-border/80 bg-muted/20 shadow-none">
                          <CardContent className="space-y-3 pt-4 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">How this works</p>
                            <p>
                              The assistant only exists to retrieve information from the
                              database. It will plan one SQL query, wait for approval, run the
                              approved query, and then summarize the actual result.
                            </p>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {assistant.thread.map((entry) => (
                      <ConversationEntry
                        key={entry.id}
                        entry={entry}
                        isBusy={assistant.isBusy}
                        onApprove={(proposalId) => {
                          void assistant.approveProposal(proposalId)
                        }}
                        onDismiss={assistant.dismissProposal}
                      />
                    ))}
                    {assistant.activeOperation === "generate" ? (
                      <AssistantThinkingEntry />
                    ) : null}
                  </>
                )}
                <div ref={endRef} />
              </div>
            </ScrollArea>
          </div>

          <DrawerFooter className="border-t border-border/80 bg-background px-4 py-4">
            <div className="space-y-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Example: How many teams are in the knockout stage for the selected edition?"
                className="min-h-28 resize-none bg-background"
                disabled={assistant.isBusy}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Press Enter to send. Use Shift+Enter for a new line.
                </p>
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={assistant.isBusy || prompt.trim().length === 0}
                  className={cn(
                    assistant.generationState === "generating" ||
                      assistant.executionState === "running" ||
                      assistant.executionState === "validating"
                      ? "min-w-32"
                      : undefined
                  )}
                >
                  {assistant.generationState === "generating" ||
                  assistant.executionState === "running" ||
                  assistant.executionState === "validating" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <SendHorizonal />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
