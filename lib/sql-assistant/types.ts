export type GemmaEngineLifecycle =
  | "unavailable"
  | "unsupported"
  | "not-downloaded"
  | "ready-to-download"
  | "downloading"
  | "paused"
  | "download-error"
  | "initializing"
  | "warming"
  | "ready"
  | "fallback"

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

export type GemmaModelManifest = {
  id: string
  label: string
  variant: string
  downloadUrl: string
  expectedBytes: number
  minBrowserCapabilities: {
    requiresWebGpu: boolean
    requiresSecureContext: boolean
    recommendedDeviceMemoryGb: number
    recommendedAvailableStorageBytes: number
  }
  recommendedMemoryNotes: string
}

export type GemmaCapabilitySnapshot = {
  hasWebGpu: boolean
  isSecureContext: boolean
  cacheStorageAvailable: boolean
  storageManagerAvailable: boolean
  quotaBytes: number | null
  usageBytes: number | null
  availableStorageBytes: number | null
  deviceMemoryGb: number | null
  hardwareConcurrency: number | null
}

export type GemmaEnvironmentReport = {
  lifecycle: GemmaEngineLifecycle
  summary: string
  detail: string
  isOnDevice: boolean
  hasStoredModel: boolean
  capabilities: GemmaCapabilitySnapshot
  notices: string[]
}

export type SqlDraft = {
  rawResponse: string
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
  scope:
    | "environment"
    | "download"
    | "initialization"
    | "generation"
    | "validation"
    | "execution"
  message: string
  detail?: string
  recoverable: boolean
}

export type NaturalQueryExecutionRequest = {
  sql: string
}

