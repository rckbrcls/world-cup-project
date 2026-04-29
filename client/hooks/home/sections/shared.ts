"use client"

import * as React from "react"

import { useDatabaseStatusQuery } from "@/hooks/world-cup/queries/use-database-queries"
import { useEditionsQuery } from "@/hooks/world-cup/queries/use-editions-query"

export function useEditionWorkspaceData(selectedEditionId: number | null) {
  const databaseStatus = useDatabaseStatusQuery()
  const databaseReady = databaseStatus.data?.reporting_layer_ready ?? false
  const editions = useEditionsQuery({
    enabled: databaseReady,
  })

  const selectedEdition = React.useMemo(
    () =>
      editions.data.find((edition) => edition.edition_id === selectedEditionId) ??
      null,
    [editions.data, selectedEditionId]
  )

  return {
    databaseStatus,
    databaseReady,
    editions,
    selectedEdition,
  }
}
