import type { EditionSummary } from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function listEditions(options?: RequestOptions) {
  return requestJson<EditionSummary[]>("/editions", options)
}
