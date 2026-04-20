import { buildSchemaCatalogPrompt } from "@/lib/sql-assistant/schema-catalog"
import type { SqlAssistantContext } from "@/lib/sql-assistant/types"

function formatContextLine(label: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return `- ${label}: none`
  }

  return `- ${label}: ${value}`
}

export function buildSqlGenerationPrompt(options: {
  prompt: string
  context: SqlAssistantContext
}) {
  const { prompt, context } = options

  return [
    "You are Gemma 4 operating as a SQL generation engine for a PostgreSQL World Cup operations workspace.",
    "Return exactly one JSON object and nothing else.",
    "",
    'Required JSON shape: {"sql": string | null, "clarification": string | null, "warnings": string[], "confidence": number}',
    "",
    "Generation rules:",
    "- Produce one read-only PostgreSQL statement only.",
    "- The SQL must target the world_cup schema and prefer curated reporting surfaces when they fit.",
    "- Allowed statement forms: SELECT or WITH ... SELECT.",
    "- Never emit comments, markdown fences, transaction commands, DDL, DML, GRANT/REVOKE, COPY, or admin commands.",
    "- If the request is ambiguous or underspecified, set sql to null and provide a concise clarification question grounded in the World Cup domain.",
    "- warnings should contain zero or more short review notes for the operator.",
    "- confidence must be a number between 0 and 1.",
    "- Keep SQL inspectable and operational, not conversational.",
    "",
    "Current workspace selection:",
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
