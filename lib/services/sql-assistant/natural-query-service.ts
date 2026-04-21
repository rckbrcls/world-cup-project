import type {
  NaturalQueryExecutionRequest,
  NaturalQueryGenerateRequest,
  NaturalQueryGenerateResponse,
  NaturalQueryProviderState,
  SqlExecutionResult,
} from "@/lib/sql-assistant/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function getNaturalQueryStatus(options?: RequestOptions) {
  return requestJson<NaturalQueryProviderState>("/natural-query/status", options)
}

export function generateNaturalQuery(
  prompt: string,
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<NaturalQueryGenerateResponse>("/natural-query/generate", {
    method: "POST",
    body: {
      prompt,
    } satisfies NaturalQueryGenerateRequest,
    signal: options?.signal,
  })
}

export function executeNaturalQuery(
  sql: string,
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<SqlExecutionResult>("/natural-query/execute", {
    method: "POST",
    body: {
      sql,
    } satisfies NaturalQueryExecutionRequest,
    signal: options?.signal,
  })
}
