from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

from app.db import DatabaseConnectionParams
from app.ollama_client import OllamaProviderStatus
from app.repository import NaturalQueryExecutionError

ValidationReason = Literal[
    "local-precheck",
    "database-validator",
    "database-preflight",
]


class SqlPreflightRepository(Protocol):
    def preflight_generated_sql(
        self,
        sql: str,
        statement_timeout_ms: int = 2000,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> str: ...


@dataclass(slots=True, frozen=True)
class WorkspaceContext:
    section: str
    edition_id: int | None = None
    edition_year: int | None = None
    team_id: int | None = None
    match_id: int | None = None
    group_id: int | None = None


@dataclass(slots=True, frozen=True)
class SqlPlanningHistory:
    last_user_prompt: str | None = None
    last_assistant_message: str | None = None
    last_sql_proposal: tuple[str, Literal["approved", "blocked"]] | None = None


@dataclass(slots=True, frozen=True)
class NaturalQueryRepairContext:
    original_prompt: str
    failing_sql: str
    failure_scope: str
    failure_detail: str


@dataclass(slots=True, frozen=True)
class NaturalQueryProviderState:
    provider: str
    base_url: str
    model: str
    status: str
    summary: str
    detail: str

    @classmethod
    def from_ollama_status(
        cls,
        status: OllamaProviderStatus,
    ) -> "NaturalQueryProviderState":
        return cls(
            provider=status.provider,
            base_url=status.base_url,
            model=status.model,
            status=status.status,
            summary=status.summary,
            detail=status.detail,
        )

    def to_dict(self) -> dict[str, str]:
        return {
            "provider": self.provider,
            "baseUrl": self.base_url,
            "model": self.model,
            "status": self.status,
            "summary": self.summary,
            "detail": self.detail,
        }


class SqlPlanningModelResponse(BaseModel):
    assistantMessage: str | None = None
    sql: str | None = None
    clarification: str | None = None
    warnings: list[str] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0, le=1)


@dataclass(slots=True)
class NaturalQueryDraft:
    raw_response: str
    assistant_message: str | None
    generated_sql: str | None
    preview_sql: str | None
    normalized_sql: str | None
    clarification: str | None
    warnings: list[str] = field(default_factory=list)
    validation_issues: list[str] = field(default_factory=list)
    validation_reason: ValidationReason | None = None
    validation_detail: str | None = None
    confidence: float | None = None
    is_executable: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "rawResponse": self.raw_response,
            "assistantMessage": self.assistant_message,
            "generatedSql": self.generated_sql,
            "previewSql": self.preview_sql,
            "normalizedSql": self.normalized_sql,
            "clarification": self.clarification,
            "warnings": self.warnings,
            "validationIssues": self.validation_issues,
            "validationReason": self.validation_reason,
            "validationDetail": self.validation_detail,
            "confidence": self.confidence,
            "isExecutable": self.is_executable,
        }


CORE_TABLES = [
    "confederation(id, name, code)",
    "country(id, name, fifa_code, confederation_id)",
    "team(id, name, fifa_code, country_id)",
    "coach(id, full_name, birth_date, country_id)",
    "referee(id, full_name, country_id)",
    "player(id, full_name, birth_date, primary_position, country_of_birth_id)",
    "world_cup_edition(id, year, host_country_id, start_date, end_date, champion_team_id, vice_champion_team_id, third_place_team_id)",
    "host_city(id, name, country_id)",
    "stadium(id, name, host_city_id, capacity)",
    "edition_host_city(edition_id, host_city_id)",
    "competition_phase(id, code, display_name, phase_kind, sort_order, allows_draw)",
    "edition_phase(id, edition_id, phase_id, label, stage_order)",
    "team_group(id, edition_id, group_letter)",
    "edition_team(id, edition_id, team_id, coach_id, group_id, final_rank)",
    "team_call_up(edition_id, team_id, player_id, shirt_number, squad_role, primary_position, is_captain)",
    "match_game(id, edition_id, edition_phase_id, group_id, stadium_id, kickoff_at, home_team_id, away_team_id, winner_team_id, home_score, away_score, home_extra_score, away_extra_score, home_penalty_score, away_penalty_score, match_day)",
    "match_official(match_id, referee_id, role)",
    "match_event(id, match_id, event_minute, stoppage_minute, event_type, team_id, player_id, related_player_id, description)",
]

