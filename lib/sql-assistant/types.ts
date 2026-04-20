export type ModelStatus =
  | "unavailable"
  | "not-downloaded"
  | "downloading"
  | "initializing"
  | "ready"
  | "processing"
  | "error"
  | "fallback"

export type SqlAssistantStatus = {
  modelName: "Gemma 4"
  status: ModelStatus
  summary: string
  detail?: string
}

export type SqlAssistantContext = {
  section: string
  editionId: number | null
  editionYear: number | null
  teamId?: number | null
  matchId?: number | null
  groupId?: number | null
}

export type SqlGenerationRequest = {
  prompt: string
  context: SqlAssistantContext
}

export type SqlResultRow = Record<string, string | number | boolean | null>

export type SqlGenerationResponse = {
  status: ModelStatus
  generatedSql: string | null
  resultColumns: string[]
  resultRows: SqlResultRow[]
  notices: string[]
  errorMessage: string | null
}
