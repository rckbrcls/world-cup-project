from __future__ import annotations

import asyncio
import getpass

import typer
from rich.panel import Panel
from rich.prompt import IntPrompt, Prompt

from world_cup_core.db import DatabaseConnectionParams
from world_cup_core.repository import NaturalQueryExecutionError
from world_cup_core.sql_assistant import SqlPlanningHistory, WorkspaceContext
from world_cup_terminal.models import QueryDefinition
from world_cup_terminal.query_catalog import DEFAULT_QUERY_KEY, QUERY_CATALOG, QUERY_DEFINITIONS
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

app = typer.Typer(
    help="Command-line prototype for the World Cup database project.",
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
        launch_menu()


@app.command("menu")
def launch_menu() -> None:
    params = collect_connection_params(
        host=None,
        port=None,
        database=None,
        user=None,
        password=None,
    )
    console.print(render_connection_summary(params))

    while True:
        console.print()
        console.print("[bold]World Cup Database Prototype[/bold]")
        console.print("0. Database status")
        for index, definition in enumerate(QUERY_DEFINITIONS, start=1):
            console.print(f"{index}. {definition.title}")
        console.print("11. Natural-language query with local Ollama")
        console.print("12. Execute approved SQL")
        console.print("13. Quit")

        selected = IntPrompt.ask("Choose an option", default=1)

        if selected == 0:
            status = service.get_database_status(params)
            console.print(render_database_status(status))
            continue

        if 1 <= selected <= len(QUERY_DEFINITIONS):
            definition = QUERY_DEFINITIONS[selected - 1]
            run_definition_from_menu(params, definition)
            continue

        if selected == 11:
            run_natural_query_from_menu(params)
            continue

        if selected == 12:
            run_sql_from_menu(params)
            continue

        if selected == 13:
            console.print("Goodbye.")
            return

        console.print(Panel("Invalid option.", title="Menu", border_style="red"))


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


def run_definition_from_menu(
    params: DatabaseConnectionParams,
    definition: QueryDefinition,
) -> None:
    try:
        parameter_values = resolve_query_parameters(
            params=params,
            definition=definition,
            provided_values={},
        )
        result = service.execute_mandatory_query(
            connection_params=params,
            definition=definition,
            parameter_values=parameter_values,
        )
    except Exception as exc:
        console.print(Panel(str(exc), title="Query Error", border_style="red"))
        return

    console.print(render_query_result(definition.title, result))


def run_natural_query_from_menu(params: DatabaseConnectionParams) -> None:
    user_prompt = Prompt.ask("Natural-language request").strip()
    provider_state = asyncio.run(service.get_provider_state())
    console.print(render_provider_state(provider_state))

    if provider_state.status != "ready":
        return

    try:
        draft = asyncio.run(
            service.plan_natural_query(
                prompt=user_prompt,
                connection_params=params,
                context=WorkspaceContext(section="terminal-menu"),
                history=SqlPlanningHistory(),
            )
        )
    except Exception as exc:
        console.print(Panel(str(exc), title="Planning Error", border_style="red"))
        return

    for panel in render_draft(user_prompt, draft):
        console.print(panel)

    if not draft.is_executable or not draft.preview_sql:
        return

    approval = Prompt.ask("Execute this SQL?", choices=["yes", "no"], default="no")
    if approval != "yes":
        return

    execute_sql_text(params=params, sql=draft.preview_sql)


def run_sql_from_menu(params: DatabaseConnectionParams) -> None:
    sql = Prompt.ask("Approved SQL").strip()
    execute_sql_text(params=params, sql=sql)


def execute_sql_text(*, params: DatabaseConnectionParams, sql: str) -> None:
    try:
        result = service.execute_natural_query(
            sql=sql,
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
        return
    except Exception as exc:
        console.print(Panel(str(exc), title="SQL Error", border_style="red"))
        return

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
    should_prompt = any(value is None for value in (host, port, database, user, password))
    default_user = defaults.user if defaults and defaults.user else getpass.getuser()

    if should_prompt:
        console.print(
            Panel.fit(
                (
                    "Enter the PostgreSQL connection details for the database "
                    "that contains the world_cup schema.\n"
                    "Press Enter to accept defaults shown in parentheses. "
                    "The password default is never displayed.\n"
                    "Host and port identify the server. Database is the PostgreSQL "
                    "database name. User and password are the PostgreSQL role "
                    "credentials.\n"
                    "Leave password blank only when local PostgreSQL accepts "
                    "passwordless connections."
                ),
                title="Database Connection",
                border_style="cyan",
            )
        )

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
        default=default_user,
    )
    resolved_password = password
    if resolved_password is None:
        resolved_password = Prompt.ask(
            "Password",
            password=True,
            default=defaults.password if defaults and defaults.password else "",
            show_default=False,
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
