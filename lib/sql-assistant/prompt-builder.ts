import { buildSchemaCatalogPrompt } from "@/lib/sql-assistant/schema-catalog"
import type {
  SqlAssistantContext,
  SqlExecutionResult,
} from "@/lib/sql-assistant/types"

function formatContextLine(label: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return `- ${label}: none`
  }

  return `- ${label}: ${value}`
}

function serializeResultPreview(result: SqlExecutionResult) {
  return JSON.stringify(
    {
      rowCount: result.rowCount,
      truncated: result.truncated,
      notices: result.notices,
      columns: result.columns,
      rows: result.rows,
    },
    null,
    2
  )
}

export function buildSqlPlanningPrompt(options: {
  prompt: string
  context: SqlAssistantContext
  modelName: string
}) {
  const { prompt, context, modelName } = options

  return [
    `You are the local Ollama model '${modelName}' operating inside a PostgreSQL World Cup operations workspace.`,
    "Your one and only mission is to help the operator retrieve information from the database by planning exactly one read-only SQL query when needed.",
    "Return exactly one JSON object and nothing else.",
    "",
    'Required JSON shape: {"assistantMessage": string, "sql": string | null, "clarification": string | null, "warnings": string[], "confidence": number}',
    "",
    "Planning rules:",
    "- You are not a general chatbot. Your role is to decide whether a database query is needed and propose it.",
    "- Produce one read-only PostgreSQL statement only when the request can be answered from the database.",
    "- The SQL must target the world_cup schema and prefer curated reporting surfaces when they fit.",
    "- Allowed statement forms: SELECT or WITH ... SELECT.",
    "- Never emit comments, markdown fences, transaction commands, DDL, DML, GRANT/REVOKE, COPY, or admin commands.",
    "- assistantMessage must briefly explain what the query is intended to retrieve for the operator.",
    "- If the request is ambiguous or underspecified, set sql to null and provide a concise clarification question grounded in the World Cup domain.",
    "- warnings should contain zero or more short review notes for the operator.",
    "- confidence must be a number between 0 and 1.",
    "- Keep SQL inspectable and operational, not conversational.",
    "",
    "Current dashboard context:",
    formatContextLine("section", context.section),
    formatContextLine("edition_id", context.editionId),
    formatContextLine("edition_year", context.editionYear),
    formatContextLine("team_id", context.teamId),
    formatContextLine("match_id", context.matchId),
    formatContextLine("group_id", context.groupId),
    "",
    buildSchemaCatalogPrompt(),
    "",
    "User request:",
    prompt.trim(),
  ].join("\n")
}

export function buildSqlResultSummaryPrompt(options: {
  prompt: string
  context: SqlAssistantContext
  modelName: string
  sql: string
  result: SqlExecutionResult
}) {
  const { prompt, context, modelName, sql, result } = options

  return [
    `You are the local Ollama model '${modelName}' summarizing the observed result of an already executed PostgreSQL query.`,
    "Reply with plain text only.",
    "Your summary must stay grounded in the actual query output below.",
    "- Do not invent facts that are not present in the result rows.",
    "- Do not mention hidden reasoning, policies, or the prompt.",
    "- If the result is empty, say that the query returned no rows.",
    "- Keep the answer concise and operator-focused.",
    "",
    "Original user request:",
    prompt.trim(),
    "",
    "Dashboard context:",
    formatContextLine("section", context.section),
    formatContextLine("edition_id", context.editionId),
    formatContextLine("edition_year", context.editionYear),
    formatContextLine("team_id", context.teamId),
    formatContextLine("match_id", context.matchId),
    formatContextLine("group_id", context.groupId),
    "",
    "Executed SQL:",
    sql.trim(),
    "",
    "Observed result payload:",
    serializeResultPreview(result),
  ].join("\n")
}

export function formatModelPrompt(prompt: string) {
  return prompt.trim()
}
