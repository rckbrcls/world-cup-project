"use client"

import * as React from "react"

import {
  defaultGemmaModelManifest,
  detectGemmaEnvironment,
  downloadGemmaModel,
  generateGemmaResponse,
  getGemmaRuntimeSnapshot,
  initializeGemmaEngine,
  warmGemmaEngine,
} from "@/lib/sql-assistant/gemma-engine"
import { buildSqlGenerationPrompt } from "@/lib/sql-assistant/prompt-builder"
import { parseSqlDraftFromModelResponse } from "@/lib/sql-assistant/sql-normalizer"
import type {
  GemmaEnvironmentReport,
  GemmaEngineLifecycle,
  SqlAssistantContext,
  SqlAssistantFailure,
  SqlDraft,
  SqlExecutionResult,
  SqlExecutionState,
  SqlGenerationState,
} from "@/lib/sql-assistant/types"
import { worldCupApi } from "@/lib/world-cup/api"

type ActiveOperationKind = "download" | "initialize" | "generate" | "execute" | null

type DownloadProgress = {
  downloadedBytes: number
  totalBytes: number | null
  percent: number | null
}

type SqlAssistantState = {
  lifecycle: GemmaEngineLifecycle
  statusSummary: string
  statusDetail: string
  environment: GemmaEnvironmentReport | null
  generationState: SqlGenerationState
  executionState: SqlExecutionState
  draft: SqlDraft | null
  execution: SqlExecutionResult | null
  failure: SqlAssistantFailure | null
  downloadProgress: DownloadProgress | null
}

type SqlAssistantAction =
  | {
      type: "environment/loaded"
      report: GemmaEnvironmentReport
      runtimeReady: boolean
    }
  | { type: "environment/failed"; failure: SqlAssistantFailure }
  | { type: "download/start" }
  | { type: "download/progress"; progress: DownloadProgress }
  | { type: "download/paused" }
  | { type: "download/succeeded"; report: GemmaEnvironmentReport }
  | { type: "download/failed"; failure: SqlAssistantFailure }
  | { type: "initialize/start" }
  | { type: "initialize/warming" }
  | { type: "initialize/succeeded"; report: GemmaEnvironmentReport }
  | { type: "initialize/failed"; failure: SqlAssistantFailure }
  | { type: "initialize/canceled"; report: GemmaEnvironmentReport | null }
  | { type: "generation/start" }
  | { type: "generation/succeeded"; draft: SqlDraft }
  | { type: "generation/failed"; failure: SqlAssistantFailure }
  | { type: "generation/canceled" }
  | { type: "execution/validating" }
  | { type: "execution/start" }
  | { type: "execution/succeeded"; result: SqlExecutionResult }
  | { type: "execution/empty"; result: SqlExecutionResult }
  | { type: "execution/failed"; failure: SqlAssistantFailure }
  | { type: "execution/canceled" }

const initialState: SqlAssistantState = {
  lifecycle: "unavailable",
  statusSummary: "Checking Gemma 4 environment",
  statusDetail:
    "The browser-local Gemma 4 capability probe runs after hydration.",
  environment: null,
  generationState: "idle",
  executionState: "idle",
  draft: null,
  execution: null,
  failure: null,
  downloadProgress: null,
}

function resolveReadyStatus(report: GemmaEnvironmentReport) {
  if (report.hasStoredModel) {
    return {
      lifecycle: "ready" as const,
      summary: "Gemma 4 ready",
      detail:
        "The default Gemma 4 E2B engine is initialized in this browser and ready to generate SQL locally.",
    }
  }

  return {
    lifecycle: "ready" as const,
    summary: "Gemma 4 ready",
    detail:
      "The local Gemma 4 engine is initialized and ready to generate SQL in this browser.",
  }
}

