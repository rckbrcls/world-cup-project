from __future__ import annotations

import asyncio
from typing import Any

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Footer, Input, Label, ListItem, ListView, Static

from app.db import DatabaseConnectionParams
from app.repository import NaturalQueryExecutionError
from app.sql_assistant import NaturalQueryDraft, SqlPlanningHistory, WorkspaceContext
from world_cup_terminal.models import ConnectionState, QueryDefinition, QueryExecutionResult, SelectorOption
from world_cup_terminal.query_catalog import DEFAULT_QUERY_KEY, NATURAL_QUERY_KEY, QUERY_CATALOG, QUERY_DEFINITIONS
from world_cup_terminal.services import WorldCupTerminalService


class QueryNavItem(ListItem):
    def __init__(self, definition_key: str, title: str, description: str) -> None:
        super().__init__(Label(f"{title}\n{description}"))
        self.definition_key = definition_key


class SelectorListItem(ListItem):
    def __init__(self, option: SelectorOption) -> None:
        detail = f"\n{option.detail}" if option.detail else ""
        super().__init__(Label(f"{option.label}{detail}"))
        self.option = option


class HelpScreen(ModalScreen[None]):
    CSS = """
    HelpScreen {
        align: center middle;
    }

    #help-dialog {
        width: 82;
        height: auto;
        border: round $accent;
        background: $surface;
        padding: 1 2;
    }
    """

    def compose(self) -> ComposeResult:
        yield Container(
            Static(
                "\n".join(
                    [
                        "World Cup Terminal Workspace",
                        "",
                        "F1: open help",
                        "Ctrl+1: focus navigation",
                        "Ctrl+2: focus results",
                        "Ctrl+3: open Natural Query and focus the prompt",
                        "Ctrl+R: refresh the current workspace",
                        "Ctrl+D: disconnect and return to login",
                        "Ctrl+Q: quit",
                        "",
                        "Enter confirms the current selector item or form action.",
                    ]
                ),
                id="help-body",
            ),
            Button("Close", id="help-close", variant="primary"),
            id="help-dialog",
        )

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "help-close":
            self.dismiss(None)


class ParameterScreen(ModalScreen[dict[str, int] | None]):
    CSS = """
    ParameterScreen {
        align: center middle;
    }

    #parameter-dialog {
        width: 96;
        height: 30;
        border: round $accent;
        background: $surface;
        padding: 1 2;
    }

    #parameter-options {
        height: 1fr;
        border: round $panel;
        margin: 1 0;
    }
    """

    def __init__(
        self,
        *,
        service: WorldCupTerminalService,
        connection_params: DatabaseConnectionParams,
        definition: QueryDefinition,
    ) -> None:
        super().__init__()
        self.service = service
        self.connection_params = connection_params
        self.definition = definition
        self.values: dict[str, int] = {}

    def compose(self) -> ComposeResult:
        yield Container(
            Static(self.definition.title, id="parameter-title"),
            Static(self.definition.description, id="parameter-description"),
            Static("", id="parameter-progress"),
            Static("", id="parameter-status"),
            ListView(id="parameter-options"),
            Horizontal(
                Button("Cancel", id="parameter-cancel"),
            ),
            id="parameter-dialog",
        )

    async def on_mount(self) -> None:
        await self._load_current_parameter()

    async def _load_current_parameter(self) -> None:
        parameter = self.definition.parameters[len(self.values)]
        self.query_one("#parameter-progress", Static).update(
            f"Select {parameter.label} ({len(self.values) + 1}/{len(self.definition.parameters)})"
        )
        self.query_one("#parameter-status", Static).update("Loading options...")

        try:
            options = await asyncio.to_thread(
                self.service.load_selector_options,
                connection_params=self.connection_params,
                parameter=parameter,
                current_values=dict(self.values),
            )
        except Exception as exc:
            self.query_one("#parameter-status", Static).update(str(exc))
            return

        list_view = self.query_one("#parameter-options", ListView)
        list_view.clear()

        if not options:
            self.query_one("#parameter-status", Static).update(
                f"No options available for {parameter.label}."
            )
            return

        for option in options:
            list_view.append(SelectorListItem(option))

        self.query_one("#parameter-status", Static).update(
            f"{len(options)} options available."
        )
        list_view.focus()

    async def on_list_view_selected(self, event: ListView.Selected) -> None:
        if event.list_view.id != "parameter-options":
            return

        item = event.item
        if not isinstance(item, SelectorListItem):
            return

        current_parameter = self.definition.parameters[len(self.values)]
        self.values[current_parameter.name] = int(item.option.value)

        if len(self.values) == len(self.definition.parameters):
            self.dismiss(dict(self.values))
            return

        await self._load_current_parameter()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "parameter-cancel":
            self.dismiss(None)


