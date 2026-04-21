import type { SqlDraft } from "@/lib/sql-assistant/types"

type StructuredPayload = {
  assistantMessage?: unknown
  sql?: unknown
  clarification?: unknown
  warnings?: unknown
  confidence?: unknown
}

type NormalizedSqlResult = {
  normalizedSql: string | null
  issues: string[]
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null
  }

  if (value < 0 || value > 1) {
    return null
  }

  return value
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function stripCodeFences(value: string) {
  const trimmed = value.trim()

  if (!trimmed.startsWith("```")) {
    return trimmed
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim()
}

function tryParseStructuredPayload(rawResponse: string): StructuredPayload | null {
  const candidates = [stripCodeFences(rawResponse)]
  const firstBraceIndex = rawResponse.indexOf("{")
  const lastBraceIndex = rawResponse.lastIndexOf("}")

  if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    candidates.push(rawResponse.slice(firstBraceIndex, lastBraceIndex + 1).trim())
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    try {
      const parsed = JSON.parse(candidate) as StructuredPayload

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Ignore malformed candidates and continue with the next fallback.
    }
  }

  return null
}

function normalizeWarnings(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
}

export function normalizeSqlForExecution(sql: string): NormalizedSqlResult {
  const issues: string[] = []
  let normalizedSql = stripCodeFences(sql)
    .replace(/^sql\s+/i, "")
    .trim()

  normalizedSql = normalizedSql.replace(/;+[\s\n]*$/g, "").trim()

  if (!normalizedSql) {
    issues.push("The model did not return executable SQL.")
    return {
      normalizedSql: null,
      issues,
    }
  }

  if (/--|\/\*/.test(normalizedSql)) {
    issues.push("SQL comments are not allowed in controlled execution.")
  }

  if (/;/.test(normalizedSql)) {
    issues.push("Only one SQL statement can be executed at a time.")
  }

  if (!/^\s*(select|with)\b/i.test(normalizedSql)) {
    issues.push("Only read-only SELECT statements are allowed.")
  }

  if (
    /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|prepare|deallocate|vacuum|analyze|refresh|set|reset|show|begin|commit|rollback|savepoint|lock|discard|listen|notify|unlisten)\b/i.test(
      normalizedSql
    )
  ) {
    issues.push("The generated SQL includes a forbidden command.")
  }

  if (issues.length > 0) {
    return {
      normalizedSql: null,
      issues,
    }
  }

  return {
    normalizedSql,
    issues,
  }
}

export function parseSqlDraftFromModelResponse(rawResponse: string): SqlDraft {
  const structuredPayload = tryParseStructuredPayload(rawResponse)
  const warnings = normalizeWarnings(structuredPayload?.warnings)
  const clarification = normalizeOptionalText(structuredPayload?.clarification)
  const assistantMessage = normalizeOptionalText(structuredPayload?.assistantMessage)
  const generatedSql =
    typeof structuredPayload?.sql === "string" &&
    structuredPayload.sql.trim().length > 0
      ? structuredPayload.sql
      : null
  const fallbackPreviewSql = generatedSql ?? stripCodeFences(rawResponse)
  const previewSql =
    fallbackPreviewSql && /(select|with)\b/i.test(fallbackPreviewSql)
      ? fallbackPreviewSql.trim()
      : generatedSql
  const normalized = previewSql
    ? normalizeSqlForExecution(previewSql)
    : { normalizedSql: null, issues: [] }
  const normalizedWarnings =
    structuredPayload || !previewSql
      ? warnings
      : [
          ...warnings,
          "The model returned unstructured output. The SQL preview uses a fallback extraction path.",
        ]

  return {
    rawResponse,
    assistantMessage,
    generatedSql,
    previewSql,
    normalizedSql: normalized.normalizedSql,
    clarification,
    warnings: normalizedWarnings,
    validationIssues: normalized.issues,
    confidence: clampConfidence(structuredPayload?.confidence),
    isExecutable: Boolean(normalized.normalizedSql && !clarification),
  }
}