function reducer(
  state: SqlAssistantState,
  action: SqlAssistantAction
): SqlAssistantState {
  switch (action.type) {
    case "environment/loaded": {
      if (action.runtimeReady) {
        const readyStatus = resolveReadyStatus(action.report)

        return {
          ...state,
          lifecycle: readyStatus.lifecycle,
          statusSummary: readyStatus.summary,
          statusDetail: readyStatus.detail,
          environment: action.report,
          failure: null,
          downloadProgress: null,
        }
      }

      return {
        ...state,
        lifecycle: action.report.lifecycle,
        statusSummary: action.report.summary,
        statusDetail: action.report.detail,
        environment: action.report,
        failure: null,
        downloadProgress: null,
      }
    }
    case "environment/failed":
      return {
        ...state,
        lifecycle: "fallback",
        statusSummary: "Environment probe failed",
        statusDetail: action.failure.message,
        failure: action.failure,
      }
    case "download/start":
      return {
        ...state,
        lifecycle: "downloading",
        statusSummary: "Downloading Gemma 4 E2B",
        statusDetail:
          "The browser is caching the default on-device model for local SQL generation.",
        failure: null,
        downloadProgress: {
          downloadedBytes: 0,
          totalBytes: defaultGemmaModelManifest.expectedBytes,
          percent: 0,
        },
      }
    case "download/progress":
      return {
        ...state,
        lifecycle: "downloading",
        statusSummary: "Downloading Gemma 4 E2B",
        statusDetail:
          "The model artifact is being cached locally for browser-side inference.",
        downloadProgress: action.progress,
      }
    case "download/paused":
      return {
        ...state,
        lifecycle: "paused",
        statusSummary: "Model download paused",
        statusDetail:
          "Resume to restart the Gemma 4 download for this browser.",
        downloadProgress: null,
      }
    case "download/succeeded":
      return {
        ...state,
        lifecycle: action.report.lifecycle,
        statusSummary: action.report.summary,
        statusDetail: action.report.detail,
        environment: action.report,
        failure: null,
        downloadProgress: null,
      }
    case "download/failed":
      return {
        ...state,
        lifecycle: "download-error",
        statusSummary: "Model download failed",
        statusDetail: action.failure.message,
        failure: action.failure,
        downloadProgress: null,
      }
    case "initialize/start":
      return {
        ...state,
        lifecycle: "initializing",
        statusSummary: "Initializing Gemma 4",
        statusDetail:
          "The local inference runtime is wiring the cached model for browser execution.",
        failure: null,
      }
    case "initialize/warming":
      return {
        ...state,
        lifecycle: "warming",
        statusSummary: "Warming local model",
        statusDetail:
          "Gemma 4 is performing a short local warm-up before SQL generation.",
        failure: null,
      }
    case "initialize/succeeded": {
      const readyStatus = resolveReadyStatus(action.report)

      return {
        ...state,
        lifecycle: readyStatus.lifecycle,
        statusSummary: readyStatus.summary,
        statusDetail: readyStatus.detail,
        environment: action.report,
        failure: null,
      }
    }
    case "initialize/failed":
      return {
        ...state,
        lifecycle: "fallback",
        statusSummary: "Gemma 4 initialization failed",
        statusDetail: action.failure.message,
        failure: action.failure,
      }
    case "initialize/canceled":
      return {
        ...state,
        lifecycle: action.report?.hasStoredModel ? "ready-to-download" : "fallback",
        statusSummary: action.report?.hasStoredModel
          ? "Model cached locally"
          : "Initialization canceled",
        statusDetail: action.report?.hasStoredModel
          ? "The cached Gemma 4 model is still available. Initialize it again when you are ready."
          : "The Gemma 4 initialization was canceled before becoming ready.",
        environment: action.report ?? state.environment,
        failure: null,
      }
    case "generation/start":
      return {
        ...state,
        generationState: "generating",
        executionState: "idle",
        execution: null,
        failure: null,
      }
    case "generation/succeeded":
      return {
        ...state,
        generationState: "success",
        draft: action.draft,
        execution: null,
        executionState: "idle",
        failure:
          action.draft.validationIssues.length > 0
            ? {
                scope: "validation",
                message:
                  "The generated SQL preview is visible, but it failed the local read-only validation checks.",
                detail: action.draft.validationIssues.join(" "),
                recoverable: true,
              }
            : null,
      }
    case "generation/failed":
      return {
        ...state,
        generationState: "error",
        failure: action.failure,
      }
    case "generation/canceled":
      return {
        ...state,
        generationState: "canceled",
        failure: null,
      }
    case "execution/start":
      return {
        ...state,
        executionState: "running",
        execution: null,
        failure: null,
      }
    case "execution/validating":
      return {
        ...state,
        executionState: "validating",
        execution: null,
        failure: null,
      }
    case "execution/succeeded":
      return {
        ...state,
        executionState: "success",
        execution: action.result,
        failure: null,
      }
    case "execution/empty":
      return {
        ...state,
        executionState: "empty",
        execution: action.result,
        failure: null,
      }
    case "execution/failed":
      return {
        ...state,
        executionState: "error",
        failure: action.failure,
      }
    case "execution/canceled":
      return {
        ...state,
        executionState: "canceled",
        failure: null,
      }
    default:
      return state
  }
}

function toFailure(
  scope: SqlAssistantFailure["scope"],
  error: unknown,
  fallbackMessage: string
): SqlAssistantFailure {
  return {
    scope,
    message: error instanceof Error ? error.message : fallbackMessage,
    recoverable: true,
  }
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  )
}

