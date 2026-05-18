from __future__ import annotations

import asyncio
import getpass
from typing import Literal

import typer
from rich.live import Live
from rich.panel import Panel
from rich.prompt import IntPrompt, Prompt

from world_cup_core.db import DatabaseConnectionParams
from world_cup_core.repository import NaturalQueryExecutionError
from world_cup_core.sql_assistant import (
    NaturalQueryDraft,
    SqlPlanningHistory,
    WorkspaceContext,
)
from world_cup_terminal.models import QueryDefinition
from world_cup_terminal.query_catalog import DEFAULT_QUERY_KEY, QUERY_CATALOG, QUERY_DEFINITIONS
from world_cup_terminal.rich_render import (
    console,
    render_command_menu,
    render_connection_summary,
    render_database_status,
    render_draft,
    render_natural_query_chat_intro,
    render_natural_query_stream,
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
        console.print(render_command_menu(QUERY_DEFINITIONS))

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
            run_natural_query_chat(params)
            continue

        if selected == 12:
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


@natural_query_app.command("chat")
def chat_natural_query(
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
    console.print(render_connection_summary(params))
    run_natural_query_chat(params)


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


def run_natural_query_chat(params: DatabaseConnectionParams) -> None:
    pending_draft: NaturalQueryDraft | None = None
    pending_prompt: str | None = None
    history = SqlPlanningHistory()

    console.print(render_natural_query_chat_intro())

    while True:
        user_input = Prompt.ask("Natural Query").strip()
        if not user_input:
            continue

        command = user_input.lower()

        if command in {"exit", "quit"}:
            console.print("Returning to the main menu.")
            return

        if command == "run":
            if not pending_draft or not pending_prompt:
                console.print(
                    Panel(
                        "There is no pending SQL proposal to run.",
                        title="Natural Query Chat",
                        border_style="yellow",
                    )
                )
                continue

            if not pending_draft.is_executable or not pending_draft.normalized_sql:
                console.print(
                    Panel(
                        "The latest SQL proposal is not executable. Ask a new question.",
                        title="Approval Blocked",
                        border_style="yellow",
                    )
                )
                continue

            approved_sql = pending_draft.normalized_sql
            failure = execute_sql_text(params=params, sql=approved_sql)
            history = _build_chat_history(
                prompt=pending_prompt,
                draft=pending_draft,
                proposal_state="blocked" if failure else "approved",
            )

            if failure:
                pending_draft = None
                pending_prompt = None
                console.print(
                    Panel(
                        "Ask a new question if you need another SQL proposal.",
                        title="Execution Failed",
                        border_style="yellow",
                    )
                )
                continue

            pending_draft = None
            pending_prompt = None
            continue

        pending_prompt = user_input
        pending_draft = None

        draft = _plan_natural_query_with_stream(
            params=params,
            prompt=user_input,
            history=history,
        )
        if draft is None:
            continue

        pending_draft = draft if draft.is_executable else None
        history = _build_chat_history(
            prompt=user_input,
            draft=draft,
            proposal_state="blocked",
        )
        _print_pending_action_hint(draft)


def execute_sql_text(
    *,
    params: DatabaseConnectionParams,
    sql: str,
) -> Exception | None:
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
        return exc
    except Exception as exc:
        console.print(Panel(str(exc), title="SQL Error", border_style="red"))
        return exc

    console.print(render_query_result("Controlled SQL Execution", result))
    return None


def _plan_natural_query_with_stream(
    *,
    params: DatabaseConnectionParams,
    prompt: str,
    history: SqlPlanningHistory,
) -> NaturalQueryDraft | None:
    try:
        draft = asyncio.run(
            _collect_streamed_natural_query_draft(
                params=params,
                prompt=prompt,
                history=history,
            )
        )
    except Exception as exc:
        console.print(Panel(str(exc), title="Planning Error", border_style="red"))
        return None

    if draft is None:
        return None

    for panel in render_draft(prompt, draft):
        console.print(panel)

    return draft


async def _collect_streamed_natural_query_draft(
    *,
    params: DatabaseConnectionParams,
    prompt: str,
    history: SqlPlanningHistory,
) -> NaturalQueryDraft | None:
    status = "Thinking..."
    chunk_count = 0
    assistant_preview: str | None = None
    draft: NaturalQueryDraft | None = None

    with Live(
        render_natural_query_stream(
            status=status,
            chunk_count=chunk_count,
            assistant_preview=assistant_preview,
        ),
        console=console,
        refresh_per_second=8,
        transient=False,
    ) as live:
        async for event in service.stream_natural_query(
            prompt=prompt,
            connection_params=params,
            context=WorkspaceContext(section="terminal-chat"),
            history=history,
        ):
            if event.kind == "started" and event.message:
                status = event.message

            if event.kind == "provider" and event.provider_state:
                status = (
                    f"{event.provider_state.summary}\n"
                    f"Model: {event.provider_state.model}\n"
                    f"{event.provider_state.detail}"
                )

            if event.kind == "chunk":
                chunk_count += 1

            if event.kind == "assistant-preview":
                assistant_preview = event.message

            if event.kind == "preflight" and event.message:
                status = event.message

            if event.kind == "draft":
                draft = event.draft
                status = (
                    "SQL proposal ready."
                    if draft and draft.is_executable
                    else "SQL proposal blocked."
                )

            live.update(
                render_natural_query_stream(
                    status=status,
                    chunk_count=chunk_count,
                    assistant_preview=assistant_preview,
                )
            )

    return draft


def _build_chat_history(
    *,
    prompt: str,
    draft: NaturalQueryDraft,
    proposal_state: Literal["approved", "blocked"],
) -> SqlPlanningHistory:
    sql = draft.normalized_sql or draft.preview_sql
    last_sql_proposal = None

    if sql:
        last_sql_proposal = (sql, proposal_state)

    return SqlPlanningHistory(
        last_user_prompt=prompt,
        last_assistant_message=draft.assistant_message,
        last_sql_proposal=last_sql_proposal,
    )


def _print_pending_action_hint(draft: NaturalQueryDraft) -> None:
    if draft.is_executable and draft.normalized_sql:
        console.print(
            Panel(
                "Type run to execute this validated SQL proposal. "
                "Type exit to return to the main menu.",
                title="Awaiting Approval",
                border_style="green",
            )
        )
        return

    console.print(
        Panel(
            "No executable SQL is pending. Ask a new question or type exit.",
            title="Approval Blocked",
            border_style="yellow",
        )
    )


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
