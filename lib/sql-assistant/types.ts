export type NaturalQueryProviderStatus = "ready" | "unavailable"

export type GemmaModelTier = "recommended" | "experimental"

export type GemmaModelStability = "stable" | "experimental" | "known-issue"

export type GemmaPromptStyle = "gemma-3-chat" | "plain-json"

export type GemmaEngineLifecycle =
  | "unavailable"
  | "unsupported"
  | "not-downloaded"
  | "ready-to-download"
  | "downloaded"
  | "downloading"
  | "paused"
  | "download-error"
  | "initializing"
  | "warming"
  | "ready"
  | "fallback"

export type GemmaInitializationStage =
  | "loading-runtime"
  | "loading-wasm"
  | "creating-engine"
  | "warming"

export type GemmaModelManifest = {
  id: string
  label: string
  family: string
  variant: string
  tier: GemmaModelTier
  stability: GemmaModelStability
  promptStyle: GemmaPromptStyle
  description: string
  statusNote: string
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

export type GemmaModelAssessment = {
  tier: GemmaModelTier
  stability: GemmaModelStability
  knownIssueReason: string | null
  detail: string | null
  isBlocked: boolean
}

export type GemmaEnvironmentReport = {
  lifecycle: GemmaEngineLifecycle
  reason: string
  summary: string
  detail: string
  isOnDevice: boolean
  hasStoredModel: boolean
  capabilities: {
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
  notices: string[]
}

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
  scope: "environment" | "generation" | "validation" | "execution"
  reason?: string
  stage?: GemmaInitializationStage | null
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
