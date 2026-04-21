export type NaturalQueryProviderStatus = "ready" | "unavailable"

export type SqlGenerationState =
  | "idle"
  | "generating"
  | "success"
  | "error"
  | "canceled"

export type SqlExecutionState =
  | "idle"
  | "validating"
  | "running"
  | "success"
  | "empty"
  | "error"
  | "canceled"

export type SqlAssistantContext = {
  section: string
  editionId: number | null
  editionYear: number | null
  teamId?: number | null
  matchId?: number | null
  groupId?: number | null
}

export type SqlResultCell = string | number | boolean | null

export type SqlResultRow = Record<string, SqlResultCell>

export type NaturalQueryProviderState = {
  provider: "ollama"
  baseUrl: string
  model: string
  status: NaturalQueryProviderStatus
  summary: string
  detail: string
}

export type SqlDraft = {
  rawResponse: string
  assistantMessage: string | null
  generatedSql: string | null
  previewSql: string | null
  normalizedSql: string | null
  clarification: string | null
  warnings: string[]
  validationIssues: string[]
  confidence: number | null
  isExecutable: boolean
}

export type SqlExecutionResult = {
  columns: string[]
  rows: SqlResultRow[]
  rowCount: number
  truncated: boolean
  notices: string[]
}

export type SqlAssistantFailure = {
  scope: "environment" | "generation" | "validation" | "execution" | "summary"
  reason?: string
  message: string
  detail?: string
  recoverable: boolean
}

export type NaturalQueryGenerateRequest = {
  prompt: string
}

export type NaturalQueryGenerateResponse = {
  model: string
  rawResponse: string
}

export type NaturalQueryExecutionRequest = {
  sql: string
}

export type SqlProposalState =
  | "pending-approval"
  | "dismissed"
  | "executing"
  | "executed"
  | "failed"
  | "canceled"

export type SqlExecutionCardState =
  | "executing"
  | "success"
  | "empty"
  | "error"
  | "canceled"

type SqlAssistantThreadEntryBase = {
  id: string
  createdAt: string
}

export type SqlAssistantUserMessageEntry = SqlAssistantThreadEntryBase & {
  kind: "user-message"
  text: string
}

export type SqlAssistantMessageEntry = SqlAssistantThreadEntryBase & {
  kind: "assistant-message"
  text: string
}

export type SqlAssistantSystemStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "destructive"

export type SqlAssistantSystemStatusEntry = SqlAssistantThreadEntryBase & {
  kind: "system-status"
  tone: SqlAssistantSystemStatusTone
  title: string
  detail: string
}

export type SqlAssistantSqlProposalEntry = SqlAssistantThreadEntryBase & {
  kind: "sql-proposal-card"
  proposalState: SqlProposalState
  userPrompt: string
  context: SqlAssistantContext
  draft: SqlDraft
}

export type SqlAssistantExecutionResultEntry = SqlAssistantThreadEntryBase & {
  kind: "execution-result-card"
  proposalId: string
  state: SqlExecutionCardState
  sql: string
  result: SqlExecutionResult | null
  errorMessage: string | null
}

export type SqlAssistantThreadEntry =
  | SqlAssistantUserMessageEntry
  | SqlAssistantMessageEntry
  | SqlAssistantSystemStatusEntry
  | SqlAssistantSqlProposalEntry
  | SqlAssistantExecutionResultEntry
