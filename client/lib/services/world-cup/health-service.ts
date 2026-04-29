import type { ApiHealth } from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function getHealth(options?: RequestOptions) {
  return requestJson<ApiHealth>("/health", options)
}
