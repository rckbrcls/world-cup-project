import type { GemmaModelManifest } from "@/lib/sql-assistant/types"

const MODEL_CACHE_NAME = "world-cup-gemma-models-v1"
const MODEL_METADATA_PREFIX = "world-cup.sql-assistant.model"

type StoredGemmaModelMetadata = {
  modelId: string
  variant: string
  downloadedAt: string
  sourceUrl: string
  expectedBytes: number
}

function getMetadataStorageKey(modelId: string) {
  return `${MODEL_METADATA_PREFIX}:${modelId}`
}

function getCacheRequest(modelId: string) {
  if (typeof window === "undefined") {
    throw new Error("Model cache requests are only available in the browser.")
  }

  return new Request(`${window.location.origin}/__gemma-models/${modelId}`)
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

async function getModelCache() {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache storage is not available in this browser.")
  }

  return window.caches.open(MODEL_CACHE_NAME)
}

export function readStoredModelMetadata(
  manifest: GemmaModelManifest
): StoredGemmaModelMetadata | null {
  const storage = getLocalStorage()
  if (!storage) {
    return null
  }

  const rawValue = storage.getItem(getMetadataStorageKey(manifest.id))
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredGemmaModelMetadata

    if (parsed.modelId !== manifest.id) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeStoredModelMetadata(
  manifest: GemmaModelManifest,
  metadata: StoredGemmaModelMetadata
) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  storage.setItem(getMetadataStorageKey(manifest.id), JSON.stringify(metadata))
}

function removeStoredModelMetadata(manifest: GemmaModelManifest) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  storage.removeItem(getMetadataStorageKey(manifest.id))
}

export async function hasStoredModelArtifact(manifest: GemmaModelManifest) {
  try {
    const cache = await getModelCache()
    const response = await cache.match(getCacheRequest(manifest.id))

    return Boolean(response && readStoredModelMetadata(manifest))
  } catch {
    return false
  }
}

export async function clearStoredModelArtifact(manifest: GemmaModelManifest) {
  try {
    const cache = await getModelCache()
    await cache.delete(getCacheRequest(manifest.id))
  } finally {
    removeStoredModelMetadata(manifest)
  }
}

export async function readStoredModelBlob(
  manifest: GemmaModelManifest
): Promise<Blob | null> {
  try {
    const cache = await getModelCache()
    const response = await cache.match(getCacheRequest(manifest.id))

    if (!response) {
      return null
    }

    return await response.blob()
  } catch {
    return null
  }
}

export async function cacheDownloadedModel(options: {
  manifest: GemmaModelManifest
  signal?: AbortSignal
  onProgress?: (payload: {
    downloadedBytes: number
    totalBytes: number | null
    percent: number | null
  }) => void
}) {
  const { manifest, signal, onProgress } = options

  const response = await fetch(manifest.downloadUrl, {
    cache: "no-store",
    mode: "cors",
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error("The Gemma 4 model download could not be started.")
  }

  const totalBytesHeader = response.headers.get("content-length")
  const totalBytes = totalBytesHeader
    ? Number(totalBytesHeader)
    : manifest.expectedBytes
  const cache = await getModelCache()
  const request = getCacheRequest(manifest.id)
  const [progressStream, cacheStream] = response.body.tee()
  const cachePromise = cache.put(
    request,
    new Response(cacheStream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  )
  const reader = progressStream.getReader()
  let downloadedBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      downloadedBytes += value.byteLength

      onProgress?.({
        downloadedBytes,
        totalBytes,
        percent:
          totalBytes > 0
            ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            : null,
      })
    }

    await cachePromise
    writeStoredModelMetadata(manifest, {
      modelId: manifest.id,
      variant: manifest.variant,
      downloadedAt: new Date().toISOString(),
      sourceUrl: manifest.downloadUrl,
      expectedBytes: manifest.expectedBytes,
    })
  } catch (error) {
    await cache.delete(request)
    removeStoredModelMetadata(manifest)
    throw error
  } finally {
    reader.releaseLock()
  }
}
