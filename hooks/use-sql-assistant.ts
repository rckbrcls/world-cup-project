"use client"

import * as React from "react"

import {
  buildSqlPlanningPrompt,
  buildSqlResultSummaryPrompt,
  formatModelPrompt,
} from "@/lib/sql-assistant/prompt-builder"
import {
  parseSqlDraftFromModelResponse,
  stripCodeFences,
} from "@/lib/sql-assistant/sql-normalizer"
import {
  executeNaturalQuery,
  generateNaturalQuery,
  getNaturalQueryStatus,
} from "@/lib/services/sql-assistant/natural-query-service"
import type {
  NaturalQueryProviderState,
  SqlAssistantContext,
  SqlAssistantExecutionResultEntry,
  SqlAssistantFailure,
  SqlAssistantMessageEntry,
  SqlAssistantSqlProposalEntry,
  SqlAssistantSystemStatusEntry,
  SqlAssistantThreadEntry,
  SqlDraft,
  SqlExecutionCardState,
  SqlExecutionResult,
  SqlExecutionState,
  SqlGenerationState,
  SqlProposalState,
} from "@/lib/sql-assistant/types"

type ActiveOperationKind = "refresh" | "generate" | "execute" | null

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function toFailure(
  scope: SqlAssistantFailure["scope"],
  error: unknown,
  fallbackMessage: string
): SqlAssistantFailure {
  if (error && typeof error === "object") {
    const maybeFailure = error as {
      message?: unknown
      detail?: unknown
      reason?: unknown
    }

    if (typeof maybeFailure.message === "string") {
      return {
        scope,
        reason:
          typeof maybeFailure.reason === "string" ? maybeFailure.reason : undefined,
        message: maybeFailure.message,
        detail:
          typeof maybeFailure.detail === "string" ? maybeFailure.detail : undefined,
        recoverable: true,
      }
    }
  }

  return {
    scope,
    message: fallbackMessage,
    recoverable: true,
  }
}

function getStatusPresentation(options: {
  provider: NaturalQueryProviderState | null
  activeOperation: ActiveOperationKind
}) {
  const { provider, activeOperation } = options

  if (activeOperation === "refresh" && provider === null) {
    return {
      summary: "Checking local Ollama server",
      detail:
        "The workspace is checking the configured Ollama server through the existing backend proxy.",
    }
  }

  if (activeOperation === "generate") {
    return {
      summary: "Planning SQL with local Ollama",
      detail:
        "The assistant is preparing one SQL proposal through the backend proxy and will keep it visible for approval.",
    }
  }

  if (activeOperation === "execute") {
    return {
      summary: "Running approved query",
      detail:
        "The assistant is executing validated SQL through the controlled backend path and then summarizing the observed result.",
    }
  }

  if (provider) {
    return {
      summary: provider.summary,
      detail: provider.detail,
    }
  }

  return {
    summary: "Local Ollama status unavailable",
    detail:
      "The workspace could not confirm the configured Ollama provider state yet.",
  }
}

function createEntryId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createTimestamp() {
  return new Date().toISOString()
}

function createAssistantEntry(text: string): SqlAssistantMessageEntry {
  return {
    id: createEntryId("assistant"),
    kind: "assistant-message",
    text,
    createdAt: createTimestamp(),
  }
}

function createSystemStatusEntry(options: {
  tone: SqlAssistantSystemStatusEntry["tone"]
  title: string
  detail: string
}): SqlAssistantSystemStatusEntry {
  return {
    id: createEntryId("status"),
    kind: "system-status",
    createdAt: createTimestamp(),
    ...options,
  }
}

function createFallbackSummary(result: SqlExecutionResult) {
  if (result.rowCount === 0) {
    return "The query executed successfully, but it returned no rows for the current request."
  }

  const base = `The query executed successfully and returned ${result.rowCount} row${result.rowCount === 1 ? "" : "s"}.`
  const truncated = result.truncated
    ? " The result set was truncated for controlled execution."
    : ""
  const notices =
    result.notices.length > 0 ? ` ${result.notices.join(" ")}` : ""

  return `${base}${truncated}${notices}`.trim()
}

function createProposalEntry(options: {
  userPrompt: string
  context: SqlAssistantContext
  draft: SqlDraft
}): SqlAssistantSqlProposalEntry {
  const { userPrompt, context, draft } = options

  return {
    id: createEntryId("proposal"),
    kind: "sql-proposal-card",
    createdAt: createTimestamp(),
    proposalState: draft.isExecutable ? "pending-approval" : "failed",
    userPrompt,
    context,
    draft,
  }
}

