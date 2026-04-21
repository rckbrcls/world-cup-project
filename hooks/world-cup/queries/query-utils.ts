import type {
  QueryObserverResult,
  UseQueryResult,
} from "@tanstack/react-query"

export type QueryResource<TData, TError = Error> = Omit<
  UseQueryResult<TData, TError>,
  "data" | "isLoading" | "refetch"
> & {
  data: TData
  errorMessage: string | null
  reload: () => Promise<QueryObserverResult<TData, TError>>
  isLoading: boolean
  isRefreshing: boolean
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return null
}

export function toQueryResource<TData, TError>(
  query: UseQueryResult<TData, TError>,
  fallbackData: TData
): QueryResource<TData, TError> {
  return {
    ...query,
    data: query.data ?? fallbackData,
    errorMessage: getErrorMessage(query.error),
    reload: () => query.refetch(),
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
  }
}
