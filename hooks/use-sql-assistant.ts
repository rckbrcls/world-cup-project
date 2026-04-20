"use client"

import * as React from "react"

import type { SqlAssistantAdapter } from "@/lib/sql-assistant/adapter"
import { sqlAssistantAdapter } from "@/lib/sql-assistant/stub-adapter"
import type {
  SqlAssistantContext,
  SqlAssistantStatus,
  SqlGenerationRequest,
  SqlGenerationResponse,
} from "@/lib/sql-assistant/types"

type UseSqlAssistantOptions = {
  adapter?: SqlAssistantAdapter
}

const processingStatus: SqlAssistantStatus = {
  modelName: "Gemma 4",
  status: "processing",
  summary: "Processing natural language request",
  detail: "The future local engine will stream SQL generation from this state.",
}

export function useSqlAssistant(options: UseSqlAssistantOptions = {}) {
  const adapter = options.adapter ?? sqlAssistantAdapter
  const [status, setStatus] = React.useState<SqlAssistantStatus | null>(null)
  const [response, setResponse] = React.useState<SqlGenerationResponse | null>(
    null
  )
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const refreshStatus = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextStatus = await adapter.getStatus()
      setStatus(nextStatus)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to retrieve the SQL assistant status."
      )
    } finally {
      setIsLoading(false)
    }
  }, [adapter])

  React.useEffect(() => {
    let isActive = true

    const loadInitialStatus = async () => {
      try {
        const nextStatus = await adapter.getStatus()
        if (!isActive) {
          return
        }

        setStatus(nextStatus)
        setErrorMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to retrieve the SQL assistant status."
        )
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialStatus()

    return () => {
      isActive = false
    }
  }, [adapter])

  const submit = React.useCallback(
    async (prompt: string, context: SqlAssistantContext) => {
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) {
        setErrorMessage("Enter a natural-language query before requesting SQL.")
        return null
      }

      const request: SqlGenerationRequest = {
        prompt: trimmedPrompt,
        context,
      }

      setIsSubmitting(true)
      setErrorMessage(null)
      setStatus(processingStatus)

      try {
        const nextResponse = await adapter.generateSql(request)
        const nextStatus = await adapter.getStatus()
        setResponse(nextResponse)
        setStatus(nextStatus)
        setErrorMessage(nextResponse.errorMessage)
        return nextResponse
      } catch (error) {
        const nextError =
          error instanceof Error
            ? error.message
            : "Unable to submit the natural-language query."
        setErrorMessage(nextError)
        setStatus({
          modelName: "Gemma 4",
          status: "error",
          summary: "Model request failed",
          detail: nextError,
        })
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [adapter]
  )

  return {
    status,
    response,
    errorMessage,
    isLoading,
    isSubmitting,
    refreshStatus,
    submit,
  }
}
