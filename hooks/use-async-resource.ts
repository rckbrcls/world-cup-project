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
}

export function useAsyncResource<TData>({
  key,
  enabled = true,
  initialData,
  load,
}: AsyncResourceOptions<TData>) {
  const stableInitialData = React.useRef(initialData).current
  const loadRef = React.useRef(load)
  const [reloadToken, setReloadToken] = React.useState(0)
  const [state, setState] = React.useState<AsyncResourceState<TData>>({
    status: enabled ? "loading" : "idle",
    data: stableInitialData,
    errorMessage: null,
    hasFetched: false,
  })

  React.useEffect(() => {
    loadRef.current = load
  }, [load])

  const reload = React.useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      setState({
        status: "idle",
        data: stableInitialData,
        errorMessage: null,
        hasFetched: false,
      })
      return
    }

    const controller = new AbortController()

    setState((previous) => ({
      ...previous,
      status: "loading",
      errorMessage: null,
    }))

    loadRef.current(controller.signal)
      .then((data) => {
        setState({
          status: "success",
          data,
          errorMessage: null,
          hasFetched: true,
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
          data: previous.hasFetched ? previous.data : stableInitialData,
          errorMessage,
          hasFetched: previous.hasFetched,
        }))
      })

    return () => {
      controller.abort()
    }
  }, [enabled, reloadToken, stableInitialData, ...key])

  return {
    ...state,
    reload,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading" && !state.hasFetched,
    isRefreshing: state.status === "loading" && state.hasFetched,
    isSuccess: state.status === "success",
    isError: state.status === "error",
  }
}