CURATED_VIEWS = [
    "world_cup.vw_match_scoreboard(match_id, edition_id, edition_year, stage_order, phase_code, phase_name, phase_kind, group_letter, match_day, kickoff_at, stadium_name, host_city_name, home_team_id, home_team_name, away_team_id, away_team_name, winner_team_id, winner_team_name, home_score, away_score, home_extra_score, away_extra_score, home_penalty_score, away_penalty_score, final_home_goals, final_away_goals)",
    "world_cup.vw_match_team_summary(match_id, edition_id, edition_year, phase_code, phase_name, phase_kind, group_letter, kickoff_at, team_id, team_name, opponent_team_id, opponent_team_name, goals_for, goals_against, result, points)",
]

CURATED_FUNCTIONS = [
    "world_cup.fn_list_editions() -> (edition_id, edition_year, host_country_name, champion_team_name, vice_champion_team_name, third_place_team_name)",
    "world_cup.fn_list_edition_teams(p_edition_id) -> (edition_id, edition_year, team_id, team_name, country_name, coach_name, group_letter, final_rank)",
    "world_cup.fn_list_all_edition_teams() -> (edition_id, edition_year, team_id, team_name, country_name, coach_name, group_letter, final_rank)",
    "world_cup.fn_list_edition_groups(p_edition_id) -> (edition_id, edition_year, group_id, group_letter, team_id, team_name, coach_name)",
    "world_cup.fn_group_standings(p_group_id) -> (group_id, edition_id, edition_year, group_letter, team_id, team_name, matches_played, wins, draws, losses, goals_for, goals_against, goal_difference, points, standing_position)",
    "world_cup.fn_list_edition_matches(p_edition_id) -> (match_id, edition_id, edition_year, phase_name, phase_kind, group_letter, kickoff_at, stadium_name, host_city_name, home_team_name, away_team_name, final_score, winner_team_name)",
    "world_cup.fn_knockout_path(p_edition_id) -> (match_id, edition_id, edition_year, phase_name, phase_kind, kickoff_at, stadium_name, home_team_name, away_team_name, final_score, winner_team_name)",
    "world_cup.fn_list_team_squad(p_edition_id, p_team_id) -> (edition_id, edition_year, team_id, team_name, player_id, player_name, shirt_number, squad_role, primary_position, is_captain)",
    "world_cup.fn_list_match_events(p_match_id) -> (match_id, edition_year, phase_name, home_team_name, away_team_name, event_minute, stoppage_minute, event_type, team_name, player_name, related_player_name, description)",
    "world_cup.fn_top_scorers(p_edition_id) -> (rank_position, edition_id, edition_year, player_id, player_name, team_id, team_name, total_goals)",
    "world_cup.fn_team_history(p_team_id) -> (edition_id, edition_year, team_id, team_name, final_rank, matches_played, wins, draws, losses, goals_for, goals_against)",
]

DOMAIN_VOCABULARY = [
    "editions",
    "national teams",
    "groups",
    "standings",
    "matches",
    "knockout path",
    "stadiums",
    "host cities",
    "players",
    "coaches",
    "referees",
    "call-ups",
    "match events",
    "top scorers",
    "team history",
]

