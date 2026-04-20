import type {
  SqlAssistantStatus,
  SqlGenerationRequest,
  SqlGenerationResponse,
} from "@/lib/sql-assistant/types"

export interface SqlAssistantAdapter {
  getStatus(signal?: AbortSignal): Promise<SqlAssistantStatus>
  generateSql(
    request: SqlGenerationRequest,
    signal?: AbortSignal
  ): Promise<SqlGenerationResponse>
}
