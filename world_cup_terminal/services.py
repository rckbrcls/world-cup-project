from __future__ import annotations

from collections import OrderedDict
from typing import Any

from world_cup_core.config import settings
from world_cup_core.db import DatabaseConnectionParams, get_default_connection_params
from world_cup_core.ollama_client import OllamaClient
from world_cup_core.repository import QueryRepository, repository
from world_cup_core.sql_assistant import (
    NaturalQueryDraft,
    NaturalQueryProviderState,
    NaturalQueryRepairContext,
    SqlPlanningHistory,
    SqlPlanningModelResponse,
    WorkspaceContext,
    apply_database_preflight,
    build_sql_draft,
    build_sql_planning_prompt,
    build_sql_repair_prompt,
    format_model_prompt,
)
from world_cup_terminal.models import (
    QueryDefinition,
    QueryExecutionResult,
    QueryParameterSpec,
    SelectorOption,
)


class WorldCupTerminalService:
    def __init__(self, query_repository: QueryRepository | None = None) -> None:
        self.repository = query_repository or repository

    def default_connection_params(self) -> DatabaseConnectionParams | None:
        try:
            return get_default_connection_params()
        except ValueError:
            return None

    def get_database_status(
        self,
        connection_params: DatabaseConnectionParams,
    ) -> dict[str, Any]:
        return self.repository.get_database_status(connection_params)

    def execute_mandatory_query(
        self,
        *,
        connection_params: DatabaseConnectionParams,
        definition: QueryDefinition,
        parameter_values: dict[str, int] | None = None,
    ) -> QueryExecutionResult:
        values = parameter_values or {}
        payload = self.repository.fetch_result(
            definition.sql,
            definition.ordered_parameters(values),
            connection_params=connection_params,
        )
        return QueryExecutionResult.from_payload(payload)

    def load_selector_options(
        self,
        *,
        connection_params: DatabaseConnectionParams,
        parameter: QueryParameterSpec,
        current_values: dict[str, int],
    ) -> list[SelectorOption]:
        if parameter.source == "editions":
            return self._edition_options(connection_params)

        if parameter.source == "edition_teams":
            edition_id = current_values["edition_id"]
            return self._edition_team_options(connection_params, edition_id)

        if parameter.source == "edition_groups":
            edition_id = current_values["edition_id"]
            return self._edition_group_options(connection_params, edition_id)

        if parameter.source == "edition_matches":
            edition_id = current_values["edition_id"]
            return self._edition_match_options(connection_params, edition_id)

        if parameter.source == "all_teams":
            return self._all_team_options(connection_params)

        raise RuntimeError(f"Unsupported selector source: {parameter.source}")

    def build_workspace_context(
        self,
        *,
        query_key: str,
        parameter_values: dict[str, int],
        result: QueryExecutionResult | None,
    ) -> WorkspaceContext:
        first_row = result.rows[0] if result and result.rows else {}
        edition_year = first_row.get("edition_year")

        return WorkspaceContext(
            section=query_key,
            edition_id=self._optional_int(
                parameter_values.get("edition_id") or first_row.get("edition_id")
            ),
            edition_year=self._optional_int(edition_year),
            team_id=self._optional_int(
                parameter_values.get("team_id") or first_row.get("team_id")
            ),
            match_id=self._optional_int(
                parameter_values.get("match_id") or first_row.get("match_id")
            ),
            group_id=self._optional_int(
                parameter_values.get("group_id") or first_row.get("group_id")
            ),
        )

    async def get_provider_state(self) -> NaturalQueryProviderState:
        ollama_client = self._get_ollama_client()

        try:
            status = await ollama_client.get_status(settings.ollama_model)
            return NaturalQueryProviderState.from_ollama_status(status)
        finally:
            await ollama_client.close()

    async def plan_natural_query(
        self,
        *,
        prompt: str,
        connection_params: DatabaseConnectionParams,
        context: WorkspaceContext | None = None,
        history: SqlPlanningHistory | None = None,
        repair_context: NaturalQueryRepairContext | None = None,
    ) -> NaturalQueryDraft:
        ollama_client = self._get_ollama_client()

        try:
            provider_status = await ollama_client.get_status(settings.ollama_model)
            provider_state = NaturalQueryProviderState.from_ollama_status(provider_status)

            if provider_state.status != "ready":
                raise RuntimeError(provider_state.detail)

            safe_context = context or WorkspaceContext(section="terminal")
            safe_history = history or SqlPlanningHistory()
            prompt_text = (
                build_sql_repair_prompt(
                    prompt=prompt,
                    context=safe_context,
                    repair=repair_context,
                    model_name=settings.ollama_model,
                )
                if repair_context
                else build_sql_planning_prompt(
                    prompt=prompt,
                    context=safe_context,
                    history=safe_history,
                    model_name=settings.ollama_model,
                )
            )
            raw_response = await ollama_client.generate_structured(
                model=settings.ollama_model,
                prompt=format_model_prompt(prompt_text),
                format_schema=SqlPlanningModelResponse.model_json_schema(),
                options={"temperature": 0},
            )
        finally:
            await ollama_client.close()

        return apply_database_preflight(
            draft=build_sql_draft(raw_response),
            repository=self.repository,
            connection_params=connection_params,
        )

    def execute_natural_query(
        self,
        *,
        sql: str,
        connection_params: DatabaseConnectionParams,
        row_limit: int = 200,
    ) -> QueryExecutionResult:
        payload = self.repository.execute_validated_sql(
            sql,
            row_limit=row_limit,
            connection_params=connection_params,
        )
        return QueryExecutionResult.from_payload(payload)

    def _edition_options(
        self,
        connection_params: DatabaseConnectionParams,
    ) -> list[SelectorOption]:
        payload = self.repository.fetch_result(
            "SELECT * FROM world_cup.fn_list_editions()",
            connection_params=connection_params,
        )
        return [
            SelectorOption(
                value=int(row["edition_id"]),
                label=f"{row['edition_year']} World Cup",
                detail=(
                    f"Host {row['host_country']} | Champion "
                    f"{row.get('champion_team') or 'TBD'}"
                ),
                context={"edition_year": row["edition_year"]},
            )
            for row in payload["rows"]
        ]

    def _edition_team_options(
        self,
        connection_params: DatabaseConnectionParams,
        edition_id: int,
    ) -> list[SelectorOption]:
        payload = self.repository.fetch_result(
            "SELECT * FROM world_cup.fn_list_edition_teams(%s)",
            (edition_id,),
            connection_params=connection_params,
        )
        return [
            SelectorOption(
                value=int(row["team_id"]),
                label=str(row["team_name"]),
                detail=self._compact_detail(
                    [
                        f"Country {row['country_name']}",
                        (
                            f"Group {row['group_letter']}"
                            if row.get("group_letter")
                            else "No group"
                        ),
                        f"Coach {row['coach_name']}",
                    ]
                ),
                context={"team_id": row["team_id"]},
            )
            for row in payload["rows"]
        ]

    def _edition_group_options(
        self,
        connection_params: DatabaseConnectionParams,
        edition_id: int,
    ) -> list[SelectorOption]:
        payload = self.repository.fetch_result(
            "SELECT * FROM world_cup.fn_list_edition_groups(%s)",
            (edition_id,),
            connection_params=connection_params,
        )
        groups: OrderedDict[int, dict[str, Any]] = OrderedDict()

        for row in payload["rows"]:
            group_id = int(row["group_id"])
            item = groups.setdefault(
                group_id,
                {
                    "group_letter": row["group_letter"],
                    "teams": [],
                },
            )

            team_name = row.get("team_name")
            if team_name:
                item["teams"].append(str(team_name))

        return [
            SelectorOption(
                value=group_id,
                label=f"Group {item['group_letter']}",
                detail=", ".join(item["teams"]) or "No teams assigned",
            )
            for group_id, item in groups.items()
        ]

    def _edition_match_options(
        self,
        connection_params: DatabaseConnectionParams,
        edition_id: int,
    ) -> list[SelectorOption]:
        payload = self.repository.fetch_result(
            "SELECT * FROM world_cup.fn_list_edition_matches(%s)",
            (edition_id,),
            connection_params=connection_params,
        )
        return [
            SelectorOption(
                value=int(row["match_id"]),
                label=f"{row['home_team_name']} vs {row['away_team_name']}",
                detail=self._compact_detail(
                    [
                        str(row["phase_name"]),
                        str(row["kickoff_at"]),
                        f"Score {row['final_score']}",
                    ]
                ),
            )
            for row in payload["rows"]
        ]

    def _all_team_options(
        self,
        connection_params: DatabaseConnectionParams,
    ) -> list[SelectorOption]:
        payload = self.repository.fetch_result(
            "SELECT * FROM world_cup.fn_list_all_edition_teams()",
            connection_params=connection_params,
        )
        deduped: OrderedDict[int, dict[str, Any]] = OrderedDict()

        for row in payload["rows"]:
            team_id = int(row["team_id"])
            if team_id not in deduped:
                deduped[team_id] = row

        return [
            SelectorOption(
                value=team_id,
                label=str(row["team_name"]),
                detail=self._compact_detail(
                    [
                        f"Country {row['country_name']}",
                        f"Latest edition {row['edition_year']}",
                        (
                            f"Group {row['group_letter']}"
                            if row.get("group_letter")
                            else "No group"
                        ),
                    ]
                ),
                context={"team_id": team_id},
            )
            for team_id, row in deduped.items()
        ]

    @staticmethod
    def _compact_detail(parts: list[str]) -> str:
        return " | ".join(part for part in parts if part)

    @staticmethod
    def _optional_int(value: Any) -> int | None:
        if value is None or value == "":
            return None

        return int(value)

    @staticmethod
    def _get_ollama_client() -> OllamaClient:
        return OllamaClient(
            base_url=settings.ollama_base_url,
            timeout_seconds=settings.ollama_timeout_seconds,
        )