PREFERRED_REPORTING_MAPPINGS = [
    "editions -> SELECT * FROM world_cup.fn_list_editions()",
    "teams of one edition -> SELECT * FROM world_cup.fn_list_edition_teams(<edition_id>)",
    "teams across all editions -> SELECT * FROM world_cup.fn_list_all_edition_teams()",
    "teams of latest edition -> SELECT * FROM world_cup.fn_list_edition_teams((SELECT edition_id FROM world_cup.fn_list_editions() ORDER BY edition_year DESC LIMIT 1))",
    "groups of one edition -> SELECT * FROM world_cup.fn_list_edition_groups(<edition_id>)",
    "group standings -> SELECT * FROM world_cup.fn_group_standings(<group_id>)",
    "edition matches -> SELECT * FROM world_cup.fn_list_edition_matches(<edition_id>)",
    "knockout path -> SELECT * FROM world_cup.fn_knockout_path(<edition_id>)",
    "team squad in one edition -> SELECT * FROM world_cup.fn_list_team_squad(<edition_id>, <team_id>)",
    "match events -> SELECT * FROM world_cup.fn_list_match_events(<match_id>)",
    "top scorers -> SELECT * FROM world_cup.fn_top_scorers(<edition_id>) ORDER BY rank_position LIMIT <n>",
    "team goals from top scorers -> SELECT team_name, SUM(total_goals) AS total_goals FROM world_cup.fn_top_scorers(<edition_id>) GROUP BY team_name ORDER BY total_goals DESC, team_name LIMIT <n>",
    "team history -> SELECT * FROM world_cup.fn_team_history(<team_id>)",
]


def build_schema_catalog_prompt() -> str:
    lines = [
        "Approved schema namespace:",
        "- world_cup",
        "",
        "Core tables:",
        *[f"- {table}" for table in CORE_TABLES],
        "",
        "Reusable SQL surfaces:",
        *[f"- {view}" for view in CURATED_VIEWS],
        *[f"- {fn_name}" for fn_name in CURATED_FUNCTIONS],
        "",
        "Preferred reporting mappings:",
        *[f"- {mapping}" for mapping in PREFERRED_REPORTING_MAPPINGS],
        "",
        "SQL safety reminders:",
        "- Use only columns that exist in the tables, views, or function signatures above.",
        "- Do not invent helper columns such as goals when the function returns total_goals.",
        "- Do not reference an alias from an outer query inside a sibling or nested subquery unless that alias is actually in scope there.",
        "- If an ID is missing, prefer a nested SELECT that derives it from a known reporting surface before asking for clarification.",
        "",
        "Domain vocabulary:",
        f"- {', '.join(DOMAIN_VOCABULARY)}",
    ]
    return "\n".join(lines)


def build_sql_planning_prompt(
    *,
    prompt: str,
    context: WorkspaceContext,
    history: SqlPlanningHistory,
    model_name: str,
) -> str:
    return "\n".join(
        [
            f"You are the local Ollama model '{model_name}' operating inside a PostgreSQL World Cup operations workspace.",
            "Your one and only mission is to help the operator retrieve information from the database by planning exactly one read-only SQL query when needed.",
            "Return exactly one JSON object and nothing else.",
            "",
            'Required JSON shape: {"assistantMessage": string, "sql": string | null, "clarification": string | null, "warnings": string[], "confidence": number}',
            "",
            "Planning rules:",
            "- You are not a general chatbot. Your role is to decide whether a database query is needed and propose it.",
            "- Produce one read-only PostgreSQL statement only when the request can be answered from the database.",
            "- The SQL must target the world_cup schema and prefer curated reporting surfaces whenever they fit the request.",
            "- Allowed statement forms: SELECT or WITH ... SELECT.",
            "- The caller enforces a JSON schema, so every field in the response must match the required shape exactly.",
            "- Never emit comments, markdown fences, transaction commands, DDL, DML, GRANT/REVOKE, COPY, or admin commands.",
            "- If a curated SQL function or view answers the request, use it instead of recreating joins manually.",
            "- Prefer approved reporting functions and views first. Only compose raw joins when no curated surface fits the request.",
            "- Do not invent columns, table names, or event labels that are not present in the schema catalog below.",
            "- Do not reference aliases outside their valid SQL scope.",
            "- When aggregating the output of a function, use the exact returned columns from that function signature.",
            "- If the request needs an identifier that is missing from the current context, ask for clarification instead of guessing IDs.",
            "- Resolve short follow-up requests by using the recent drawer history below before asking for clarification.",
            "- Treat 'latest edition' or 'last edition' as the edition with the highest edition_year unless the operator explicitly says otherwise.",
            "- When an ID is missing but can be derived safely, use a nested SELECT against an approved reporting surface instead of guessing.",
            "- assistantMessage must briefly explain what the query is intended to retrieve for the operator.",
            "- If the request is ambiguous or underspecified, set sql to null and provide a concise clarification question grounded in the World Cup domain.",
            "- warnings should contain zero or more short review notes for the operator.",
            "- confidence must be a number between 0 and 1.",
            "- Keep SQL inspectable and operational, not conversational.",
            "",
            "Current dashboard context:",
            _format_context_line("section", context.section),
            _format_context_line("edition_id", context.edition_id),
            _format_context_line("edition_year", context.edition_year),
            _format_context_line("team_id", context.team_id),
            _format_context_line("match_id", context.match_id),
            _format_context_line("group_id", context.group_id),
            "",
            "Recent drawer history:",
            _format_history_line("last_user_request", history.last_user_prompt),
            _format_history_line("last_assistant_message", history.last_assistant_message),
            _format_history_line(
                "last_sql_proposal",
                (
                    f"{history.last_sql_proposal[1]}: {history.last_sql_proposal[0]}"
                    if history.last_sql_proposal
                    else None
                ),
            ),
            "",
            build_schema_catalog_prompt(),
            "",
            "User request:",
            prompt.strip(),
        ]
    )


