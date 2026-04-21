"use client"

import * as React from "react"

import { useHealthQuery } from "@/hooks/world-cup/queries/use-health-query"
import {
  useApplyReportingQueriesMutation,
  useCleanupDatabaseMutation,
  useDatabaseStatusQuery,
  useInitializeDatabaseMutation,
  usePopulateDatabaseMutation,
} from "@/hooks/world-cup/queries/use-database-queries"
import { getErrorMessage } from "@/hooks/world-cup/queries/query-utils"
import type { DatabaseOperationResult } from "@/lib/world-cup/types"

type DatabaseAction = "initialize" | "reporting" | "populate" | "cleanup"

export function useDatabaseSectionData() {
  const health = useHealthQuery()
  const databaseStatus = useDatabaseStatusQuery()
  const initializeMutation = useInitializeDatabaseMutation()
  const reportingMutation = useApplyReportingQueriesMutation()
  const populateMutation = usePopulateDatabaseMutation()
  const cleanupMutation = useCleanupDatabaseMutation()
  const [databaseMutationErrorMessage, setDatabaseMutationErrorMessage] =
    React.useState<string | null>(null)

  const runMutation = React.useCallback(
    async (
      callback: () => Promise<DatabaseOperationResult>,
      fallbackMessage: string
    ) => {
      setDatabaseMutationErrorMessage(null)

      try {
        return await callback()
      } catch (error) {
        setDatabaseMutationErrorMessage(
          getErrorMessage(error) ?? fallbackMessage
        )
        throw error
      }
    },
    []
  )

  const initializeDatabase = React.useCallback(
    () =>
      runMutation(
        () => initializeMutation.mutateAsync(),
        "Unable to initialize the database."
      ),
    [initializeMutation, runMutation]
  )

  const applyReportingQueries = React.useCallback(
    () =>
      runMutation(
        () => reportingMutation.mutateAsync(),
        "Unable to apply the reporting queries."
      ),
    [reportingMutation, runMutation]
  )

  const populateSyntheticData = React.useCallback(
    () =>
      runMutation(
        () => populateMutation.mutateAsync(),
        "Unable to populate the synthetic dataset."
      ),
    [populateMutation, runMutation]
  )

  const removeSyntheticData = React.useCallback(
    () =>
      runMutation(
        () => cleanupMutation.mutateAsync(),
        "Unable to remove the synthetic dataset."
      ),
    [cleanupMutation, runMutation]
  )

  const databaseMutationAction: DatabaseAction | null =
    initializeMutation.isPending
      ? "initialize"
      : reportingMutation.isPending
        ? "reporting"
        : populateMutation.isPending
          ? "populate"
          : cleanupMutation.isPending
            ? "cleanup"
            : null

  return {
    health,
    databaseStatus,
    databaseMutation: {
      action: databaseMutationAction,
      errorMessage: databaseMutationErrorMessage,
      isPending: databaseMutationAction !== null,
    },
    initializeDatabase,
    applyReportingQueries,
    populateSyntheticData,
    removeSyntheticData,
  }
}
