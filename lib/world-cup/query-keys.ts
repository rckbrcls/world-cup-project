export const worldCupQueryKeys = {
  all: ["world-cup"] as const,
  health: () => [...worldCupQueryKeys.all, "health"] as const,
  databaseStatus: () => [...worldCupQueryKeys.all, "database-status"] as const,
  editions: () => [...worldCupQueryKeys.all, "editions"] as const,
  editionTeams: (editionId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "teams"] as const,
  editionGroups: (editionId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "groups"] as const,
  groupStandings: (groupId: number) =>
    [...worldCupQueryKeys.all, "group", groupId, "standings"] as const,
  editionMatches: (editionId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "matches"] as const,
  knockoutMatches: (editionId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "knockout"] as const,
  topScorers: (editionId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "top-scorers"] as const,
  teamHistory: (teamId: number) =>
    [...worldCupQueryKeys.all, "team", teamId, "history"] as const,
  teamSquad: (editionId: number, teamId: number) =>
    [...worldCupQueryKeys.all, "edition", editionId, "team", teamId, "squad"] as const,
  matchEvents: (matchId: number) =>
    [...worldCupQueryKeys.all, "match", matchId, "events"] as const,
}
