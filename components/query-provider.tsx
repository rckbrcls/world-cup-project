"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
        gcTime: 600_000,
      },
    },
  })
}

let browserQueryClient: QueryClient | null = null

function getQueryClient() {
  if (typeof window === "undefined") {
    return createQueryClient()
  }

  if (browserQueryClient === null) {
    browserQueryClient = createQueryClient()
  }

  return browserQueryClient
}

export function QueryProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [queryClient] = React.useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
