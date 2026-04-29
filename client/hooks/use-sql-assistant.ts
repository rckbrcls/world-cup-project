"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import * as React from "react"

import {
  buildSqlPlanningPrompt,
  buildSqlRepairPrompt,
  formatModelPrompt,
} from "@/lib/sql-assistant/prompt-builder"
import {
  executeNaturalQuery,
  getNaturalQueryPlanningStreamUrl,
  getNaturalQueryStatus,
} from "@/lib/services/sql-assistant/natural-query-service"
import {
  AUTO_REPAIR_USER_PROMPT_PREFIX,
  isAutoRepairUserMessage,
} from "@/lib/sql-assistant/types"
import type {
  NaturalQueryRepairContext,
  NaturalQueryExecutionErrorReason,
  NaturalQueryExecutionErrorScope,
  NaturalQueryProviderState,
  SqlAssistantContext,
  SqlAssistantFailure,
  SqlAssistantUiMessage,
  SqlDraft,
  SqlExecutionCardState,
  SqlExecutionState,
  SqlGenerationState,
  SqlPlanningHistory,
  SqlPlanningStatusData,
  SqlProposalRecord,
} from "@/lib/sql-assistant/types"

type ActiveOperationKind = "refresh" | "generate" | "execute" | null

type PendingPlanningRequest = {
  userPrompt: string
  context: SqlAssistantContext
  origin: "initial" | "repair"
  supersedesProposalId: string | null
  repairContext: NaturalQueryRepairContext | null
}