def build_sql_repair_prompt(
    *,
    prompt: str,
    context: WorkspaceContext,
    repair: NaturalQueryRepairContext,
    model_name: str,
) -> str:
    return "\n".join(
        [
            f"You are the local Ollama model '{model_name}' repairing one PostgreSQL SQL proposal inside a World Cup operations workspace.",
            "Return exactly one JSON object and nothing else.",
            "",
            'Required JSON shape: {"assistantMessage": string, "sql": string | null, "clarification": string | null, "warnings": string[], "confidence": number}',
            "",
            "Repair rules:",
            "- Preserve the original operator intent.",
            "- Produce exactly one read-only PostgreSQL statement only when you can repair it safely.",
            "- Prefer approved reporting functions and views first. Only compose raw joins when no curated surface fits the request.",
            "- Use the PostgreSQL failure feedback below to correct the SQL instead of repeating it.",
            "- Do not repeat alias scoping mistakes, invented columns, guessed IDs, or unavailable schema objects.",
            "- If a safe repair is not possible, set sql to null and ask one concise clarification question.",
            "- assistantMessage must briefly explain the repaired query.",
            "- warnings should contain zero or more short review notes for the operator.",
            "- confidence must be a number between 0 and 1.",
            "",
            "Original operator request:",
            prompt.strip(),
            "",
            "Current dashboard context:",
            _format_context_line("section", context.section),
            _format_context_line("edition_id", context.edition_id),
            _format_context_line("edition_year", context.edition_year),
            _format_context_line("team_id", context.team_id),
            _format_context_line("match_id", context.match_id),
            _format_context_line("group_id", context.group_id),
            "",
            "Failed SQL proposal:",
            repair.failing_sql.strip(),
            "",
            "PostgreSQL failure feedback:",
            f"- failure_scope: {repair.failure_scope}",
            f"- failure_detail: {repair.failure_detail}",
            "",
            build_schema_catalog_prompt(),
        ]
    )


def format_model_prompt(prompt: str) -> str:
    return prompt.strip()


def strip_code_fences(value: str) -> str:
    trimmed = value.strip()

    if not trimmed.startswith("```"):
        return trimmed

    without_prefix = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", trimmed)
    return re.sub(r"\s*```$", "", without_prefix).strip()


