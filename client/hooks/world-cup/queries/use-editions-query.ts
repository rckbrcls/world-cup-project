"use client"

import { useQuery } from "@tanstack/react-query"

import { listEditions } from "@/lib/services/world-cup/editions-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useEditionsQuery(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: worldCupQueryKeys.editions(),
    queryFn: ({ signal }) => listEditions({ signal }),
    enabled: options?.enabled ?? true,
  })

  return toQueryResource(query, [])
}
