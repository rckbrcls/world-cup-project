import type {
  NaturalQueryExecutionErrorResponse,
  NaturalQueryExecutionRequest,
  NaturalQueryGenerateRequest,
  NaturalQueryGenerateResponse,
  NaturalQueryProviderState,
  SqlExecutionResult,
} from "@/lib/sql-assistant/types"
import {
  ApiRequestError,
  type RequestOptions,
} from "@/lib/services/http-client"

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000"

type ParsedRequestError = {
  message?: string
  detail?: string
  reason?: string
  scope?: string
}

function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    DEFAULT_BACKEND_BASE_URL
  )
}

function parseRequestErrorPayload(payload: unknown): ParsedRequestError | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const rawPayload = payload as Record<string, unknown>

  if (
    rawPayload.detail &&
    typeof rawPayload.detail === "object" &&
    !Array.isArray(rawPayload.detail)
  ) {
    return parseRequestErrorPayload(rawPayload.detail)
  }

  return {
    message:
      typeof rawPayload.message === "string"
        ? rawPayload.message
        : typeof rawPayload.detail === "string"
          ? rawPayload.detail
          : undefined,
    detail:
      typeof rawPayload.detail === "string" ? rawPayload.detail : undefined,
    reason:
      typeof rawPayload.reason === "string" ? rawPayload.reason : undefined,
    scope: typeof rawPayload.scope === "string" ? rawPayload.scope : undefined,
  }
}

async function requestNaturalQueryJson<T>(
  path: string,
  options: RequestOptions = {}
) {
  const headers: Record<string, string> = {
    accept: "application/json",
  }
  const requestMethod = options.method ?? "GET"

  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: requestMethod,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    mode: "cors",
    signal: options.signal,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    let detail: string | undefined
    let reason: string | undefined
    let scope: string | undefined

    try {
      const payload = (await response.json()) as
        | NaturalQueryExecutionErrorResponse
        | { detail?: string }
      const parsedPayload = parseRequestErrorPayload(payload)

      if (parsedPayload?.message) {
        message = parsedPayload.message
      }
      detail = parsedPayload?.detail
      reason = parsedPayload?.reason
      scope = parsedPayload?.scope
    } catch {
      // Ignore invalid JSON payloads and surface the default error message.
    }

    throw new ApiRequestError(message, response.status, path, {
      detail,
      reason,
      scope,
    })
  }

  return (await response.json()) as T
}

export function getNaturalQueryPlanningStreamUrl() {
  return `${getBackendBaseUrl()}/natural-query/plan-stream`
}

export function getNaturalQueryStatus(options?: RequestOptions) {
  return requestNaturalQueryJson<NaturalQueryProviderState>(
    "/natural-query/status",
    options
  )
}

export function generateNaturalQuery(
  prompt: string,
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestNaturalQueryJson<NaturalQueryGenerateResponse>(
    "/natural-query/generate",
    {
      method: "POST",
      body: {
        prompt,
      } satisfies NaturalQueryGenerateRequest,
      signal: options?.signal,
    }
  )
}

export function executeNaturalQuery(
  sql: string,
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestNaturalQueryJson<SqlExecutionResult>("/natural-query/execute", {
    method: "POST",
    body: {
      sql,
    } satisfies NaturalQueryExecutionRequest,
    signal: options?.signal,
  })
}