def normalize_sql_for_execution(sql: str) -> tuple[str | None, list[str]]:
    issues: list[str] = []
    normalized_sql = strip_code_fences(sql)
    normalized_sql = re.sub(r"^sql\s+", "", normalized_sql, flags=re.IGNORECASE).strip()
    normalized_sql = re.sub(r";+[\s\n]*$", "", normalized_sql).strip()

    if not normalized_sql:
        issues.append("The model did not return executable SQL.")
        return None, issues

    if re.search(r"--|/\*", normalized_sql):
        issues.append("SQL comments are not allowed in controlled execution.")

    if ";" in normalized_sql:
        issues.append("Only one SQL statement can be executed at a time.")

    if not re.match(r"^\s*(select|with)\b", normalized_sql, flags=re.IGNORECASE):
        issues.append("Only read-only SELECT statements are allowed.")

    if re.search(
        r"\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|prepare|deallocate|vacuum|analyze|refresh|set|reset|show|begin|commit|rollback|savepoint|lock|discard|listen|notify|unlisten)\b",
        normalized_sql,
        flags=re.IGNORECASE,
    ):
        issues.append("The generated SQL includes a forbidden command.")

    if issues:
        return None, issues

    return normalized_sql, issues


def build_sql_draft(raw_response: str) -> NaturalQueryDraft:
    try:
        parsed = SqlPlanningModelResponse.model_validate_json(raw_response)
    except Exception as exc:
        raise RuntimeError(
            "The local Ollama model returned invalid structured JSON for SQL planning."
        ) from exc

    generated_sql = parsed.sql.strip() if parsed.sql and parsed.sql.strip() else None
    assistant_message = (
        parsed.assistantMessage.strip()
        if parsed.assistantMessage and parsed.assistantMessage.strip()
        else None
    )
    clarification = (
        parsed.clarification.strip()
        if parsed.clarification and parsed.clarification.strip()
        else None
    )
    preview_sql = generated_sql
    normalized_sql, validation_issues = (
        normalize_sql_for_execution(preview_sql) if preview_sql else (None, [])
    )
    validation_reason: ValidationReason | None = (
        "local-precheck" if validation_issues else None
    )
    validation_detail = " ".join(validation_issues) if validation_issues else None

    return NaturalQueryDraft(
        raw_response=raw_response,
        assistant_message=assistant_message,
        generated_sql=generated_sql,
        preview_sql=preview_sql,
        normalized_sql=normalized_sql,
        clarification=clarification,
        warnings=[warning.strip() for warning in parsed.warnings if warning.strip()],
        validation_issues=validation_issues,
        validation_reason=validation_reason,
        validation_detail=validation_detail,
        confidence=parsed.confidence,
        is_executable=bool(normalized_sql and not clarification),
    )


def apply_database_preflight(
    *,
    draft: NaturalQueryDraft,
    repository: SqlPreflightRepository,
    connection_params: DatabaseConnectionParams | None = None,
) -> NaturalQueryDraft:
    if not draft.normalized_sql or draft.clarification:
        return draft

    try:
        validated_sql = repository.preflight_generated_sql(
            draft.normalized_sql,
            connection_params=connection_params,
        )
    except NaturalQueryExecutionError as exc:
        detail = exc.detail or exc.message
        next_issues = list(draft.validation_issues)

        if detail:
            next_issues.append(detail)

        return NaturalQueryDraft(
            raw_response=draft.raw_response,
            assistant_message=draft.assistant_message,
            generated_sql=draft.generated_sql,
            preview_sql=draft.preview_sql,
            normalized_sql=None,
            clarification=draft.clarification,
            warnings=list(draft.warnings),
            validation_issues=next_issues,
            validation_reason=exc.reason,
            validation_detail=detail,
            confidence=draft.confidence,
            is_executable=False,
        )

    return NaturalQueryDraft(
        raw_response=draft.raw_response,
        assistant_message=draft.assistant_message,
        generated_sql=draft.generated_sql,
        preview_sql=draft.preview_sql,
        normalized_sql=validated_sql,
        clarification=draft.clarification,
        warnings=list(draft.warnings),
        validation_issues=list(draft.validation_issues),
        validation_reason=draft.validation_reason,
        validation_detail=draft.validation_detail,
        confidence=draft.confidence,
        is_executable=bool(validated_sql and not draft.clarification),
    )


def _format_context_line(label: str, value: int | str | None) -> str:
    if value is None or value == "":
        return f"- {label}: none"

    return f"- {label}: {value}"


def _format_history_line(label: str, value: str | None) -> str:
    if not value:
        return f"- {label}: none"

    return f"- {label}: {value}"
