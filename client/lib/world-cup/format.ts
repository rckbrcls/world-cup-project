import type {
  EditionMatchRow,
  KnockoutMatchRow,
  MatchEventType,
} from "@/lib/world-cup/types"

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
})

const numberFormatter = new Intl.NumberFormat("en")

export function formatKickoffDate(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatSimpleDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export function formatMatchLabel(
  match: Pick<EditionMatchRow | KnockoutMatchRow, "home_team_name" | "away_team_name">
) {
  return `${match.home_team_name} vs ${match.away_team_name}`
}

export function formatEventTypeLabel(eventType: MatchEventType) {
  return eventType
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function formatPenaltyLabel(penaltyScore: string | null) {
  if (!penaltyScore) {
    return "No penalty shootout"
  }

  return `Penalties ${penaltyScore}`
}
