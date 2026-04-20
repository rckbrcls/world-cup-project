import type { SqlAssistantAdapter } from "@/lib/sql-assistant/adapter"
import type {
  SqlAssistantStatus,
  SqlGenerationRequest,
  SqlGenerationResponse,
} from "@/lib/sql-assistant/types"

const fallbackStatus: SqlAssistantStatus = {
  modelName: "Gemma 4",
  status: "fallback",
  summary: "Local model pipeline not connected",
  detail:
    "Gemma 4 is planned as the primary local engine, but this build only ships the UI and adapter contract.",
}

export class StubSqlAssistantAdapter implements SqlAssistantAdapter {
  async getStatus(signal?: AbortSignal) {
    void signal
    return fallbackStatus
  }

  async generateSql(request: SqlGenerationRequest, signal?: AbortSignal) {
    void request
    void signal
    return {
      status: "fallback",
      generatedSql: null,
      resultColumns: [],
      resultRows: [],
      notices: [
        "Gemma 4 integration is not available yet.",
        "The SQL preview remains empty until the real local engine is connected.",
      ],
      errorMessage:
        "Natural query is prepared in the UI, but the model execution layer is not implemented yet.",
    } satisfies SqlGenerationResponse
  }
}

export const sqlAssistantAdapter = new StubSqlAssistantAdapter()
