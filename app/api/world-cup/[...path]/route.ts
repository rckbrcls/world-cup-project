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

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const headers = new Headers({
    accept: "application/json",
  })
  const contentType = request.headers.get("content-type")

  if (contentType) {
    headers.set("content-type", contentType)
  }

  try {
    const response = await fetch(buildBackendUrl(path, request), {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.text(),
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

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context)
}
