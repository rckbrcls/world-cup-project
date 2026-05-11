from world_cup_terminal.models import QueryCatalog, QueryDefinition, QueryParameterSpec

EDITIONS = QueryParameterSpec(
    name="edition_id",
    label="Edition",
    source="editions",
)
TEAM_IN_EDITION = QueryParameterSpec(
    name="team_id",
    label="Team",
    source="edition_teams",
    depends_on=("edition_id",),
)
GROUP_IN_EDITION = QueryParameterSpec(
    name="group_id",
    label="Group",
    source="edition_groups",
    depends_on=("edition_id",),
)
MATCH_IN_EDITION = QueryParameterSpec(
    name="match_id",
    label="Match",
    source="edition_matches",
    depends_on=("edition_id",),
)
TEAM_ACROSS_EDITIONS = QueryParameterSpec(
    name="team_id",
    label="Team",
    source="all_teams",
)

QUERY_DEFINITIONS = (
    QueryDefinition(
        key="editions",
        title="1. Editions and Champions",
        description="List all World Cup editions with the host and final podium.",
        sql="SELECT * FROM world_cup.fn_list_editions()",
    ),
    QueryDefinition(
        key="edition-teams",
        title="2. Edition Teams",
        description="List the participating teams of one edition.",
        sql="SELECT * FROM world_cup.fn_list_edition_teams(%s)",
        parameters=(EDITIONS,),
    ),
    QueryDefinition(
        key="edition-groups",
        title="3. Groups and Teams",
        description="List all groups of one edition and the teams in each group.",
        sql="SELECT * FROM world_cup.fn_list_edition_groups(%s)",
        parameters=(EDITIONS,),
    ),
    QueryDefinition(
        key="group-standings",
        title="4. Group Standings",
        description="Show the standings table for one selected group.",
        sql="SELECT * FROM world_cup.fn_group_standings(%s)",
        parameters=(EDITIONS, GROUP_IN_EDITION),
        execution_parameters=("group_id",),
    ),
    QueryDefinition(
        key="edition-matches",
        title="5. Edition Matches",
        description="List all matches of one edition with phase, venue, and score.",
        sql="SELECT * FROM world_cup.fn_list_edition_matches(%s)",
        parameters=(EDITIONS,),
    ),
    QueryDefinition(
        key="knockout-path",
        title="6. Knockout Path",
        description="Show the knockout bracket path of one edition.",
        sql="SELECT * FROM world_cup.fn_knockout_path(%s)",
        parameters=(EDITIONS,),
    ),
    QueryDefinition(
        key="team-squad",
        title="7. Team Squad",
        description="List the called-up squad of one team in one edition.",
        sql="SELECT * FROM world_cup.fn_list_team_squad(%s, %s)",
        parameters=(EDITIONS, TEAM_IN_EDITION),
    ),
    QueryDefinition(
        key="match-events",
        title="8. Match Events",
        description="List all events recorded for one match.",
        sql="SELECT * FROM world_cup.fn_list_match_events(%s)",
        parameters=(EDITIONS, MATCH_IN_EDITION),
        execution_parameters=("match_id",),
    ),
    QueryDefinition(
        key="top-scorers",
        title="9. Top Scorers",
        description="Show the top scorers of one edition.",
        sql="SELECT * FROM world_cup.fn_top_scorers(%s)",
        parameters=(EDITIONS,),
    ),
    QueryDefinition(
        key="team-history",
        title="10. Team History",
        description="Show the historical record of one national team.",
        sql="SELECT * FROM world_cup.fn_team_history(%s)",
        parameters=(TEAM_ACROSS_EDITIONS,),
    ),
)

QUERY_CATALOG: QueryCatalog = {
    definition.key: definition for definition in QUERY_DEFINITIONS
}

DEFAULT_QUERY_KEY = "editions"
NATURAL_QUERY_KEY = "natural-query"
