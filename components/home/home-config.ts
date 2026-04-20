import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  FileCode2,
  GitBranch,
  History,
  LayoutDashboard,
  Medal,
  Table2,
  Users,
} from "lucide-react"

import type { HomeSectionId } from "@/hooks/use-world-cup-dashboard"

export type HomeSectionDefinition = {
  id: HomeSectionId
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}

export const homeSections: HomeSectionDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    description: "Edition snapshot, podium, volume, and final context.",
    icon: LayoutDashboard,
  },
  {
    id: "teams",
    label: "Teams",
    shortLabel: "Teams",
    description: "Participating national teams, coaches, groups, and ranks.",
    icon: Users,
  },
  {
    id: "groups",
    label: "Groups",
    shortLabel: "Groups",
    description: "Group composition and calculated standings.",
    icon: Table2,
  },
  {
    id: "matches",
    label: "Matches",
    shortLabel: "Matches",
    description: "Edition fixture list, filters, and event-ready selection.",
    icon: CalendarDays,
  },
  {
    id: "knockout",
    label: "Knockout",
    shortLabel: "Knockout",
    description: "Bracket path grouped by phase using the SQL backend output.",
    icon: GitBranch,
  },
  {
    id: "top-scorers",
    label: "Top Scorers",
    shortLabel: "Scorers",
    description: "Goal ranking backed directly by SQL aggregation.",
    icon: Medal,
  },
  {
    id: "history",
    label: "History",
    shortLabel: "History",
    description: "Contextual historical record for the selected team.",
    icon: History,
  },
  {
    id: "natural-query",
    label: "Natural Query",
    shortLabel: "Query",
    description: "Gemma 4 local SQL generation, review, and controlled execution.",
    icon: FileCode2,
  },
]

export const homeSectionMap = homeSections.reduce<
  Record<HomeSectionId, HomeSectionDefinition>
>((accumulator, section) => {
  accumulator[section.id] = section
  return accumulator
}, {} as Record<HomeSectionId, HomeSectionDefinition>)
