export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly path: string
  ) {
    super(message)
    this.name = "ApiRequestError"
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

const WORLD_CUP_PROXY_BASE = "/api/world-cup"

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
) {
  const headers: Record<string, string> = {
    accept: "application/json",
  }
  const requestMethod = options.method ?? "GET"

  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
  }

  const response = await fetch(`${WORLD_CUP_PROXY_BASE}${path}`, {
    method: requestMethod,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: options.signal,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload.detail) {
        message = payload.detail
      }
    } catch {
      // Ignore invalid JSON payloads and surface the default error message.
    }

    throw new ApiRequestError(message, response.status, path)
  }

  return (await response.json()) as T
}