class WorldCupTerminalApp(App[None]):
    CSS = """
    Screen {
        background: $background;
        color: $text;
    }

    #login-view,
    #workspace-view {
        width: 100%;
        height: 1fr;
        padding: 1 2;
    }

    #login-card {
        width: 76;
        height: auto;
        border: round $accent;
        background: $surface;
        padding: 1 2;
        align-horizontal: center;
    }

    #login-actions {
        margin-top: 1;
    }

    .login-label {
        margin-top: 1;
    }

    #login-status,
    #workspace-query-status,
    #natural-state,
    #natural-validation,
    #natural-result-status {
        min-height: 3;
        padding: 0 1;
        border: round $panel;
        background: $surface-lighten-1;
    }

    #workspace-status-bar {
        height: 3;
        border: round $accent;
        background: $surface;
        padding: 0 1;
        content-align: left middle;
    }

    #workspace-body {
        height: 1fr;
        margin-top: 1;
    }

    #nav-column,
    #center-column,
    #inspector-column {
        border: round $panel;
        padding: 1;
        background: $surface;
    }

    #nav-column {
        width: 30;
    }

    #center-column {
        width: 1fr;
        margin: 0 1;
    }

    #inspector-column {
        width: 38;
    }

    #nav-list,
    #result-table,
    #natural-result-table {
        height: 1fr;
        border: round $panel;
    }

    #result-empty,
    #natural-result-empty {
        height: auto;
        padding: 1;
        border: round $panel;
        background: $surface-lighten-1;
    }

    #natural-actions {
        height: auto;
        margin: 1 0;
    }

    #natural-prompt {
        width: 1fr;
    }

    #natural-sql-preview {
        min-height: 8;
        border: round $panel;
        background: $surface-lighten-1;
        padding: 1;
        margin: 1 0;
    }

    .pane-title {
        margin-bottom: 1;
        text-style: bold;
    }
    """

    BINDINGS = [
        Binding("f1", "open_help", "Help"),
        Binding("ctrl+1", "focus_navigation", "Navigation"),
        Binding("ctrl+2", "focus_results", "Results"),
        Binding("ctrl+3", "focus_natural_query", "Natural Query"),
        Binding("ctrl+r", "refresh_current", "Refresh"),
        Binding("ctrl+d", "disconnect", "Disconnect"),
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def __init__(self, service: WorldCupTerminalService | None = None) -> None:
        super().__init__()
        self.service = service or WorldCupTerminalService()
        self.connection_state = ConnectionState()
        self.connection_params: DatabaseConnectionParams | None = None
        self.active_query_key = DEFAULT_QUERY_KEY
        self.active_query_params: dict[str, int] = {}
        self.active_workspace_context = WorkspaceContext(section="disconnected")
        self.current_result: QueryExecutionResult | None = None
        self.current_result_rows: list[dict[str, Any]] = []
        self.natural_result: QueryExecutionResult | None = None
        self.natural_provider_state = None
        self.natural_query_draft: NaturalQueryDraft | None = None
        self.natural_generation_state = "idle"
        self.natural_execution_state = "idle"
        self._planning_task: asyncio.Task[None] | None = None
        self._execution_task: asyncio.Task[None] | None = None

    def compose(self) -> ComposeResult:
        defaults = self.service.default_connection_params()

        yield Container(
            Vertical(
                Vertical(
                    Static("World Cup Terminal Workspace", classes="pane-title"),
                    Static(
                        "Connect directly to PostgreSQL and operate the SQL-first course prototype.",
                        id="login-copy",
                    ),
                    Static("Host", classes="login-label"),
                    Input(defaults.host if defaults else "localhost", id="login-host"),
                    Static("Port", classes="login-label"),
                    Input(str(defaults.port) if defaults else "5432", id="login-port"),
                    Static("Database", classes="login-label"),
                    Input(defaults.database if defaults else "world_cup", id="login-database"),
                    Static("User", classes="login-label"),
                    Input(defaults.user if defaults else "", id="login-user"),
                    Static("Password", classes="login-label"),
                    Input(
                        defaults.password if defaults and defaults.password else "",
                        password=True,
                        id="login-password",
                    ),
                    Horizontal(
                        Button("Connect", id="login-connect", variant="primary"),
                        id="login-actions",
                    ),
                    Static("Disconnected.", id="login-status"),
                    id="login-card",
                ),
            ),
            id="login-view",
        )

        yield Container(
            Static("", id="workspace-status-bar"),
            Horizontal(
                Vertical(
                    Static("Mandatory Queries", classes="pane-title"),
                    ListView(id="nav-list"),
                    id="nav-column",
                ),
                Vertical(
                    Static("", id="workspace-query-title", classes="pane-title"),
                    Static("", id="workspace-query-status"),
                    Container(
                        Static(
                            "Run a query from the left navigation to populate the result table.",
                            id="result-empty",
                        ),
                        DataTable(id="result-table"),
                        id="result-panel",
                    ),
                    Container(
                        Static("Natural Query", classes="pane-title"),
                        Static("", id="natural-provider-status"),
                        Horizontal(
                            Input(
                                placeholder="Describe the data you want to retrieve",
                                id="natural-prompt",
                            ),
                            Button("Plan SQL", id="natural-plan", variant="primary"),
                            Button("Execute", id="natural-execute"),
                            Button("Cancel", id="natural-cancel"),
                            id="natural-actions",
                        ),
                        Static("", id="natural-state"),
                        Static("Generated SQL", classes="pane-title"),
                        Static("No SQL proposal yet.", id="natural-sql-preview"),
                        Static("", id="natural-validation"),
                        Static("", id="natural-result-status"),
                        Static("No controlled execution result yet.", id="natural-result-empty"),
                        DataTable(id="natural-result-table"),
                        id="natural-panel",
                    ),
                    id="center-column",
                ),
                Vertical(
                    Static("Inspector", classes="pane-title"),
                    Static("No row selected.", id="inspector-title"),
                    Static(
                        "Move through the result table to inspect the selected row.",
                        id="inspector-body",
                    ),
                    id="inspector-column",
                ),
                id="workspace-body",
            ),
            id="workspace-view",
        )

        yield Footer()

    async def on_mount(self) -> None:
        self._populate_navigation()
        self._configure_table(self.query_one("#result-table", DataTable))
        self._configure_table(self.query_one("#natural-result-table", DataTable))
        self._show_login_view()
        self._set_natural_buttons()
        self.query_one("#login-host", Input).focus()

    def _populate_navigation(self) -> None:
        nav_list = self.query_one("#nav-list", ListView)
        nav_list.clear()

        for definition in QUERY_DEFINITIONS:
            nav_list.append(
                QueryNavItem(definition.key, definition.title, definition.description)
            )

        nav_list.append(
            QueryNavItem(
                NATURAL_QUERY_KEY,
                "Natural Query",
                "Generate and review one read-only SQL statement.",
            )
        )

    def _configure_table(self, table: DataTable) -> None:
        table.cursor_type = "row"
        table.zebra_stripes = True

    def _show_login_view(self) -> None:
        self.query_one("#login-view", Container).display = True
        self.query_one("#workspace-view", Container).display = False

    def _show_workspace_view(self) -> None:
        self.query_one("#login-view", Container).display = False
        self.query_one("#workspace-view", Container).display = True

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        button_id = event.button.id

        if button_id == "login-connect":
            await self._attempt_login()
        elif button_id == "natural-plan":
            await self._start_natural_query_planning()
        elif button_id == "natural-execute":
            await self._start_natural_query_execution()
        elif button_id == "natural-cancel":
            self._cancel_natural_query_tasks()

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "login-password":
            await self._attempt_login()
        elif event.input.id == "natural-prompt":
            await self._start_natural_query_planning()

    async def on_list_view_selected(self, event: ListView.Selected) -> None:
        if event.list_view.id != "nav-list":
            return

        if self.connection_params is None:
            return

        item = event.item
        if not isinstance(item, QueryNavItem):
            return

        if item.definition_key == NATURAL_QUERY_KEY:
            await self._open_natural_query_panel()
            return

        definition = QUERY_CATALOG[item.definition_key]
        parameter_values = self.active_query_params if item.definition_key == self.active_query_key else {}
        if definition.parameters and item.definition_key != self.active_query_key:
            parameter_values = await self.push_screen_wait(
                ParameterScreen(
                    service=self.service,
                    connection_params=self.connection_params,
                    definition=definition,
                )
            )
            if not parameter_values:
                return

        await self._run_query(definition, parameter_values or {})

    async def _attempt_login(self) -> None:
        try:
            params = DatabaseConnectionParams(
                host=self.query_one("#login-host", Input).value.strip(),
                port=int(self.query_one("#login-port", Input).value.strip()),
                database=self.query_one("#login-database", Input).value.strip(),
                user=self.query_one("#login-user", Input).value.strip(),
                password=self.query_one("#login-password", Input).value,
            )
        except ValueError:
            self.query_one("#login-status", Static).update("Port must be a valid integer.")
            return

        self.connection_state = ConnectionState(
            status="connecting",
            params=params,
            message="Connecting to PostgreSQL...",
        )
        self.query_one("#login-status", Static).update(self.connection_state.message)
        self.query_one("#login-connect", Button).disabled = True

        try:
            await asyncio.to_thread(self.service.get_database_status, params)
        except Exception as exc:
            self.connection_state = ConnectionState(
                status="error",
                params=params,
                message=str(exc),
            )
            self.query_one("#login-status", Static).update(str(exc))
            self.query_one("#login-connect", Button).disabled = False
            return

        self.connection_params = params
        self.connection_state = ConnectionState(
            status="connected",
            params=params,
            message="Connected.",
        )
        self.query_one("#login-status", Static).update("Connected.")
        self.query_one("#login-connect", Button).disabled = False
        self._reset_workspace_state()
        self._show_workspace_view()
        self._update_workspace_status_bar()
        await self._run_query(QUERY_CATALOG[DEFAULT_QUERY_KEY], {})
        self.query_one("#nav-list", ListView).focus()

    def _reset_workspace_state(self) -> None:
        self.active_query_key = DEFAULT_QUERY_KEY
        self.active_query_params = {}
        self.active_workspace_context = WorkspaceContext(section=DEFAULT_QUERY_KEY)
        self.current_result = None
        self.current_result_rows = []
        self.natural_result = None
        self.natural_query_draft = None
        self.natural_generation_state = "idle"
        self.natural_execution_state = "idle"
        self.query_one("#natural-prompt", Input).value = ""
        self._update_query_result_view(None)
        self._update_natural_query_view()
        self._update_inspector(None)

    async def _run_query(
        self,
        definition: QueryDefinition,
        parameter_values: dict[str, int],
    ) -> None:
        if self.connection_params is None:
            return

        self.active_query_key = definition.key
        self.active_query_params = dict(parameter_values)
        self._show_result_panel()
        self.query_one("#workspace-query-title", Static).update(definition.title)
        self.query_one("#workspace-query-status", Static).update("Running SQL function...")
        self._update_workspace_status_bar()

        try:
            result = await asyncio.to_thread(
                self.service.execute_mandatory_query,
                connection_params=self.connection_params,
                definition=definition,
                parameter_values=parameter_values,
            )
        except Exception as exc:
            self.current_result = None
            self.current_result_rows = []
            self.query_one("#workspace-query-status", Static).update(str(exc))
            self._update_query_result_view(None)
            self._update_inspector(None)
            return

        self.current_result = result
        self.current_result_rows = list(result.rows)
        self.active_workspace_context = self.service.build_workspace_context(
            query_key=definition.key,
            parameter_values=parameter_values,
            result=result,
        )
        self.query_one("#workspace-query-status", Static).update(
            self._result_summary(result)
        )
        self._update_query_result_view(result)
        self._update_workspace_status_bar()

    async def _open_natural_query_panel(self) -> None:
        self.active_query_key = NATURAL_QUERY_KEY
        self._show_natural_panel()
        self._update_workspace_status_bar()
        await self._refresh_provider_status()
        self.query_one("#natural-prompt", Input).focus()

    async def _refresh_provider_status(self) -> None:
        self.query_one("#natural-provider-status", Static).update(
            "Checking local Ollama provider..."
        )

        try:
            self.natural_provider_state = await self.service.get_provider_state()
        except Exception as exc:
            self.natural_provider_state = None
            self.query_one("#natural-provider-status", Static).update(str(exc))
            return

        self.query_one("#natural-provider-status", Static).update(
            (
                f"{self.natural_provider_state.summary}\n"
                f"{self.natural_provider_state.detail}"
            )
        )

    async def _start_natural_query_planning(self) -> None:
        if self.connection_params is None:
            return

        prompt = self.query_one("#natural-prompt", Input).value.strip()
        if not prompt:
            self.query_one("#natural-state", Static).update(
                "Enter a natural-language request before planning."
            )
            return

        await self._refresh_provider_status()
        if self.natural_provider_state is None or self.natural_provider_state.status != "ready":
            self.natural_generation_state = "error"
            self._update_natural_query_view()
            return

        self.natural_generation_state = "generating"
        self.natural_query_draft = None
        self.natural_result = None
        self.query_one("#natural-state", Static).update(
            "Planning SQL with the configured local Ollama model..."
        )
        self.query_one("#natural-result-status", Static).update("")
        self._update_natural_result_table(None)
        self._update_natural_query_view()
        self._set_natural_buttons()

        self._planning_task = asyncio.create_task(self._plan_natural_query(prompt))

    async def _plan_natural_query(self, prompt: str) -> None:
        try:
            draft = await self.service.plan_natural_query(
                prompt=prompt,
                connection_params=self.connection_params,
                context=self.active_workspace_context,
                history=SqlPlanningHistory(),
            )
        except asyncio.CancelledError:
            self.natural_generation_state = "canceled"
            self.query_one("#natural-state", Static).update("SQL planning was canceled.")
            raise
        except Exception as exc:
            self.natural_generation_state = "error"
            self.query_one("#natural-state", Static).update(str(exc))
            return
        else:
            self.natural_query_draft = draft
            self.natural_generation_state = "success"
            self.query_one("#natural-state", Static).update(
                draft.assistant_message
                or draft.clarification
                or "SQL proposal prepared for review."
            )
            self._update_natural_query_view()
        finally:
            self._planning_task = None
            self._set_natural_buttons()

    async def _start_natural_query_execution(self) -> None:
        if self.connection_params is None or self.natural_query_draft is None:
            return

        if not self.natural_query_draft.normalized_sql:
            self.query_one("#natural-result-status", Static).update(
                "The current draft is not executable."
            )
            return

        self.natural_execution_state = "running"
        self.query_one("#natural-result-status", Static).update(
            "Running validated SQL in a read-only transaction..."
        )
        self._set_natural_buttons()
        self._execution_task = asyncio.create_task(self._execute_natural_query())

    async def _execute_natural_query(self) -> None:
        assert self.connection_params is not None
        assert self.natural_query_draft is not None

        try:
            result = await asyncio.to_thread(
                self.service.execute_natural_query,
                sql=self.natural_query_draft.normalized_sql,
                connection_params=self.connection_params,
            )
        except asyncio.CancelledError:
            self.natural_execution_state = "canceled"
            self.query_one("#natural-result-status", Static).update(
                "Controlled execution was canceled."
            )
            raise
        except NaturalQueryExecutionError as exc:
            self.natural_execution_state = "error"
            self.query_one("#natural-result-status", Static).update(
                exc.detail or exc.message
            )
            self._update_natural_result_table(None)
            return
        except Exception as exc:
            self.natural_execution_state = "error"
            self.query_one("#natural-result-status", Static).update(str(exc))
            self._update_natural_result_table(None)
            return
        else:
            self.natural_result = result
            self.natural_execution_state = "empty" if not result.rows else "success"
            self.query_one("#natural-result-status", Static).update(self._result_summary(result))
            self._update_natural_result_table(result)
        finally:
            self._execution_task = None
            self._set_natural_buttons()

    def _cancel_natural_query_tasks(self) -> None:
        if self._planning_task and not self._planning_task.done():
            self._planning_task.cancel()

        if self._execution_task and not self._execution_task.done():
            self._execution_task.cancel()

    def _update_query_result_view(self, result: QueryExecutionResult | None) -> None:
        table = self.query_one("#result-table", DataTable)
        empty_state = self.query_one("#result-empty", Static)
        table.clear(columns=True)

        if result is None:
            empty_state.display = True
            table.display = False
            empty_state.update("Run a query from the left navigation to populate the result table.")
            return

        if result.columns:
            for column in result.columns:
                table.add_column(column)

        for row in result.rows:
            table.add_row(*[self._format_cell(row.get(column)) for column in result.columns])

        if result.rows:
            empty_state.display = False
            table.display = True
            self._update_inspector(result.rows[0])
        else:
            table.display = False
            empty_state.display = True
            empty_state.update("The query returned no rows for the current selection.")
            self._update_inspector(None)

    def _update_natural_query_view(self) -> None:
        preview = self.query_one("#natural-sql-preview", Static)
        validation = self.query_one("#natural-validation", Static)

        if self.natural_query_draft is None:
            preview.update("No SQL proposal yet.")
            validation.update("Provider status and validation details will appear here.")
            self._set_natural_buttons()
            return

        preview.update(self.natural_query_draft.preview_sql or "No SQL proposal was produced.")
        validation_lines: list[str] = []

        if self.natural_query_draft.validation_issues:
            validation_lines.extend(
                f"- {issue}" for issue in self.natural_query_draft.validation_issues
            )
        elif self.natural_query_draft.is_executable:
            validation_lines.append("Validated for controlled execution.")

        if self.natural_query_draft.warnings:
            validation_lines.extend(
                f"- Warning: {warning}" for warning in self.natural_query_draft.warnings
            )

        if self.natural_query_draft.clarification:
            validation_lines.append(
                f"- Clarification required: {self.natural_query_draft.clarification}"
            )

        validation.update(
            "\n".join(validation_lines)
            if validation_lines
            else "No validation notes yet."
        )
        self._set_natural_buttons()

    def _update_natural_result_table(self, result: QueryExecutionResult | None) -> None:
        table = self.query_one("#natural-result-table", DataTable)
        empty_state = self.query_one("#natural-result-empty", Static)
        table.clear(columns=True)

        if result is None:
            table.display = False
            empty_state.display = True
            empty_state.update("No controlled execution result yet.")
            return

        if result.columns:
            for column in result.columns:
                table.add_column(column)

        for row in result.rows:
            table.add_row(*[self._format_cell(row.get(column)) for column in result.columns])

        if result.rows:
            table.display = True
            empty_state.display = False
            self._update_inspector(result.rows[0])
        else:
            table.display = False
            empty_state.display = True
            empty_state.update("The approved SQL ran successfully but returned no rows.")
            self._update_inspector(None)

    def _show_result_panel(self) -> None:
        self.query_one("#result-panel", Container).display = True
        self.query_one("#natural-panel", Container).display = False

    def _show_natural_panel(self) -> None:
        self.query_one("#result-panel", Container).display = False
        self.query_one("#natural-panel", Container).display = True
        self.query_one("#workspace-query-title", Static).update("Natural Query")
        self.query_one("#workspace-query-status", Static).update(
            "Generate one reviewed SQL statement, then execute it separately."
        )

    def _update_workspace_status_bar(self) -> None:
        params = self.connection_state.params
        database_label = params.display_name if params else "No active database"
        active_label = (
            "Natural Query" if self.active_query_key == NATURAL_QUERY_KEY else QUERY_CATALOG[self.active_query_key].title
        )
        self.query_one("#workspace-status-bar", Static).update(
            f"Connection: {self.connection_state.status} | Database: {database_label} | Active: {active_label}"
        )

    def _update_inspector(self, row: dict[str, Any] | None) -> None:
        title = self.query_one("#inspector-title", Static)
        body = self.query_one("#inspector-body", Static)

        if row is None:
            title.update("No row selected.")
            body.update("Move through the result table to inspect the selected row.")
            return

        first_key = next(iter(row.keys()), "record")
        title.update(f"{first_key}: {row.get(first_key)}")
        body.update("\n".join(f"{key}: {value}" for key, value in row.items()))

    def _set_natural_buttons(self) -> None:
        execute_button = self.query_one("#natural-execute", Button)
        cancel_button = self.query_one("#natural-cancel", Button)

        execute_button.disabled = not bool(
            self.natural_query_draft and self.natural_query_draft.normalized_sql
        ) or self.natural_execution_state == "running"

        cancel_button.disabled = not (
            (self._planning_task and not self._planning_task.done())
            or (self._execution_task and not self._execution_task.done())
        )

    def _result_summary(self, result: QueryExecutionResult) -> str:
        if result.row_count == 0:
            return "No rows returned."

        suffix = " (truncated)" if result.truncated else ""
        return f"{result.row_count} rows loaded{suffix}."

    def _format_cell(self, value: Any) -> str:
        if value is None:
            return ""

        return str(value)

    def _update_inspector_from_event(self, event: Any) -> None:
        row_index = self._extract_row_index(event)
        if row_index is None:
            return

        table_id = getattr(event.control, "id", "")
        rows = (
            self.natural_result.rows
            if table_id == "natural-result-table" and self.natural_result
            else self.current_result_rows
        )
        if 0 <= row_index < len(rows):
            self._update_inspector(rows[row_index])

    def _extract_row_index(self, event: Any) -> int | None:
        cursor_row = getattr(event, "cursor_row", None)
        if isinstance(cursor_row, int):
            return cursor_row

        coordinate = getattr(event, "coordinate", None)
        if coordinate is not None:
            row_value = getattr(coordinate, "row", None)
            if isinstance(row_value, int):
                return row_value

        return None

    def on_data_table_row_selected(self, event: Any) -> None:
        self._update_inspector_from_event(event)

    def on_data_table_row_highlighted(self, event: Any) -> None:
        self._update_inspector_from_event(event)

    def on_data_table_cell_selected(self, event: Any) -> None:
        self._update_inspector_from_event(event)

    def on_data_table_cell_highlighted(self, event: Any) -> None:
        self._update_inspector_from_event(event)

    def action_open_help(self) -> None:
        self.push_screen(HelpScreen())

    def action_focus_navigation(self) -> None:
        if self.connection_params is not None:
            self.query_one("#nav-list", ListView).focus()

    def action_focus_results(self) -> None:
        if self.connection_params is None:
            return

        if self.active_query_key == NATURAL_QUERY_KEY:
            self.query_one("#natural-result-table", DataTable).focus()
        else:
            self.query_one("#result-table", DataTable).focus()

    async def action_focus_natural_query(self) -> None:
        if self.connection_params is None:
            return

        await self._open_natural_query_panel()

    async def action_refresh_current(self) -> None:
        if self.connection_params is None:
            return

        if self.active_query_key == NATURAL_QUERY_KEY:
            prompt = self.query_one("#natural-prompt", Input).value.strip()
            if prompt:
                await self._start_natural_query_planning()
            else:
                await self._refresh_provider_status()
            return

        await self._run_query(
            QUERY_CATALOG[self.active_query_key],
            dict(self.active_query_params),
        )

    def action_disconnect(self) -> None:
        self._cancel_natural_query_tasks()
        self._reset_workspace_state()
        self.connection_params = None
        self.connection_state = ConnectionState()
        self._show_login_view()
        self.query_one("#login-status", Static).update("Disconnected.")
        self.query_one("#login-password", Input).value = ""
        self.query_one("#login-host", Input).focus()
