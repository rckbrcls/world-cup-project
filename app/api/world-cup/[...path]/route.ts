import { NextRequest } from "next/server"

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000"

function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    DEFAULT_BACKEND_BASE_URL
  )
}

function buildBackendUrl(path: string[], request: NextRequest) {
  const pathname = path.join("/")
  const search = request.nextUrl.search

  return `${getBackendBaseUrl()}/${pathname}${search}`
}

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params

  try {
    const response = await fetch(buildBackendUrl(path, request), {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    })
  } catch {
    return Response.json(
      {
        detail:
          "Unable to reach the FastAPI backend from the frontend proxy route.",
      },
      { status: 503 }
    )
  }
}
