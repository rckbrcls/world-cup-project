from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from world_cup_core.db import DatabaseConnectionParams
from world_cup_core.sql_assistant import NaturalQueryDraft, NaturalQueryProviderState, WorkspaceContext

ConnectionStatus = Literal["disconnected", "connecting", "connected", "error"]
SelectorSource = Literal[
    "editions",
    "edition_teams",
    "edition_groups",
    "edition_matches",
    "all_teams",
]


@dataclass(slots=True)
class ConnectionState:
    status: ConnectionStatus = "disconnected"
    params: DatabaseConnectionParams | None = None
    message: str = "Disconnected"


@dataclass(slots=True, frozen=True)
class QueryParameterSpec:
    name: str
    label: str
    source: SelectorSource
    depends_on: tuple[str, ...] = ()


@dataclass(slots=True, frozen=True)
class QueryDefinition:
    key: str
    title: str
    description: str
    sql: str
    parameters: tuple[QueryParameterSpec, ...] = ()
    execution_parameters: tuple[str, ...] | None = None

    def ordered_parameters(self, values: dict[str, int]) -> tuple[int, ...]:
        parameter_names = self.execution_parameters or tuple(
            parameter.name for parameter in self.parameters
        )
        return tuple(int(values[name]) for name in parameter_names)


QueryCatalog = dict[str, QueryDefinition]


@dataclass(slots=True, frozen=True)
class SelectorOption:
    value: int
    label: str
    detail: str = ""
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class QueryExecutionResult:
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    notices: list[str] = field(default_factory=list)
    truncated: bool = False

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "QueryExecutionResult":
        return cls(
            columns=list(payload["columns"]),
            rows=[dict(row) for row in payload["rows"]],
            row_count=int(payload["rowCount"]),
            notices=list(payload["notices"]),
            truncated=bool(payload["truncated"]),
        )


__all__ = [
    "ConnectionState",
    "NaturalQueryDraft",
    "NaturalQueryProviderState",
    "QueryCatalog",
    "QueryDefinition",
    "QueryExecutionResult",
    "QueryParameterSpec",
    "SelectorOption",
    "WorkspaceContext",
]
