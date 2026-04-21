import type {
  DatabaseOperationResult,
  DatabaseStatus,
} from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function getDatabaseStatus(options?: RequestOptions) {
  return requestJson<DatabaseStatus>("/database/status", options)
}

export function initializeDatabase(
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<DatabaseOperationResult>("/database/setup", {
    method: "POST",
    signal: options?.signal,
  })
}

export function applyReportingQueries(
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<DatabaseOperationResult>("/database/reporting", {
    method: "POST",
    signal: options?.signal,
  })
}

export function populateDatabase(
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<DatabaseOperationResult>("/database/populate", {
    method: "POST",
    signal: options?.signal,
  })
}

export function cleanupDatabase(
  options?: Omit<RequestOptions, "method" | "body">
) {
  return requestJson<DatabaseOperationResult>("/database/cleanup", {
    method: "DELETE",
    signal: options?.signal,
  })
}
