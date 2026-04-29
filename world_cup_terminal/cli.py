from __future__ import annotations

import asyncio

import typer
from rich.panel import Panel
from rich.prompt import IntPrompt, Prompt

from app.db import DatabaseConnectionParams
from app.repository import NaturalQueryExecutionError
from app.sql_assistant import SqlPlanningHistory, WorkspaceContext
from world_cup_terminal.models import QueryDefinition
from world_cup_terminal.query_catalog import DEFAULT_QUERY_KEY, QUERY_CATALOG
from world_cup_terminal.rich_render import (
    console,
    render_connection_summary,
    render_database_status,
    render_draft,
    render_provider_state,
    render_query_result,
    render_selector_options,
)
from world_cup_terminal.services import WorldCupTerminalService
from world_cup_terminal.tui import WorldCupTerminalApp

app = typer.Typer(
    help="Keyboard-first terminal workspace for the World Cup project.",
    no_args_is_help=False,
    add_completion=False,
)
natural_query_app = typer.Typer(
    help="Plan and execute validated Natural Query SQL flows.",
    add_completion=False,
)
app.add_typer(natural_query_app, name="natural-query")

service = WorldCupTerminalService()


@app.callback(invoke_without_command=True)
def terminal_entrypoint(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is None:
        launch_tui()


@app.command("tui")
def launch_tui() -> None:
    WorldCupTerminalApp(service=service).run()


@app.command("status")
def database_status(
    host: str | None = typer.Option(None, "--host"),
    port: int | None = typer.Option(None, "--port"),
    database: str | None = typer.Option(None, "--database"),
    user: str | None = typer.Option(None, "--user"),
    password: str | None = typer.Option(None, "--password"),
) -> None:
    params = collect_connection_params(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
    )
    status = service.get_database_status(params)
    console.print(render_connection_summary(params))
    console.print(render_database_status(status))


@app.command("report")
def run_report(
    query_key: str = typer.Argument(DEFAULT_QUERY_KEY),
    host: str | None = typer.Option(None, "--host"),
    port: int | None = typer.Option(None, "--port"),
    database: str | None = typer.Option(None, "--database"),
    user: str | None = typer.Option(None, "--user"),
    password: str | None = typer.Option(None, "--password"),
    edition_id: int | None = typer.Option(None, "--edition-id"),
    team_id: int | None = typer.Option(None, "--team-id"),
    group_id: int | None = typer.Option(None, "--group-id"),
    match_id: int | None = typer.Option(None, "--match-id"),
) -> None:
    definition = QUERY_CATALOG.get(query_key)
    if definition is None:
        raise typer.BadParameter(f"Unknown query key: {query_key}")

    params = collect_connection_params(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
    )
    parameter_values = resolve_query_parameters(
        params=params,
        definition=definition,
        provided_values={
            "edition_id": edition_id,
            "team_id": team_id,
            "group_id": group_id,
            "match_id": match_id,
        },
    )
    result = service.execute_mandatory_query(
        connection_params=params,
        definition=definition,
        parameter_values=parameter_values,
    )
    console.print(render_connection_summary(params))
    console.print(render_query_result(definition.title, result))


@natural_query_app.command("plan")
def plan_natural_query(
    prompt: str | None = typer.Option(None, "--prompt"),
    host: str | None = typer.Option(None, "--host"),
    port: int | None = typer.Option(None, "--port"),
    database: str | None = typer.Option(None, "--database"),
    user: str | None = typer.Option(None, "--user"),
    password: str | None = typer.Option(None, "--password"),
) -> None:
    params = collect_connection_params(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
    )
    user_prompt = prompt or Prompt.ask("Natural-language request").strip()
    provider_state = asyncio.run(service.get_provider_state())
    console.print(render_connection_summary(params))
    console.print(render_provider_state(provider_state))

    if provider_state.status != "ready":
        raise typer.Exit(code=1)

    draft = asyncio.run(
        service.plan_natural_query(
            prompt=user_prompt,
            connection_params=params,
            context=WorkspaceContext(section="terminal-cli"),
            history=SqlPlanningHistory(),
        )
    )

    for panel in render_draft(user_prompt, draft):
        console.print(panel)


@natural_query_app.command("execute")
def execute_natural_query(
    sql: str | None = typer.Option(None, "--sql"),
    host: str | None = typer.Option(None, "--host"),
    port: int | None = typer.Option(None, "--port"),
    database: str | None = typer.Option(None, "--database"),
    user: str | None = typer.Option(None, "--user"),
    password: str | None = typer.Option(None, "--password"),
) -> None:
    params = collect_connection_params(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password,
    )
    approved_sql = sql or Prompt.ask("Approved SQL").strip()

    try:
        result = service.execute_natural_query(
            sql=approved_sql,
            connection_params=params,
        )
    except NaturalQueryExecutionError as exc:
        console.print(
            Panel(
                exc.detail or exc.message,
                title=f"{exc.scope}: {exc.reason}",
                border_style="red",
            )
        )
        raise typer.Exit(code=1) from exc

    console.print(render_connection_summary(params))
    console.print(render_query_result("Controlled SQL Execution", result))


def collect_connection_params(
    *,
    host: str | None,
    port: int | None,
    database: str | None,
    user: str | None,
    password: str | None,
) -> DatabaseConnectionParams:
    defaults = service.default_connection_params()
    resolved_host = host or Prompt.ask(
        "Host",
        default=defaults.host if defaults else "localhost",
    )
    resolved_port = port or IntPrompt.ask(
        "Port",
        default=defaults.port if defaults else 5432,
    )
    resolved_database = database or Prompt.ask(
        "Database",
        default=defaults.database if defaults else "world_cup",
    )
    resolved_user = user or Prompt.ask(
        "User",
        default=defaults.user if defaults else "",
    )
    resolved_password = password
    if resolved_password is None:
        resolved_password = Prompt.ask(
            "Password",
            password=True,
            default=defaults.password if defaults and defaults.password else "",
        )

    return DatabaseConnectionParams(
        host=resolved_host.strip(),
        port=int(resolved_port),
        database=resolved_database.strip(),
        user=resolved_user.strip(),
        password=resolved_password,
    )


def resolve_query_parameters(
    *,
    params: DatabaseConnectionParams,
    definition: QueryDefinition,
    provided_values: dict[str, int | None],
) -> dict[str, int]:
    values: dict[str, int] = {}

    for parameter in definition.parameters:
        provided_value = provided_values.get(parameter.name)
        if provided_value is not None:
            values[parameter.name] = int(provided_value)
            continue

        options = service.load_selector_options(
            connection_params=params,
            parameter=parameter,
            current_values=values,
        )
        if not options:
            raise typer.BadParameter(f"No options available for {parameter.label}.")

        console.print(render_selector_options(parameter.label, options))
        selected_index = IntPrompt.ask(
            f"Choose {parameter.label} by number",
            default=1,
        )
        if selected_index < 1 or selected_index > len(options):
            raise typer.BadParameter(f"Invalid selection for {parameter.label}.")

        values[parameter.name] = int(options[selected_index - 1].value)

    return values
