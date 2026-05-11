from __future__ import annotations

from typing import Any

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from world_cup_core.db import DatabaseConnectionParams
from world_cup_core.sql_assistant import NaturalQueryDraft, NaturalQueryProviderState
from world_cup_terminal.models import QueryExecutionResult, SelectorOption

console = Console()


def render_connection_summary(params: DatabaseConnectionParams) -> Panel:
    return Panel.fit(
        f"[bold]Database[/bold]\n{params.display_name}",
        border_style="cyan",
        title="Connection",
    )


def render_database_status(status: dict[str, Any]) -> Table:
    table = Table(box=box.SIMPLE_HEAVY, title="Database Status")
    table.add_column("Field", style="bold")
    table.add_column("Value")

    for key in (
        "schema_exists",
        "reporting_layer_ready",
        "edition_count",
        "team_count",
        "match_count",
        "inspection_warning",
    ):
        table.add_row(key, str(status.get(key)))

    return table


def render_query_result(title: str, result: QueryExecutionResult) -> Table | Panel:
    if not result.columns:
        return Panel("The query returned no visible columns.", title=title, border_style="yellow")

    table = Table(title=title, box=box.SIMPLE_HEAVY, show_lines=False)
    for column in result.columns:
        table.add_column(column, overflow="fold")

    if not result.rows:
        table.caption = "No rows returned."
        return table

    for row in result.rows:
        table.add_row(*[_format_cell(row.get(column)) for column in result.columns])

    if result.truncated:
        table.caption = f"Showing {result.row_count} rows (truncated)."
    else:
        table.caption = f"Showing {result.row_count} rows."

    return table


def render_selector_options(title: str, options: list[SelectorOption]) -> Table:
    table = Table(title=title, box=box.SIMPLE, show_lines=False)
    table.add_column("#", style="bold cyan", width=4)
    table.add_column("Option", style="bold")
    table.add_column("Detail")

    for index, option in enumerate(options, start=1):
        table.add_row(str(index), option.label, option.detail)

    return table


def render_provider_state(provider_state: NaturalQueryProviderState) -> Panel:
    tone = "green" if provider_state.status == "ready" else "yellow"
    return Panel.fit(
        (
            f"[bold]Provider[/bold] {provider_state.provider}\n"
            f"[bold]Model[/bold] {provider_state.model}\n"
            f"[bold]Status[/bold] {provider_state.summary}\n"
            f"{provider_state.detail}"
        ),
        border_style=tone,
        title="Natural Query",
    )


def render_draft(prompt: str, draft: NaturalQueryDraft) -> list[Panel]:
    panels = [
        Panel(prompt.strip(), title="Prompt", border_style="cyan"),
        Panel(
            draft.preview_sql or "No SQL proposal was produced.",
            title="Generated SQL",
            border_style="green" if draft.is_executable else "yellow",
        ),
    ]

    if draft.assistant_message:
        panels.append(
            Panel(draft.assistant_message, title="Assistant Message", border_style="cyan")
        )

    if draft.clarification:
        panels.append(
            Panel(draft.clarification, title="Clarification", border_style="yellow")
        )

    if draft.validation_issues:
        panels.append(
            Panel(
                "\n".join(f"- {issue}" for issue in draft.validation_issues),
                title="Validation Issues",
                border_style="red",
            )
        )

    if draft.warnings:
        panels.append(
            Panel(
                "\n".join(f"- {warning}" for warning in draft.warnings),
                title="Warnings",
                border_style="yellow",
            )
        )

    return panels


def _format_cell(value: Any) -> str:
    if value is None:
        return ""

    return str(value)
