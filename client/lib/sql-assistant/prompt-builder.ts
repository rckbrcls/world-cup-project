import { buildSchemaCatalogPrompt } from "@/lib/sql-assistant/schema-catalog"
import type {
  NaturalQueryRepairContext,
  SqlAssistantContext,
  SqlPlanningHistory,
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

function formatHistoryLine(label: string, value: string | null) {
  if (!value) {
    return `- ${label}: none`
  }

  return `- ${label}: ${value}`
}

export function buildSqlPlanningPrompt(options: {
  prompt: string
  context: SqlAssistantContext
  history: SqlPlanningHistory
  modelName: string
}) {
  const { prompt, context, history, modelName } = options

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
    "- The SQL must target the world_cup schema and prefer curated reporting surfaces whenever they fit the request.",
    "- Allowed statement forms: SELECT or WITH ... SELECT.",
    "- The caller enforces a JSON schema, so every field in the response must match the required shape exactly.",
    "- Never emit comments, markdown fences, transaction commands, DDL, DML, GRANT/REVOKE, COPY, or admin commands.",
    "- If a curated SQL function or view answers the request, use it instead of recreating joins manually.",
    "- Prefer approved reporting functions and views first. Only compose raw joins when no curated surface fits the request.",
    "- Do not invent columns, table names, or event labels that are not present in the schema catalog below.",
    "- Do not reference aliases outside their valid SQL scope.",
    "- When aggregating the output of a function, use the exact returned columns from that function signature.",
    "- If the request needs an identifier that is missing from the current context, ask for clarification instead of guessing IDs.",
    "- Resolve short follow-up requests by using the recent drawer history below before asking for clarification.",
    "- Treat 'latest edition' or 'last edition' as the edition with the highest edition_year unless the operator explicitly says otherwise.",
    "- When an ID is missing but can be derived safely, use a nested SELECT against an approved reporting surface instead of guessing.",
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
    "Recent drawer history:",
    formatHistoryLine("last_user_request", history.lastUserPrompt),
    formatHistoryLine("last_assistant_message", history.lastAssistantMessage),
    formatHistoryLine(
      "last_sql_proposal",
      history.lastSqlProposal
        ? `${history.lastSqlProposal.state}: ${history.lastSqlProposal.sql}`
        : null
    ),
    "",
    buildSchemaCatalogPrompt(),
    "",
    "User request:",
    prompt.trim(),
  ].join("\n")
}

export function buildSqlRepairPrompt(options: {
  prompt: string
  context: SqlAssistantContext
  repair: NaturalQueryRepairContext
  modelName: string
}) {
  const { prompt, context, repair, modelName } = options

  return [
    `You are the local Ollama model '${modelName}' repairing one PostgreSQL SQL proposal inside a World Cup operations workspace.`,
    "Return exactly one JSON object and nothing else.",
    "",
    'Required JSON shape: {"assistantMessage": string, "sql": string | null, "clarification": string | null, "warnings": string[], "confidence": number}',
    "",
    "Repair rules:",
    "- Preserve the original operator intent.",
    "- Produce exactly one read-only PostgreSQL statement only when you can repair it safely.",
    "- Prefer approved reporting functions and views first. Only compose raw joins when no curated surface fits the request.",
    "- Use the PostgreSQL failure feedback below to correct the SQL instead of repeating it.",
    "- Do not repeat alias scoping mistakes, invented columns, guessed IDs, or unavailable schema objects.",
    "- If a safe repair is not possible, set sql to null and ask one concise clarification question.",
    "- assistantMessage must briefly explain the repaired query.",
    "- warnings should contain zero or more short review notes for the operator.",
    "- confidence must be a number between 0 and 1.",
    "",
    "Original operator request:",
    prompt.trim(),
    "",
    "Current dashboard context:",
    formatContextLine("section", context.section),
    formatContextLine("edition_id", context.editionId),
    formatContextLine("edition_year", context.editionYear),
    formatContextLine("team_id", context.teamId),
    formatContextLine("match_id", context.matchId),
    formatContextLine("group_id", context.groupId),
    "",
    "Failed SQL proposal:",
    repair.failingSql.trim(),
    "",
    "PostgreSQL failure feedback:",
    `- failure_scope: ${repair.failureScope}`,
    `- failure_detail: ${repair.failureDetail}`,
    "",
    buildSchemaCatalogPrompt(),
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
