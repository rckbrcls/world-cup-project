import {
  cacheDownloadedModel,
  hasStoredModelArtifact,
  readStoredModelBlob,
} from "@/lib/sql-assistant/gemma-storage"
import type {
  GemmaEnvironmentReport,
  GemmaModelManifest,
} from "@/lib/sql-assistant/types"

const GEMMA_TASKS_GENAI_VERSION = "0.10.25"
const GEMMA_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@${GEMMA_TASKS_GENAI_VERSION}/wasm`

type BrowserNavigator = Navigator & {
  gpu?: object
  deviceMemory?: number
}

type MediaPipeTasksGenAiModule = {
  FilesetResolver: {
    forGenAiTasks(wasmRoot: string): Promise<unknown>
  }
  LlmInference: {
    createFromOptions(
      filesetResolver: unknown,
      options: Record<string, unknown>
    ): Promise<GemmaInferenceHandle>
  }
}

type GemmaInferenceHandle = {
  generateResponse(prompt: string): Promise<string> | string
  close?: () => void
}

type GemmaRuntime = {
  manifestId: string
  inference: GemmaInferenceHandle
  modelObjectUrl: string
  warmed: boolean
}

let gemmaRuntime: GemmaRuntime | null = null

export const defaultGemmaModelManifest: GemmaModelManifest = {
  id: "gemma-4-e2b-web",
  label: "Gemma 4 E2B",
  variant: "E2B Web",
  downloadUrl:
    "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task?download=true",
  expectedBytes: 2_147_483_648,
  minBrowserCapabilities: {
    requiresWebGpu: true,
    requiresSecureContext: true,
    recommendedDeviceMemoryGb: 8,
    recommendedAvailableStorageBytes: 2_600_000_000,
  },
  recommendedMemoryNotes:
    "Gemma 4 E2B is the default browser-local profile because it stays more viable on typical hardware while preserving Gemma 4 as the primary on-device engine.",
}

export const secondaryGemmaModelManifest: GemmaModelManifest = {
  id: "gemma-4-e4b-web",
  label: "Gemma 4 E4B",
  variant: "E4B Web",
  downloadUrl:
    "https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.task?download=true",
  expectedBytes: 2_964_324_352,
  minBrowserCapabilities: {
    requiresWebGpu: true,
    requiresSecureContext: true,
    recommendedDeviceMemoryGb: 16,
    recommendedAvailableStorageBytes: 3_600_000_000,
  },
  recommendedMemoryNotes:
    "Gemma 4 E4B can be enabled later for stronger local inference on high-memory devices.",
}

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Gemma 4 local inference is only available in the browser.")
  }
}

function createEnvironmentErrorReport(
  manifest: GemmaModelManifest,
  options: Pick<GemmaEnvironmentReport, "lifecycle" | "summary" | "detail">
): GemmaEnvironmentReport {
  return {
    lifecycle: options.lifecycle,
    summary: options.summary,
    detail: options.detail,
    isOnDevice: true,
    hasStoredModel: false,
    capabilities: {
      hasWebGpu: false,
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
      cacheStorageAvailable: typeof window !== "undefined" && "caches" in window,
      storageManagerAvailable:
        typeof navigator !== "undefined" && "storage" in navigator,
      quotaBytes: null,
      usageBytes: null,
      availableStorageBytes: null,
      deviceMemoryGb: null,
      hardwareConcurrency: null,
    },
    notices: [manifest.recommendedMemoryNotes],
  }
}

export function getGemmaRuntimeSnapshot(manifest: GemmaModelManifest) {
  return {
    isInitialized: gemmaRuntime?.manifestId === manifest.id,
    isWarmed: gemmaRuntime?.manifestId === manifest.id && gemmaRuntime.warmed,
  }
}

async function loadMediaPipeTasksGenAiModule() {
  const importedModule =
    (await import("@mediapipe/tasks-genai")) as unknown as MediaPipeTasksGenAiModule

  return importedModule
}

export async function detectGemmaEnvironment(
  manifest: GemmaModelManifest
): Promise<GemmaEnvironmentReport> {
  if (typeof window === "undefined") {
    return createEnvironmentErrorReport(manifest, {
      lifecycle: "unavailable",
      summary: "Client runtime unavailable",
      detail:
        "Gemma 4 browser-local inference is evaluated after hydration in the browser.",
    })
  }

  const browserNavigator = navigator as BrowserNavigator
  const hasWebGpu = Boolean(browserNavigator.gpu)
  const isSecureContext = window.isSecureContext
  const cacheStorageAvailable = "caches" in window
  const storageManagerAvailable = "storage" in navigator
  let quotaBytes: number | null = null
  let usageBytes: number | null = null

  if (storageManagerAvailable) {
    try {
      const estimate = await navigator.storage.estimate()
      quotaBytes = estimate.quota ?? null
      usageBytes = estimate.usage ?? null
    } catch {
      quotaBytes = null
      usageBytes = null
    }
  }

  const availableStorageBytes =
    quotaBytes !== null && usageBytes !== null ? Math.max(0, quotaBytes - usageBytes) : null
  const deviceMemoryGb = browserNavigator.deviceMemory ?? null
  const hardwareConcurrency = navigator.hardwareConcurrency ?? null
  const hasStoredModel = await hasStoredModelArtifact(manifest)
  const notices = [manifest.recommendedMemoryNotes]

  if (deviceMemoryGb !== null && deviceMemoryGb < manifest.minBrowserCapabilities.recommendedDeviceMemoryGb) {
    notices.push(
      `This device reports about ${deviceMemoryGb} GB of memory, so Gemma 4 may initialize slowly or degrade under load.`
    )
  }

  if (hardwareConcurrency !== null && hardwareConcurrency < 4) {
    notices.push("Low CPU parallelism may slow down download preparation and SQL generation.")
  }

  if (!isSecureContext) {
    return {
      lifecycle: "unsupported",
      summary: "Secure browser context required",
      detail:
        "Gemma 4 browser-local inference requires HTTPS or a local secure context before WebGPU can be used.",
      isOnDevice: true,
      hasStoredModel,
      capabilities: {
        hasWebGpu,
        isSecureContext,
        cacheStorageAvailable,
        storageManagerAvailable,
        quotaBytes,
        usageBytes,
        availableStorageBytes,
        deviceMemoryGb,
        hardwareConcurrency,
      },
      notices,
    }
  }

  if (!hasWebGpu) {
    return {
      lifecycle: "unsupported",
      summary: "WebGPU unavailable",
      detail:
        "This browser cannot expose the WebGPU path required by Gemma 4 on-device inference.",
      isOnDevice: true,
      hasStoredModel,
      capabilities: {
        hasWebGpu,
        isSecureContext,
        cacheStorageAvailable,
        storageManagerAvailable,
        quotaBytes,
        usageBytes,
        availableStorageBytes,
        deviceMemoryGb,
        hardwareConcurrency,
      },
      notices,
    }
  }

  if (!cacheStorageAvailable) {
    return {
      lifecycle: "fallback",
      summary: "Persistent model cache unavailable",
      detail:
        "The browser does not expose Cache Storage, so the Gemma 4 model cannot be persisted locally.",
      isOnDevice: true,
      hasStoredModel,
      capabilities: {
        hasWebGpu,
        isSecureContext,
        cacheStorageAvailable,
        storageManagerAvailable,
        quotaBytes,
        usageBytes,
        availableStorageBytes,
        deviceMemoryGb,
        hardwareConcurrency,
      },
      notices,
    }
  }

  if (hasStoredModel) {
    return {
      lifecycle: "ready-to-download",
      summary: "Model cached locally",
      detail:
        "Gemma 4 E2B is already stored in this browser. Initialize the local engine to generate SQL on-device.",
      isOnDevice: true,
      hasStoredModel,
      capabilities: {
        hasWebGpu,
        isSecureContext,
        cacheStorageAvailable,
        storageManagerAvailable,
        quotaBytes,
        usageBytes,
        availableStorageBytes,
        deviceMemoryGb,
        hardwareConcurrency,
      },
      notices,
    }
  }

  if (
    availableStorageBytes !== null &&
    availableStorageBytes < manifest.minBrowserCapabilities.recommendedAvailableStorageBytes
  ) {
    notices.push(
      "Available local storage looks tight for the default Gemma 4 model download."
    )

    return {
      lifecycle: "not-downloaded",
      summary: "Local storage looks constrained",
      detail:
        "The browser is compatible, but the estimated free storage may be too small for a stable Gemma 4 download.",
      isOnDevice: true,
      hasStoredModel,
      capabilities: {
        hasWebGpu,
        isSecureContext,
        cacheStorageAvailable,
        storageManagerAvailable,
        quotaBytes,
        usageBytes,
        availableStorageBytes,
        deviceMemoryGb,
        hardwareConcurrency,
      },
      notices,
    }
  }

  return {
    lifecycle: "ready-to-download",
    summary: "Ready to download Gemma 4 E2B",
    detail:
      "This browser can download and cache the default Gemma 4 model for local SQL generation.",
    isOnDevice: true,
    hasStoredModel,
    capabilities: {
      hasWebGpu,
      isSecureContext,
      cacheStorageAvailable,
      storageManagerAvailable,
      quotaBytes,
      usageBytes,
      availableStorageBytes,
      deviceMemoryGb,
      hardwareConcurrency,
    },
    notices,
  }
}

export async function downloadGemmaModel(options: {
  manifest: GemmaModelManifest
  signal?: AbortSignal
  onProgress?: (payload: {
    downloadedBytes: number
    totalBytes: number | null
    percent: number | null
  }) => void
}) {
  ensureBrowser()
  await cacheDownloadedModel(options)
}

export async function initializeGemmaEngine(
  manifest: GemmaModelManifest,
  signal?: AbortSignal
) {
  ensureBrowser()

  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 initialization was canceled.", "AbortError")
  }

  if (gemmaRuntime?.manifestId === manifest.id) {
    return
  }

  const modelBlob = await readStoredModelBlob(manifest)
  if (!modelBlob) {
    throw new Error(
      "The cached Gemma 4 model could not be found in this browser. Download it again before initialization."
    )
  }

  const mediaPipeModule = await loadMediaPipeTasksGenAiModule()
  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 initialization was canceled.", "AbortError")
  }

  const filesetResolver = await mediaPipeModule.FilesetResolver.forGenAiTasks(
    GEMMA_WASM_ROOT
  )
  const modelObjectUrl = URL.createObjectURL(modelBlob)

  try {
    const inference = await mediaPipeModule.LlmInference.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath: modelObjectUrl,
        },
        maxTokens: 512,
        topK: 8,
        temperature: 0.1,
        randomSeed: 7,
      }
    )

    if (signal?.aborted) {
      inference.close?.()
      throw new DOMException("The Gemma 4 initialization was canceled.", "AbortError")
    }

    if (gemmaRuntime) {
      gemmaRuntime.inference.close?.()
      URL.revokeObjectURL(gemmaRuntime.modelObjectUrl)
    }

    gemmaRuntime = {
      manifestId: manifest.id,
      inference,
      modelObjectUrl,
      warmed: false,
    }
  } catch (error) {
    URL.revokeObjectURL(modelObjectUrl)
    throw error
  }
}

export async function warmGemmaEngine(manifest: GemmaModelManifest, signal?: AbortSignal) {
  if (gemmaRuntime?.manifestId !== manifest.id) {
    throw new Error("Gemma 4 must be initialized before warming.")
  }

  if (gemmaRuntime.warmed) {
    return
  }

  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 warm-up was canceled.", "AbortError")
  }

  await gemmaRuntime.inference.generateResponse(
    'Return exactly {"sql":null,"clarification":"warm-up","warnings":[],"confidence":0.01}.'
  )

  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 warm-up was canceled.", "AbortError")
  }

  gemmaRuntime.warmed = true
}

export async function generateGemmaResponse(
  manifest: GemmaModelManifest,
  prompt: string,
  signal?: AbortSignal
) {
  if (gemmaRuntime?.manifestId !== manifest.id) {
    throw new Error("Gemma 4 is not initialized in this browser.")
  }

  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 request was canceled.", "AbortError")
  }

  const response = await gemmaRuntime.inference.generateResponse(prompt)

  if (signal?.aborted) {
    throw new DOMException("The Gemma 4 request was canceled.", "AbortError")
  }

  gemmaRuntime.warmed = true

  return typeof response === "string" ? response : String(response)
}
