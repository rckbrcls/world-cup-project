"use client"

import * as React from "react"

type AsyncStatus = "idle" | "loading" | "success" | "error"

type AsyncResourceOptions<TData> = {
  key: ReadonlyArray<string | number | boolean | null | undefined>
  enabled?: boolean
  initialData: TData
  load: (signal: AbortSignal) => Promise<TData>
}

type AsyncResourceState<TData> = {
  status: AsyncStatus
  data: TData
  errorMessage: string | null
  hasFetched: boolean
  keySignature: string | null
}

export function useAsyncResource<TData>({
  key,
  enabled = true,
  initialData,
  load,
}: AsyncResourceOptions<TData>) {
  const [stableInitialData] = React.useState(() => initialData)
  const runLoad = React.useEffectEvent(load)
  const keySignature = key.map((value) => String(value ?? "__null__")).join("::")
  const [reloadToken, setReloadToken] = React.useState(0)
  const [state, setState] = React.useState<AsyncResourceState<TData>>({
    status: enabled ? "loading" : "idle",
    data: stableInitialData,
    errorMessage: null,
    hasFetched: false,
    keySignature: enabled ? keySignature : null,
  })

  const reload = React.useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()

    queueMicrotask(() => {
      if (controller.signal.aborted) {
        return
      }

      setState((previous) => ({
        ...previous,
        status: "loading",
        data:
          previous.keySignature !== keySignature
            ? stableInitialData
            : previous.data,
        errorMessage: null,
        hasFetched:
          previous.keySignature !== keySignature ? false : previous.hasFetched,
        keySignature,
      }))
    })

    runLoad(controller.signal)
      .then((data) => {
        setState({
          status: "success",
          data,
          errorMessage: null,
          hasFetched: true,
          keySignature,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown data loading error."

        setState((previous) => ({
          status: "error",
          data:
            previous.keySignature === keySignature && previous.hasFetched
              ? previous.data
              : stableInitialData,
          errorMessage,
          hasFetched:
            previous.keySignature === keySignature ? previous.hasFetched : false,
          keySignature,
        }))
      })

    return () => {
      controller.abort()
    }
  }, [enabled, keySignature, reloadToken, stableInitialData])

  const effectiveState =
    !enabled
      ? {
          status: "idle" as const,
          data: stableInitialData,
          errorMessage: null,
          hasFetched: false,
          keySignature: null,
        }
      : state.keySignature === keySignature
        ? state
        : {
            status: "loading" as const,
            data: stableInitialData,
            errorMessage: null,
            hasFetched: false,
            keySignature,
          }

  return {
    ...effectiveState,
    reload,
    isIdle: effectiveState.status === "idle",
    isLoading: effectiveState.status === "loading" && !effectiveState.hasFetched,
    isRefreshing:
      effectiveState.status === "loading" && effectiveState.hasFetched,
    isSuccess: effectiveState.status === "success",
    isError: effectiveState.status === "error",
  }
}
