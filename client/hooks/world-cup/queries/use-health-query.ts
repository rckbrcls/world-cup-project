"use client"

import { useQuery } from "@tanstack/react-query"

import { getHealth } from "@/lib/services/world-cup/health-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import type { ApiHealth } from "@/lib/world-cup/types"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useHealthQuery() {
  const query = useQuery<ApiHealth | null>({
    queryKey: worldCupQueryKeys.health(),
    queryFn: ({ signal }) => getHealth({ signal }),
    staleTime: 15_000,
  })

  return toQueryResource(query, null as ApiHealth | null)
}