type RepairRequestOptions = {
  proposalId: string
  proposal: SqlProposalRecord
  failureScope: NaturalQueryExecutionErrorScope
  failureDetail: string
  failingSql: string
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function isFailureScope(value: unknown): value is SqlAssistantFailure["scope"] {
  return (
    value === "environment" ||
    value === "generation" ||
    value === "validation" ||
    value === "execution" ||
    value === "summary"
  )
}

function isExecutionErrorScope(
  value: unknown
): value is NaturalQueryExecutionErrorScope {
  return value === "validation" || value === "execution"
}

function isExecutionErrorReason(
  value: unknown
): value is NaturalQueryExecutionErrorReason {
  return (
    value === "database-validator" ||
    value === "database-preflight" ||
    value === "database-runtime"
  )
}

function toExecutionErrorMetadata(failure: SqlAssistantFailure) {
  return {
    errorScope: isExecutionErrorScope(failure.scope) ? failure.scope : null,
    errorReason: isExecutionErrorReason(failure.reason) ? failure.reason : null,
  }
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
      scope?: unknown
    }

    if (typeof maybeFailure.message === "string") {
      return {
        scope: isFailureScope(maybeFailure.scope) ? maybeFailure.scope : scope,
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
  planningStatus: SqlPlanningStatusData | null
}) {
  const { provider, activeOperation, planningStatus } = options

  if (activeOperation === "refresh" && provider === null) {
    return {
      summary: "Checking local Ollama server",
      detail:
        "The workspace is checking the configured Ollama server through the FastAPI backend.",
    }
  }

  if (activeOperation === "generate") {
    if (planningStatus) {
      return {
        summary: planningStatus.summary,
        detail: planningStatus.detail,
      }
    }

    return {
      summary: "Planning SQL with local Ollama",
      detail:
        "The assistant is preparing one structured SQL proposal through the FastAPI backend.",
    }
  }

  if (activeOperation === "execute") {
    return {
      summary: "Running approved query",
      detail:
        "The assistant is executing one local-prechecked SQL query through the controlled backend path.",
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

function extractProposalDraft(message: SqlAssistantUiMessage): SqlDraft | null {
  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    const part = message.parts[index]

    if (part.type === "data-sqlProposal") {
      return part.data.draft
    }
  }

  return null
}

function extractMessageText(message: SqlAssistantUiMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
}

function buildPlanningHistory(options: {
  messages: SqlAssistantUiMessage[]
  proposalRecords: Record<string, SqlProposalRecord>
}): SqlPlanningHistory {
  const { messages, proposalRecords } = options

  let lastUserPrompt: string | null = null
  let lastAssistantMessage: string | null = null

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (!lastAssistantMessage && message.role === "assistant") {
      const assistantText = extractMessageText(message)

      if (assistantText) {
        lastAssistantMessage = assistantText
      }
    }

    if (!lastUserPrompt && message.role === "user") {
      const userText = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
        .trim()

      if (userText && !isAutoRepairUserMessage(userText)) {
        lastUserPrompt = userText
      }
    }

    if (lastUserPrompt && lastAssistantMessage) {
      break
    }
  }

  const latestProposal = messages
    .map((message) => proposalRecords[message.id] ?? null)
    .filter(
      (record): record is SqlProposalRecord =>
        Boolean(record) &&
        record.proposalState !== "dismissed" &&
        record.proposalState !== "canceled"
    )
    .at(-1)

  return {
    lastUserPrompt,
    lastAssistantMessage,
    lastSqlProposal: latestProposal?.draft.previewSql
      ? {
          sql: latestProposal.draft.previewSql,
          state:
            latestProposal.proposalState === "blocked-precheck"
              ? "blocked"
              : "approved",
        }
      : null,
  }
}

function buildValidationFailure(options: { draft: SqlDraft }): SqlAssistantFailure {
  const { draft } = options

  if (draft.validationReason === "database-validator") {
    return {
      scope: "validation",
      reason: "database-validator",
      message:
        "PostgreSQL rejected this SQL proposal during the read-only validation step.",
      detail: draft.validationDetail ?? draft.validationIssues.join(" "),
      recoverable: true,
    }
  }

  if (draft.validationReason === "database-preflight") {
    return {
      scope: "validation",
      reason: "database-preflight",
      message: "PostgreSQL rejected this SQL proposal before approval.",
      detail: draft.validationDetail ?? draft.validationIssues.join(" "),
      recoverable: true,
    }
  }

  return {
    scope: "validation",
    message:
      "The SQL proposal is visible, but it failed the local precheck for controlled execution.",
    detail: draft.validationIssues.join(" "),
    recoverable: true,
  }
}

export function useSqlAssistant() {
  const [provider, setProvider] = React.useState<NaturalQueryProviderState | null>(
    null
  )
  const [generationState, setGenerationState] =
    React.useState<SqlGenerationState>("idle")
  const [executionState, setExecutionState] =
    React.useState<SqlExecutionState>("idle")
  const [failure, setFailure] = React.useState<SqlAssistantFailure | null>(null)
  const [planningStatus, setPlanningStatus] =
    React.useState<SqlPlanningStatusData | null>(null)
  const [proposalRecords, setProposalRecords] = React.useState<
    Record<string, SqlProposalRecord>
  >({})
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const executionControllerRef = React.useRef<AbortController | null>(null)
  const pendingPlanningRequestRef = React.useRef<PendingPlanningRequest | null>(null)
  const planningFailureRef = React.useRef(false)
  const requestRepairRef = React.useRef<
    ((options: RepairRequestOptions) => Promise<true | null>) | null
  >(null)

  const planningTransport = React.useMemo(
    () =>
      new DefaultChatTransport<SqlAssistantUiMessage>({
        api: getNaturalQueryPlanningStreamUrl(),
      }),
    []
  )

  const planningChat = useChat<SqlAssistantUiMessage>({
    transport: planningTransport,
    experimental_throttle: 48,
    onData: (part) => {
      if (part.type !== "data-sqlStatus") {
        return
      }

      React.startTransition(() => {
        setPlanningStatus(part.data)
      })

      if (part.data.state === "error") {
        planningFailureRef.current = true
        setFailure({
          scope: "generation",
          message: part.data.summary,
          detail: part.data.detail,
          recoverable: true,
        })
      }
    },
    onError: (error) => {
      const pendingRequest = pendingPlanningRequestRef.current
      pendingPlanningRequestRef.current = null
      planningFailureRef.current = true
      setPlanningStatus(null)
      setGenerationState("error")
      setFailure(
        toFailure(
          "generation",
          error,
          pendingRequest?.origin === "repair"
            ? "The configured Ollama model failed while repairing the SQL proposal."
            : "The configured Ollama model failed while planning SQL."
        )
      )
    },
    onFinish: ({ message, isAbort, isError }) => {
      const pendingRequest = pendingPlanningRequestRef.current
      pendingPlanningRequestRef.current = null
      setPlanningStatus(null)

      if (isAbort) {
        planningFailureRef.current = false
        setGenerationState("canceled")
        setFailure(null)
        return
      }

      const draft = extractProposalDraft(message)

      if (!draft) {
        if (isError || planningFailureRef.current) {
          setGenerationState("error")
        } else {
          setGenerationState("success")
        }

        setFailure((currentFailure) =>
          currentFailure ??
          {
            scope: "generation",
            message:
              "The assistant finished without returning a structured SQL proposal.",
            recoverable: true,
          }
        )
        return
      }

      planningFailureRef.current = false

      React.startTransition(() => {
        setProposalRecords((currentRecords) => ({
          ...currentRecords,
          [message.id]: {
            messageId: message.id,
            proposalState: draft.isExecutable
              ? "pending-approval"
              : "blocked-precheck",
            userPrompt: pendingRequest?.userPrompt ?? "",
            context:
              pendingRequest?.context ??
              ({
                section: "overview",
                editionId: null,
                editionYear: null,
              } satisfies SqlAssistantContext),
            origin: pendingRequest?.origin ?? "initial",
            supersedesProposalId: pendingRequest?.supersedesProposalId ?? null,
            draft,
            execution: null,
          },
        }))
      })

      if (draft.validationIssues.length > 0) {
        const nextFailure = buildValidationFailure({ draft })

        setFailure(nextFailure)

        if (
          pendingRequest?.origin === "initial" &&
          draft.previewSql &&
          !draft.clarification
        ) {
          void requestRepairRef.current?.({
            proposalId: message.id,
            proposal: {
              messageId: message.id,
              proposalState: "blocked-precheck",
              userPrompt: pendingRequest.userPrompt,
              context: pendingRequest.context,
              origin: "initial",
              supersedesProposalId: null,
              draft,
              execution: null,
            },
            failureScope: "validation",
            failureDetail:
              nextFailure.detail ?? nextFailure.message,
            failingSql: draft.previewSql,
          })
        }
      } else {
        setFailure((currentFailure) =>
          currentFailure?.scope === "validation" ? null : currentFailure
        )
      }

      setGenerationState("success")
    },
  })

  const planningBusy =
    planningChat.status === "submitted" || planningChat.status === "streaming"
  const executionBusy =
    executionState === "validating" || executionState === "running"

  const activeOperation: ActiveOperationKind = isRefreshing
    ? "refresh"
    : executionBusy
      ? "execute"
      : planningBusy
        ? "generate"
        : null

  const refreshEnvironment = React.useCallback(async () => {
    setIsRefreshing(true)

    try {
      const nextProvider = await getNaturalQueryStatus()
      setProvider(nextProvider)
      setFailure((currentFailure) =>
        currentFailure?.scope === "environment" ? null : currentFailure
      )
    } catch (error) {
      setProvider(null)
      setFailure(
        toFailure(
          "environment",
          error,
          "The workspace could not reach the configured Ollama provider through the FastAPI backend."
        )
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshEnvironment()
  }, [refreshEnvironment])

  const submitPlanningRequest = React.useCallback(
    async (request: PendingPlanningRequest) => {
      if (provider?.status !== "ready") {
        const providerFailure = {
          scope: "environment" as const,
          message:
            provider?.detail ??
            "The configured Ollama provider is not ready for SQL planning.",
          recoverable: true,
        }

        setGenerationState("error")
        setFailure(providerFailure)
        return null
      }

      const promptPack = formatModelPrompt(
        request.origin === "repair" && request.repairContext
          ? buildSqlRepairPrompt({
              prompt: request.userPrompt,
              context: request.context,
              repair: request.repairContext,
              modelName: provider.model,
            })
          : buildSqlPlanningPrompt({
              prompt: request.userPrompt,
              context: request.context,
              history: buildPlanningHistory({
                messages: planningChat.messages,
                proposalRecords,
              }),
              modelName: provider.model,
            })
      )

      pendingPlanningRequestRef.current = request
      planningFailureRef.current = false
      setGenerationState("generating")
      setExecutionState("idle")
      setFailure(null)
      setPlanningStatus({
        phase: "planning",
        summary:
          request.origin === "repair"
            ? "Repairing SQL proposal with local Ollama"
            : "Planning SQL with local Ollama",
        detail:
          request.origin === "repair"
            ? "The assistant is generating one repaired SQL proposal from PostgreSQL feedback."
            : "The assistant is streaming planning updates through the FastAPI backend.",
        state: "running",
      })

      try {
        await planningChat.sendMessage(
          {
            text:
              request.origin === "repair"
                ? `${AUTO_REPAIR_USER_PROMPT_PREFIX} ${request.userPrompt}`
                : request.userPrompt,
          },
          {
            body: {
              prompt: promptPack,
              repairContext: request.repairContext ?? undefined,
            },
          }
        )
        return true
      } catch (error) {
        if (isAbortError(error)) {
          pendingPlanningRequestRef.current = null
          planningFailureRef.current = false
          setGenerationState("canceled")
          setPlanningStatus(null)
          setFailure(null)
          return null
        }

        pendingPlanningRequestRef.current = null
        setGenerationState("error")
        setPlanningStatus(null)
        setFailure(
          toFailure(
            "generation",
            error,
            request.origin === "repair"
              ? "The configured Ollama model failed while repairing the SQL proposal."
              : "The configured Ollama model failed while planning SQL."
          )
        )
        return null
      }
    },
    [planningChat, proposalRecords, provider]
  )

  const requestRepair = React.useCallback(
    async (options: RepairRequestOptions) => {
      const { proposalId, proposal, failureScope, failureDetail, failingSql } = options

      if (proposal.origin === "repair") {
        return null
      }

      return submitPlanningRequest({
        userPrompt: proposal.userPrompt,
        context: proposal.context,
        origin: "repair",
        supersedesProposalId: proposalId,
        repairContext: {
          originalPrompt: proposal.userPrompt,
          failingSql,
          failureScope,
          failureDetail,
        },
      })
    },
    [submitPlanningRequest]
  )

  React.useEffect(() => {
    requestRepairRef.current = requestRepair
  }, [requestRepair])

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

      return submitPlanningRequest({
        userPrompt: normalizedPrompt,
        context,
        origin: "initial",
        supersedesProposalId: null,
        repairContext: null,
      })
    },
    [submitPlanningRequest]
  )

  const dismissProposal = React.useCallback((messageId: string) => {
    setProposalRecords((currentRecords) => {
      const proposal = currentRecords[messageId]

      if (!proposal) {
        return currentRecords
      }

      return {
        ...currentRecords,
        [messageId]: {
          ...proposal,
          proposalState: "dismissed",
        },
      }
    })
  }, [])

  const approveProposal = React.useCallback(
    async (messageId: string) => {
      const proposal = proposalRecords[messageId]

      if (!proposal || !proposal.draft.normalizedSql) {
        setExecutionState("error")
        setFailure({
          scope: "validation",
          message:
            "Only SQL proposals that passed the controlled validation checks can be executed from the assistant drawer.",
          recoverable: true,
        })
        return null
      }

      if (proposal.proposalState !== "pending-approval") {
        return null
      }

      const controller = new AbortController()
      executionControllerRef.current?.abort()
      executionControllerRef.current = controller

      setExecutionState("validating")
      setFailure(null)
      setProposalRecords((currentRecords) => ({
        ...currentRecords,
        [messageId]: {
          ...proposal,
          proposalState: "executing",
          execution: {
            state: "executing",
            sql: proposal.draft.normalizedSql!,
            result: null,
            errorMessage: null,
            errorScope: null,
            errorReason: null,
          },
        },
      }))

      try {
        await Promise.resolve()

        if (controller.signal.aborted) {
          return null
        }

        setExecutionState("running")
        const result = await executeNaturalQuery(proposal.draft.normalizedSql, {
          signal: controller.signal,
        })

        if (controller.signal.aborted) {
          return null
        }

        const nextState: SqlExecutionCardState =
          result.rows.length > 0 ? "success" : "empty"

        setExecutionState(result.rows.length > 0 ? "success" : "empty")
        setProposalRecords((currentRecords) => {
          const nextProposal = currentRecords[messageId] ?? proposal

          return {
            ...currentRecords,
            [messageId]: {
              ...nextProposal,
              proposalState: "executed",
              execution: {
                state: nextState,
                sql: proposal.draft.normalizedSql!,
                result,
                errorMessage: null,
                errorScope: null,
                errorReason: null,
              },
            },
          }
        })
        setFailure(null)
        return result
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          setExecutionState("canceled")
          setFailure(null)
          setProposalRecords((currentRecords) => {
            const nextProposal = currentRecords[messageId] ?? proposal

            return {
              ...currentRecords,
              [messageId]: {
                ...nextProposal,
                proposalState: "canceled",
                execution: {
                  state: "canceled",
                  sql: proposal.draft.normalizedSql!,
                  result: null,
                  errorMessage: "Execution was canceled before completion.",
                  errorScope: null,
                  errorReason: null,
                },
              },
            }
          })
          return null
        }

        const nextFailure = toFailure(
          "execution",
          error,
          "The controlled PostgreSQL execution failed."
        )
        const executionErrorMetadata = toExecutionErrorMetadata(nextFailure)
        setExecutionState("error")
        setFailure(nextFailure)
        setProposalRecords((currentRecords) => {
          const nextProposal = currentRecords[messageId] ?? proposal

          return {
            ...currentRecords,
            [messageId]: {
              ...nextProposal,
              proposalState: "execution-failed",
              execution: {
                state: "error",
                sql: proposal.draft.normalizedSql!,
                result: null,
                errorMessage: nextFailure.detail
                  ? `${nextFailure.message} ${nextFailure.detail}`
                  : nextFailure.message,
                errorScope: executionErrorMetadata.errorScope,
                errorReason: executionErrorMetadata.errorReason,
              },
            },
          }
        })

        if (proposal.origin === "initial") {
          void requestRepair({
            proposalId: messageId,
            proposal,
            failureScope: "execution",
            failureDetail: nextFailure.detail ?? nextFailure.message,
            failingSql: proposal.draft.normalizedSql,
          })
        }

        return null
      } finally {
        if (executionControllerRef.current === controller) {
          executionControllerRef.current = null
        }
      }
    },
    [proposalRecords, requestRepair]
  )

  const clearThread = React.useCallback(() => {
    planningChat.stop()
    executionControllerRef.current?.abort()
    executionControllerRef.current = null
    pendingPlanningRequestRef.current = null
    planningFailureRef.current = false
    planningChat.setMessages([])
    setProposalRecords({})
    setPlanningStatus(null)
    setFailure(null)
    setGenerationState("idle")
    setExecutionState("idle")
  }, [planningChat])

  const cancelOperation = React.useCallback(() => {
    if (executionBusy) {
      executionControllerRef.current?.abort()
      return
    }

    if (planningBusy) {
      planningChat.stop()
    }
  }, [executionBusy, planningBusy, planningChat])

  const statusPresentation = getStatusPresentation({
    provider,
    activeOperation,
    planningStatus,
  })

  return {
    provider,
    providerStatus: provider?.status ?? "unavailable",
    messages: planningChat.messages,
    proposalRecords,
    failure,
    generationState,
    executionState,
    activeOperation,
    isBusy: planningBusy || executionBusy || isRefreshing,
    canGenerate: !planningBusy && !executionBusy && !isRefreshing,
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
