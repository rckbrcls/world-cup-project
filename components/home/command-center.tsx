"use client"

import * as React from "react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { homeSections } from "@/components/home/home-config"
import type { HomeSectionId } from "@/components/home/home-types"
import type {
  GroupSummary,
} from "@/lib/world-cup/selectors"
import { formatKickoffDate, formatMatchLabel } from "@/lib/world-cup/format"
import type {
  EditionMatchRow,
  EditionSummary,
  EditionTeamRow,
} from "@/lib/world-cup/types"

type HomeCommandCenterProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSection: HomeSectionId
  selectedEditionId: number | null
  selectedTeamId: number | null
  selectedGroupId: number | null
  selectedMatchId: number | null
  editions: EditionSummary[]
  teams: EditionTeamRow[]
  groups: GroupSummary[]
  matches: EditionMatchRow[]
  onSelectEdition: (editionId: number) => void
  onSelectSection: (section: HomeSectionId) => void
  onSelectTeam: (teamId: number) => void
  onSelectGroup: (groupId: number) => void
  onSelectMatch: (matchId: number) => void
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function HomeCommandCenter({
  open,
  onOpenChange,
  activeSection,
  selectedEditionId,
  selectedTeamId,
  selectedGroupId,
  selectedMatchId,
  editions,
  teams,
  groups,
  matches,
  onSelectEdition,
  onSelectSection,
  onSelectTeam,
  onSelectGroup,
  onSelectMatch,
}: HomeCommandCenterProps) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return
      }

      if (event.key.toLowerCase() !== "k") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      event.preventDefault()
      onOpenChange(!open)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onOpenChange, open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="World Cup command center"
      description="Jump between sections, editions, teams, groups, and matches."
      className="sm:max-w-2xl"
    >
      <CommandInput placeholder="Search sections, editions, teams, groups, or matches..." />
      <CommandList>
        <CommandEmpty>No matching operational target.</CommandEmpty>
        <CommandGroup heading="Sections">
          {homeSections.map((section) => {
            const Icon = section.icon

            return (
              <CommandItem
                key={section.id}
                data-checked={activeSection === section.id}
                onSelect={() => onSelectSection(section.id)}
              >
                <Icon />
                <span>{section.label}</span>
                <CommandShortcut>UI</CommandShortcut>
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Editions">
          {editions.map((edition) => (
            <CommandItem
              key={edition.edition_id}
              data-checked={selectedEditionId === edition.edition_id}
              onSelect={() => onSelectEdition(edition.edition_id)}
            >
              <span>{edition.edition_year}</span>
              <span className="text-muted-foreground">{edition.host_country}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Teams">
          {teams.map((team) => (
            <CommandItem
              key={team.team_id}
              data-checked={selectedTeamId === team.team_id}
              onSelect={() => onSelectTeam(team.team_id)}
            >
              <span>{team.team_name}</span>
              <span className="text-muted-foreground">{team.country_name}</span>
              <CommandShortcut>{team.group_letter ?? "KO"}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Groups">
          {groups.map((group) => (
            <CommandItem
              key={group.group_id}
              data-checked={selectedGroupId === group.group_id}
              onSelect={() => onSelectGroup(group.group_id)}
            >
              <span>{`Group ${group.group_letter}`}</span>
              <span className="text-muted-foreground">
                {group.teams.filter((team) => team.team_name).length} teams
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Matches">
          {matches.map((match) => (
            <CommandItem
              key={match.match_id}
              data-checked={selectedMatchId === match.match_id}
              onSelect={() => onSelectMatch(match.match_id)}
            >
              <span>{formatMatchLabel(match)}</span>
              <span className="text-muted-foreground">
                {formatKickoffDate(match.kickoff_at)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
