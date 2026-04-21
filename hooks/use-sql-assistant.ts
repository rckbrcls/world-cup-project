"use client"

import * as React from "react"

import {
  buildSqlGenerationPrompt,
  formatModelPrompt,
} from "@/lib/sql-assistant/prompt-builder"
import { parseSqlDraftFromModelResponse } from "@/lib/sql-assistant/sql-normalizer"
import type {
  NaturalQueryProviderState,
  SqlAssistantContext,
  SqlAssistantFailure,
  SqlDraft,
  SqlExecutionResult,
  SqlExecutionState,
  SqlGenerationState,
} from "@/lib/sql-assistant/types"
import { worldCupApi } from "@/lib/world-cup/api"

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
      summary: "Generating SQL with local Ollama",
      detail:
        "The prompt is being sent through the backend proxy and the generated SQL will stay visible for review.",
    }
  }

  if (activeOperation === "execute") {
    return {
      summary: "Executing validated SQL",
      detail:
        "The validated read-only SQL is running through the controlled FastAPI execution path.",
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

export function useSqlAssistant() {
  const [provider, setProvider] = React.useState<NaturalQueryProviderState | null>(
    null
  )
  const [generationState, setGenerationState] =
    React.useState<SqlGenerationState>("idle")
  const [executionState, setExecutionState] =
    React.useState<SqlExecutionState>("idle")
  const [draft, setDraft] = React.useState<SqlDraft | null>(null)
  const [execution, setExecution] = React.useState<SqlExecutionResult | null>(null)
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
      const nextProvider = await worldCupApi.getNaturalQueryStatus({
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
  const canGenerate = !activeOperation && provider?.status === "ready"
  const canExecute =
    !activeOperation && Boolean(draft?.isExecutable && draft.normalizedSql)

  const generateSql = React.useCallback(
    async (prompt: string, context: SqlAssistantContext) => {
      if (!prompt.trim()) {
        setGenerationState("error")
        setFailure({
          scope: "generation",
          message:
            "Enter a natural-language request before asking the local Ollama model to generate SQL.",
          recoverable: true,
        })
        return null
      }

      if (provider?.status !== "ready") {
        setGenerationState("error")
        setFailure({
          scope: "environment",
          message:
            statusPresentation.detail ??
            "The configured Ollama provider is not ready for SQL generation.",
          recoverable: true,
        })
        return null
      }

      const operation = beginOperation("generate")
      setGenerationState("generating")
      setExecutionState("idle")
      setExecution(null)
      setFailure(null)

      try {
        const promptPack = formatModelPrompt(
          buildSqlGenerationPrompt({
            prompt,
            context,
            modelName: provider.model,
          })
        )
        const response = await worldCupApi.generateNaturalQuery(promptPack, {
          signal: operation.signal,
        })

        if (!isOperationCurrent(operation.token, "generate")) {
          return null
        }

        const nextDraft = parseSqlDraftFromModelResponse(response.rawResponse)

        setDraft(nextDraft)
        setGenerationState("success")
        setFailure(
          nextDraft.validationIssues.length > 0
            ? {
                scope: "validation",
                message:
                  "The generated SQL preview is visible, but it failed the local read-only validation checks.",
                detail: nextDraft.validationIssues.join(" "),
                recoverable: true,
              }
            : null
        )

        return nextDraft
      } catch (error) {
        if (isAbortError(error)) {
          if (isOperationCurrent(operation.token, "generate")) {
            setGenerationState("canceled")
            setFailure(null)
          }

          return null
        }

        setGenerationState("error")
        setFailure(
          toFailure(
            "generation",
            error,
            "The configured Ollama model failed while generating SQL."
          )
        )
        return null
      } finally {
        finishOperation(operation.token, "generate")
      }
    },
    [
      beginOperation,
      finishOperation,
      isOperationCurrent,
      provider,
      statusPresentation.detail,
    ]
  )

  const executeSql = React.useCallback(async () => {
    if (!draft?.normalizedSql) {
      setExecutionState("error")
      setFailure({
        scope: "validation",
        message:
          "Only validated read-only SQL can be executed from the Natural Query workspace.",
        recoverable: true,
      })
      return null
    }

    const operation = beginOperation("execute")
    setExecutionState("validating")
    setFailure(null)

    try {
      await Promise.resolve()

      if (!isOperationCurrent(operation.token, "execute")) {
        return null
      }

      setExecutionState("running")
      const result = await worldCupApi.executeNaturalQuery(draft.normalizedSql, {
        signal: operation.signal,
      })

      if (!isOperationCurrent(operation.token, "execute")) {
        return null
      }

      setExecution(result)
      setExecutionState(result.rows.length > 0 ? "success" : "empty")
      return result
    } catch (error) {
      if (isAbortError(error)) {
        if (isOperationCurrent(operation.token, "execute")) {
          setExecutionState("canceled")
          setFailure(null)
        }

        return null
      }

      setExecutionState("error")
      setFailure(
        toFailure(
          "execution",
          error,
          "The backend rejected the generated SQL execution."
        )
      )
      return null
    } finally {
      finishOperation(operation.token, "execute")
    }
  }, [beginOperation, draft, finishOperation, isOperationCurrent])

  const cancelOperation = React.useCallback(() => {
    const activeKind = operationRef.current.kind

    if (!activeKind) {
      return
    }

    operationRef.current.controller?.abort()

    if (activeKind === "generate") {
      setGenerationState("canceled")
      setFailure(null)
    }

    if (activeKind === "execute") {
      setExecutionState("canceled")
      setFailure(null)
    }
  }, [])

  return {
    provider,
    providerStatus: provider?.status ?? "unavailable",
    draft,
    execution,
    failure,
    generationState,
    executionState,
    activeOperation,
    isBusy: activeOperation !== null,
    canGenerate,
    canExecute,
    statusSummary: statusPresentation.summary,
    statusDetail: statusPresentation.detail,
    refreshEnvironment,
    generateSql,
    executeSql,
    cancelOperation,
  }
}
