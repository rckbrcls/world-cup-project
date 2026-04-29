"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  applyReportingQueries,
  cleanupDatabase,
  getDatabaseStatus,
  initializeDatabase,
  populateDatabase,
} from "@/lib/services/world-cup/database-service"
import { worldCupQueryKeys } from "@/lib/world-cup/query-keys"
import type { DatabaseStatus } from "@/lib/world-cup/types"
import { toQueryResource } from "@/hooks/world-cup/queries/query-utils"

export function useDatabaseStatusQuery() {
  const query = useQuery<DatabaseStatus | null>({
    queryKey: worldCupQueryKeys.databaseStatus(),
    queryFn: ({ signal }) => getDatabaseStatus({ signal }),
    staleTime: 15_000,
  })

  return toQueryResource(query, null as DatabaseStatus | null)
}

function useInvalidateWorldCupData() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({
      queryKey: worldCupQueryKeys.all,
    })
  }
}

export function useInitializeDatabaseMutation() {
  const invalidateWorldCupData = useInvalidateWorldCupData()

  return useMutation({
    mutationFn: () => initializeDatabase(),
    onSuccess: invalidateWorldCupData,
  })
}

export function useApplyReportingQueriesMutation() {
  const invalidateWorldCupData = useInvalidateWorldCupData()

  return useMutation({
    mutationFn: () => applyReportingQueries(),
    onSuccess: invalidateWorldCupData,
  })
}

export function usePopulateDatabaseMutation() {
  const invalidateWorldCupData = useInvalidateWorldCupData()

  return useMutation({
    mutationFn: () => populateDatabase(),
    onSuccess: invalidateWorldCupData,
  })
}

export function useCleanupDatabaseMutation() {
  const invalidateWorldCupData = useInvalidateWorldCupData()

  return useMutation({
    mutationFn: () => cleanupDatabase(),
    onSuccess: invalidateWorldCupData,
  })
}