function createExecutionResultEntry(options: {
  proposalId: string
  sql: string
}): SqlAssistantExecutionResultEntry {
  return {
    id: createEntryId("execution"),
    kind: "execution-result-card",
    createdAt: createTimestamp(),
    proposalId: options.proposalId,
    state: "executing",
    sql: options.sql,
    result: null,
    errorMessage: null,
  }
}

function updateProposalState(
  entries: SqlAssistantThreadEntry[],
  proposalId: string,
  proposalState: SqlProposalState
) {
  return entries.map((entry) =>
    entry.kind === "sql-proposal-card" && entry.id === proposalId
      ? {
          ...entry,
          proposalState,
        }
      : entry
  )
}

function updateExecutionEntry(
  entries: SqlAssistantThreadEntry[],
  executionId: string,
  nextState: SqlExecutionCardState,
  result: SqlExecutionResult | null,
  errorMessage: string | null
) {
  return entries.map((entry) =>
    entry.kind === "execution-result-card" && entry.id === executionId
      ? {
          ...entry,
          state: nextState,
          result,
          errorMessage,
        }
      : entry
  )
}

export function useSqlAssistant() {
  const [provider, setProvider] = React.useState<NaturalQueryProviderState | null>(
    null
  )
  const [generationState, setGenerationState] =
    React.useState<SqlGenerationState>("idle")
  const [executionState, setExecutionState] =
    React.useState<SqlExecutionState>("idle")
  const [thread, setThread] = React.useState<SqlAssistantThreadEntry[]>([])
  const [failure, setFailure] = React.useState<SqlAssistantFailure | null>(null)
  const [activeOperation, setActiveOperation] =
    React.useState<ActiveOperationKind>(null)

  const operationRef = React.useRef<{
    token: number
    kind: ActiveOperationKind
    controller: AbortController | null
  }>({
    token: 0,
    kind: null,
    controller: null,
  })

  const beginOperation = React.useCallback(
    (kind: Exclude<ActiveOperationKind, null>) => {
      operationRef.current.controller?.abort()

      const token = operationRef.current.token + 1
      const controller = new AbortController()

      operationRef.current = {
        token,
        kind,
        controller,
      }
      setActiveOperation(kind)

      return {
        token,
        signal: controller.signal,
      }
    },
    []
  )

  const finishOperation = React.useCallback(
    (token: number, kind: ActiveOperationKind) => {
      if (
        operationRef.current.token === token &&
        operationRef.current.kind === kind
      ) {
        operationRef.current = {
          token,
          kind: null,
          controller: null,
        }
        setActiveOperation(null)
      }
    },
    []
  )

  const isOperationCurrent = React.useCallback(
    (token: number, kind: ActiveOperationKind) =>
      operationRef.current.token === token && operationRef.current.kind === kind,
    []
  )

  const refreshEnvironment = React.useCallback(async () => {
    const operation = beginOperation("refresh")

    try {
      const nextProvider = await getNaturalQueryStatus({
        signal: operation.signal,
      })

      if (!isOperationCurrent(operation.token, "refresh")) {
        return
      }

      setProvider(nextProvider)
      setFailure((currentFailure) =>
        currentFailure?.scope === "environment" ? null : currentFailure
      )
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      setProvider(null)
      setFailure(
        toFailure(
          "environment",
          error,
          "The workspace could not reach the configured Ollama provider through the backend proxy."
        )
      )
    } finally {
      finishOperation(operation.token, "refresh")
    }
  }, [beginOperation, finishOperation, isOperationCurrent])

  React.useEffect(() => {
    void refreshEnvironment()
  }, [refreshEnvironment])

  const statusPresentation = getStatusPresentation({
    provider,
    activeOperation,
  })

  const appendThreadEntries = React.useCallback(
    (...entries: SqlAssistantThreadEntry[]) => {
      if (entries.length === 0) {
        return
      }

      setThread((currentThread) => [...currentThread, ...entries])
    },
    []
  )

  const sendPrompt = React.useCallback(
    async (prompt: string, context: SqlAssistantContext) => {
      const normalizedPrompt = prompt.trim()

      if (!normalizedPrompt) {
        setGenerationState("error")
        setFailure({
          scope: "generation",
          message:
            "Enter a natural-language request before asking the assistant to plan a SQL query.",
          recoverable: true,
        })
        return null
      }

      const userEntry: SqlAssistantThreadEntry = {
        id: createEntryId("user"),
        kind: "user-message",
        text: normalizedPrompt,
        createdAt: createTimestamp(),
      }
      appendThreadEntries(userEntry)

      if (provider?.status !== "ready") {
        const providerFailure = {
          scope: "environment" as const,
          message:
            statusPresentation.detail ??
            "The configured Ollama provider is not ready for SQL planning.",
          recoverable: true,
        }

        setGenerationState("error")
        setFailure(providerFailure)
        appendThreadEntries(
          createSystemStatusEntry({
            tone: "destructive",
            title: "Assistant unavailable",
            detail: providerFailure.message,
          })
        )
        return null
      }

      const operation = beginOperation("generate")
      setGenerationState("generating")
      setExecutionState("idle")
      setFailure(null)

      try {
        const promptPack = formatModelPrompt(
          buildSqlPlanningPrompt({
            prompt: normalizedPrompt,
            context,
            modelName: provider.model,
          })
        )
        const response = await generateNaturalQuery(promptPack, {
          signal: operation.signal,
        })

        if (!isOperationCurrent(operation.token, "generate")) {
          return null
        }

        const nextDraft = parseSqlDraftFromModelResponse(response.rawResponse)
        const assistantText =
          nextDraft.assistantMessage ??
          nextDraft.clarification ??
          (nextDraft.previewSql
            ? "I prepared one SQL proposal for review."
            : "I could not derive an executable SQL proposal from this request.")
        const newEntries: SqlAssistantThreadEntry[] = [
          createAssistantEntry(assistantText),
        ]

        if (nextDraft.previewSql) {
          newEntries.push(
            createProposalEntry({
              userPrompt: normalizedPrompt,
              context,
              draft: nextDraft,
            })
          )
        }

        if (nextDraft.validationIssues.length > 0) {
          setFailure({
            scope: "validation",
            message:
              "The SQL proposal is visible, but it failed the local read-only validation checks.",
            detail: nextDraft.validationIssues.join(" "),
            recoverable: true,
          })
        }

        appendThreadEntries(...newEntries)
        setGenerationState("success")
        return nextDraft
      } catch (error) {
        if (isAbortError(error)) {
          if (isOperationCurrent(operation.token, "generate")) {
            setGenerationState("canceled")
            setFailure(null)
            appendThreadEntries(
              createSystemStatusEntry({
                tone: "warning",
                title: "Planning canceled",
                detail: "The assistant stopped before it could finish preparing a SQL proposal.",
              })
            )
          }

          return null
        }

        const nextFailure = toFailure(
          "generation",
          error,
          "The configured Ollama model failed while planning SQL."
        )
        setGenerationState("error")
        setFailure(nextFailure)
        appendThreadEntries(
          createSystemStatusEntry({
            tone: "destructive",
            title: "Planning failed",
            detail: nextFailure.detail
              ? `${nextFailure.message} ${nextFailure.detail}`
              : nextFailure.message,
          })
        )
        return null
      } finally {
        finishOperation(operation.token, "generate")
      }
    },
    [
      appendThreadEntries,
      beginOperation,
      finishOperation,
      isOperationCurrent,
      provider,
      statusPresentation.detail,
    ]
  )

  const dismissProposal = React.useCallback(
    (proposalId: string) => {
      setThread((currentThread) =>
        updateProposalState(currentThread, proposalId, "dismissed")
      )
      appendThreadEntries(
        createAssistantEntry("The SQL proposal was dismissed. No query was executed.")
      )
    },
    [appendThreadEntries]
  )

  const approveProposal = React.useCallback(
    async (proposalId: string) => {
      const proposal = thread.find(
        (entry): entry is SqlAssistantSqlProposalEntry =>
          entry.kind === "sql-proposal-card" && entry.id === proposalId
      )

      if (!proposal || !proposal.draft.normalizedSql) {
        setExecutionState("error")
        setFailure({
          scope: "validation",
          message:
            "Only validated read-only SQL proposals can be executed from the assistant drawer.",
          recoverable: true,
        })
        return null
      }

      if (proposal.proposalState !== "pending-approval") {
        return null
      }

      const executionEntry = createExecutionResultEntry({
        proposalId: proposal.id,
        sql: proposal.draft.normalizedSql,
      })

      setThread((currentThread) => [
        ...updateProposalState(currentThread, proposal.id, "executing"),
        executionEntry,
      ])

      const operation = beginOperation("execute")
      setExecutionState("validating")
      setFailure(null)

      try {
        await Promise.resolve()

        if (!isOperationCurrent(operation.token, "execute")) {
          return null
        }

        setExecutionState("running")
        const result = await executeNaturalQuery(
          proposal.draft.normalizedSql,
          {
            signal: operation.signal,
          }
        )

        if (!isOperationCurrent(operation.token, "execute")) {
          return null
        }

        const executionStateForResult: SqlExecutionState =
          result.rows.length > 0 ? "success" : "empty"
        const executionCardState: SqlExecutionCardState =
          result.rows.length > 0 ? "success" : "empty"

        setExecutionState(executionStateForResult)
        setThread((currentThread) =>
          updateExecutionEntry(
            updateProposalState(currentThread, proposal.id, "executed"),
            executionEntry.id,
            executionCardState,
            result,
            null
          )
        )

        let summaryText = createFallbackSummary(result)
        let summaryWasCanceled = false

        try {
          const summaryPrompt = formatModelPrompt(
            buildSqlResultSummaryPrompt({
              prompt: proposal.userPrompt,
              context: proposal.context,
              modelName: provider?.model ?? "unknown-model",
              sql: proposal.draft.normalizedSql,
              result,
            })
          )
          const summaryResponse = await generateNaturalQuery(summaryPrompt, {
            signal: operation.signal,
          })

          if (!isOperationCurrent(operation.token, "execute")) {
            return result
          }

          const normalizedSummary = stripCodeFences(summaryResponse.rawResponse).trim()
          if (normalizedSummary) {
            summaryText = normalizedSummary
          }
        } catch (summaryError) {
          if (!isAbortError(summaryError)) {
            const summaryFailure = toFailure(
              "summary",
              summaryError,
              "The assistant could not summarize the executed result."
            )
            setFailure(summaryFailure)
            appendThreadEntries(
              createSystemStatusEntry({
                tone: "warning",
                title: "Summary fallback",
                detail: summaryFailure.message,
              })
            )
          } else {
            summaryWasCanceled = true
          }
        }

        if (summaryWasCanceled) {
          appendThreadEntries(
            createSystemStatusEntry({
              tone: "warning",
              title: "Summary canceled",
              detail:
                "The query finished, but the assistant stopped before producing the result summary.",
            })
          )
          return result
        }

        appendThreadEntries(createAssistantEntry(summaryText))
        return result
      } catch (error) {
        if (isAbortError(error)) {
          if (isOperationCurrent(operation.token, "execute")) {
            setExecutionState("canceled")
            setFailure(null)
            setThread((currentThread) =>
              updateExecutionEntry(
                updateProposalState(currentThread, proposal.id, "canceled"),
                executionEntry.id,
                "canceled",
                null,
                "Execution was canceled before completion."
              )
            )
            appendThreadEntries(
              createSystemStatusEntry({
                tone: "warning",
                title: "Execution canceled",
                detail:
                  "The approved query was interrupted before the assistant could finish the result turn.",
              })
            )
          }

          return null
        }

        const nextFailure = toFailure(
          "execution",
          error,
          "The backend rejected the generated SQL execution."
        )
        setExecutionState("error")
        setFailure(nextFailure)
        setThread((currentThread) =>
          updateExecutionEntry(
            updateProposalState(currentThread, proposal.id, "failed"),
            executionEntry.id,
            "error",
            null,
            nextFailure.detail
              ? `${nextFailure.message} ${nextFailure.detail}`
              : nextFailure.message
          )
        )
        appendThreadEntries(
          createAssistantEntry(
            "The approved SQL could not be executed. Review the execution card for the backend error."
          )
        )
        return null
      } finally {
        finishOperation(operation.token, "execute")
      }
    },
    [
      appendThreadEntries,
      beginOperation,
      finishOperation,
      isOperationCurrent,
      provider?.model,
      thread,
    ]
  )

  const clearThread = React.useCallback(() => {
    operationRef.current.controller?.abort()
    operationRef.current = {
      token: operationRef.current.token,
      kind: null,
      controller: null,
    }
    setActiveOperation(null)
    setThread([])
    setFailure(null)
    setGenerationState("idle")
    setExecutionState("idle")
  }, [])

  const cancelOperation = React.useCallback(() => {
    operationRef.current.controller?.abort()
  }, [])

  return {
    provider,
    providerStatus: provider?.status ?? "unavailable",
    thread,
    failure,
    generationState,
    executionState,
    activeOperation,
    isBusy: activeOperation !== null,
    canGenerate: !activeOperation,
    statusSummary: statusPresentation.summary,
    statusDetail: statusPresentation.detail,
    refreshEnvironment,
    sendPrompt,
    approveProposal,
    dismissProposal,
    clearThread,
    cancelOperation,
  }
}
