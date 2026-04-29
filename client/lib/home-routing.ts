import type { HomeSectionId } from "@/components/home/home-types"

const validSections = new Set<HomeSectionId>([
  "database",
  "overview",
  "teams",
  "groups",
  "matches",
  "knockout",
  "top-scorers",
  "history",
])

function parsePositiveInteger(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseDashboardPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)

  if (!segments.length) {
    return {
      section: "overview" as HomeSectionId,
      detailId: null,
    }
  }

  const maybeSection = segments[0] as HomeSectionId

  return {
    section: validSections.has(maybeSection) ? maybeSection : ("overview" as HomeSectionId),
    detailId: parsePositiveInteger(segments[1]),
  }
}

export function parseEditionQuery(value: string | null | undefined) {
  return parsePositiveInteger(value)
}

export function buildDashboardHref(params: {
  section: HomeSectionId
  detailId?: number | null
  editionId?: number | null
}) {
  const pathname = params.detailId
    ? `/${params.section}/${params.detailId}`
    : `/${params.section}`

  if (!params.editionId) {
    return pathname
  }

  const searchParams = new URLSearchParams({
    edition: String(params.editionId),
  })

  return `${pathname}?${searchParams.toString()}`
}