export function useSqlAssistant() {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const operationRef = React.useRef<{
    token: number
    kind: ActiveOperationKind
    controller: AbortController | null
  }>({
    token: 0,
    kind: null,
    controller: null,
  })
  const [activeOperation, setActiveOperation] =
    React.useState<ActiveOperationKind>(null)

  const beginOperation = React.useCallback(
    (kind: Exclude<ActiveOperationKind, null>, abortable = true) => {
      operationRef.current.controller?.abort()

      const token = operationRef.current.token + 1
      const controller = abortable ? new AbortController() : null

      operationRef.current = {
        token,
        kind,
        controller,
      }
      setActiveOperation(kind)

      return {
        token,
        signal: controller?.signal,
      }
    },
    []
  )

  const finishOperation = React.useCallback((token: number, kind: ActiveOperationKind) => {
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
  }, [])

  const isOperationCurrent = React.useCallback(
    (token: number, kind: ActiveOperationKind) =>
      operationRef.current.token === token && operationRef.current.kind === kind,
    []
  )

  const refreshEnvironment = React.useCallback(async () => {
    try {
      const report = await detectGemmaEnvironment(defaultGemmaModelManifest)
      const runtimeSnapshot = getGemmaRuntimeSnapshot(defaultGemmaModelManifest)

      dispatch({
        type: "environment/loaded",
        report,
        runtimeReady: runtimeSnapshot.isInitialized,
      })
    } catch (error) {
      dispatch({
        type: "environment/failed",
        failure: toFailure(
          "environment",
          error,
          "The Gemma 4 browser capability probe failed."
        ),
      })
    }
  }, [])

  React.useEffect(() => {
    void refreshEnvironment()
  }, [refreshEnvironment])

  const downloadModel = React.useCallback(async () => {
    const operation = beginOperation("download")
    dispatch({ type: "download/start" })

    try {
      await downloadGemmaModel({
        manifest: defaultGemmaModelManifest,
        signal: operation.signal,
        onProgress: (progress) => {
          if (!isOperationCurrent(operation.token, "download")) {
            return
          }

          dispatch({
            type: "download/progress",
            progress,
          })
        },
      })

      if (!isOperationCurrent(operation.token, "download")) {
        return
      }

      const report = await detectGemmaEnvironment(defaultGemmaModelManifest)
      dispatch({
        type: "download/succeeded",
        report,
      })
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      dispatch({
        type: "download/failed",
        failure: toFailure(
          "download",
          error,
          "The Gemma 4 download failed in this browser."
        ),
      })
    } finally {
      finishOperation(operation.token, "download")
    }
  }, [beginOperation, finishOperation, isOperationCurrent])

  const pauseDownload = React.useCallback(() => {
    if (operationRef.current.kind !== "download") {
      return
    }

    operationRef.current.controller?.abort()
    dispatch({ type: "download/paused" })
    setActiveOperation(null)
    operationRef.current = {
      token: operationRef.current.token,
      kind: null,
      controller: null,
    }
  }, [])

  const resumeDownload = React.useCallback(async () => {
    await downloadModel()
  }, [downloadModel])

  const initializeModel = React.useCallback(async () => {
    const operation = beginOperation("initialize", false)
    dispatch({ type: "initialize/start" })

    try {
      await initializeGemmaEngine(defaultGemmaModelManifest)

      if (!isOperationCurrent(operation.token, "initialize")) {
        return
      }

      dispatch({ type: "initialize/warming" })
      await warmGemmaEngine(defaultGemmaModelManifest)

      if (!isOperationCurrent(operation.token, "initialize")) {
        return
      }

      const report = await detectGemmaEnvironment(defaultGemmaModelManifest)
      dispatch({
        type: "initialize/succeeded",
        report,
      })
    } catch (error) {
      if (isAbortError(error)) {
        if (!isOperationCurrent(operation.token, "initialize")) {
          return
        }

        dispatch({
          type: "initialize/canceled",
          report: state.environment,
        })
        return
      }

      dispatch({
        type: "initialize/failed",
        failure: toFailure(
          "initialization",
          error,
          "Gemma 4 could not be initialized in this browser."
        ),
      })
    } finally {
      finishOperation(operation.token, "initialize")
    }
  }, [
    beginOperation,
    finishOperation,
    isOperationCurrent,
    state.environment,
  ])

  const generateSql = React.useCallback(
    async (prompt: string, context: SqlAssistantContext) => {
      if (!prompt.trim()) {
        dispatch({
          type: "generation/failed",
          failure: {
            scope: "generation",
            message:
              "Enter a natural-language request before asking Gemma 4 to generate SQL.",
            recoverable: true,
          },
        })
        return null
      }

      const operation = beginOperation("generate", false)
      dispatch({ type: "generation/start" })

      try {
        const promptPack = buildSqlGenerationPrompt({
          prompt,
          context,
        })
        const rawResponse = await generateGemmaResponse(
          defaultGemmaModelManifest,
          promptPack
        )

        if (!isOperationCurrent(operation.token, "generate")) {
          return null
        }

        const draft = parseSqlDraftFromModelResponse(rawResponse)
        dispatch({
          type: "generation/succeeded",
          draft,
        })

        return draft
      } catch (error) {
        if (isAbortError(error)) {
          if (!isOperationCurrent(operation.token, "generate")) {
            return null
          }

          dispatch({ type: "generation/canceled" })
          return null
        }

        dispatch({
          type: "generation/failed",
          failure: toFailure(
            "generation",
            error,
            "Gemma 4 failed while generating SQL."
          ),
        })
        return null
      } finally {
        finishOperation(operation.token, "generate")
      }
    },
    [beginOperation, finishOperation, isOperationCurrent]
  )

  const executeSql = React.useCallback(async () => {
    if (!state.draft?.normalizedSql) {
      dispatch({
        type: "execution/failed",
        failure: {
          scope: "validation",
          message:
            "Only validated read-only SQL can be executed from the Natural Query workspace.",
          recoverable: true,
        },
      })
      return null
    }

    const operation = beginOperation("execute")
    dispatch({ type: "execution/validating" })

    try {
      await Promise.resolve()
      dispatch({ type: "execution/start" })

      const result = await worldCupApi.executeNaturalQuery(state.draft.normalizedSql, {
        signal: operation.signal,
      })

      if (!isOperationCurrent(operation.token, "execute")) {
        return null
      }

      dispatch({
        type: result.rows.length > 0 ? "execution/succeeded" : "execution/empty",
        result,
      })
      return result
    } catch (error) {
      if (isAbortError(error)) {
        if (!isOperationCurrent(operation.token, "execute")) {
          return null
        }

        dispatch({ type: "execution/canceled" })
        return null
      }

      dispatch({
        type: "execution/failed",
        failure: toFailure(
          "execution",
          error,
          "The backend rejected the generated SQL execution."
        ),
      })
      return null
    } finally {
      finishOperation(operation.token, "execute")
    }
  }, [
    beginOperation,
    finishOperation,
    isOperationCurrent,
    state.draft,
  ])

  const cancelOperation = React.useCallback(() => {
    const activeKind = operationRef.current.kind
    if (!activeKind) {
      return
    }

    operationRef.current.controller?.abort()

    if (activeKind === "generate") {
      dispatch({ type: "generation/canceled" })
    } else if (activeKind === "execute") {
      dispatch({ type: "execution/canceled" })
    } else if (activeKind === "initialize") {
      dispatch({
        type: "initialize/canceled",
        report: state.environment,
      })
    } else if (activeKind === "download") {
      dispatch({ type: "download/paused" })
    }

    operationRef.current = {
      token: operationRef.current.token,
      kind: null,
      controller: null,
    }
    setActiveOperation(null)
  }, [state.environment])

  const canDownload =
    !activeOperation &&
    !state.environment?.hasStoredModel &&
    (state.lifecycle === "ready-to-download" ||
      state.lifecycle === "not-downloaded" ||
      state.lifecycle === "download-error")
  const canInitialize =
    !activeOperation &&
    Boolean(state.environment?.hasStoredModel) &&
    state.lifecycle !== "ready" &&
    state.lifecycle !== "unsupported" &&
    state.lifecycle !== "fallback"
  const canGenerate =
    !activeOperation && state.lifecycle === "ready"
  const canExecute =
    !activeOperation &&
    state.lifecycle === "ready" &&
    Boolean(state.draft?.isExecutable && state.draft.normalizedSql)

  return {
    manifest: defaultGemmaModelManifest,
    lifecycle: state.lifecycle,
    statusSummary: state.statusSummary,
    statusDetail: state.statusDetail,
    environment: state.environment,
    draft: state.draft,
    execution: state.execution,
    failure: state.failure,
    downloadProgress: state.downloadProgress,
    generationState: state.generationState,
    executionState: state.executionState,
    activeOperation,
    isBusy: activeOperation !== null,
    canDownload,
    canInitialize,
    canGenerate,
    canExecute,
    refreshEnvironment,
    downloadModel,
    pauseDownload,
    resumeDownload,
    initializeModel,
    generateSql,
    executeSql,
    cancelOperation,
  }
}
