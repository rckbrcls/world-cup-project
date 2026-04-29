import type { EditionGroupRow, GroupStandingRow } from "@/lib/world-cup/types"
import { requestJson, type RequestOptions } from "@/lib/services/http-client"

export function listEditionGroups(
  editionId: number,
  options?: RequestOptions
) {
  return requestJson<EditionGroupRow[]>(
    `/editions/${editionId}/groups`,
    options
  )
}

export function listGroupStandings(
  groupId: number,
  options?: RequestOptions
) {
  return requestJson<GroupStandingRow[]>(`/groups/${groupId}/standings`, options)
}
