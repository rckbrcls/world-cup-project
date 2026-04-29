from contextlib import suppress
from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from typing import Any, TypedDict
from uuid import UUID

import psycopg

from app.db import DatabaseConnectionParams, get_connection

SQL_DIRECTORY = Path(__file__).resolve().parents[1] / "sql"


class NaturalQueryExecutionResult(TypedDict):
    columns: list[str]
    rows: list[dict[str, str | int | float | bool | None]]
    rowCount: int
    truncated: bool
    notices: list[str]


@dataclass(slots=True)
class NaturalQueryExecutionError(RuntimeError):
    scope: str
    reason: str
    message: str
    detail: str | None = None

    def __post_init__(self) -> None:
        RuntimeError.__init__(self, self.message)

    def __str__(self) -> str:
        return self.message

    def to_response(self) -> dict[str, str]:
        payload = {
            "scope": self.scope,
            "reason": self.reason,
            "message": self.message,
        }

        if self.detail:
            payload["detail"] = self.detail

        return payload


class QueryRepository:
    def get_database_status(
        self,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                return self._load_database_status(connection)
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def initialize_database(
        self,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                connection.autocommit = True
                status_before = self._load_database_status(connection)

                if self._database_core_ready(status_before):
                    return self._build_database_operation_result(
                        operation="initialize",
                        status="already_initialized",
                        message=(
                            "The database schema, synthetic support layer, and reporting "
                            "queries are already available."
                        ),
                        database_status=status_before,
                    )

                if not status_before["schema_exists"]:
                    self._execute_sql_script(connection, "ddl.sql")

                if not self._synthetic_support_ready(status_before):
                    self._execute_sql_script(connection, "synthetic_support.sql")

                if not status_before["reporting_layer_ready"]:
                    self._execute_sql_script(connection, "queries.sql")

                return self._build_database_operation_result(
                    operation="initialize",
                    status="initialized",
                    message=(
                        "Database schema, synthetic support objects, and reporting queries "
                        "were applied for the current database state."
                    ),
                    database_status=self._load_database_status(connection),
                )
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def apply_reporting_queries(
        self,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                connection.autocommit = True
                status_before = self._load_database_status(connection)

                if not status_before["schema_exists"]:
                    raise RuntimeError(
                        "Cannot apply reporting queries before the `world_cup` schema exists. "
                        "Initialize the database first."
                    )

                self._execute_sql_script(connection, "queries.sql")

                return self._build_database_operation_result(
                    operation="apply_reporting",
                    status="queries_applied",
                    message="Reporting views and SQL functions were applied successfully.",
                    database_status=self._load_database_status(connection),
                )
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def populate_database(
        self,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                status_before = self._load_database_status(connection)

                if not status_before["seed_functions_ready"]:
                    raise RuntimeError(
                        "Cannot populate synthetic data before the synthetic support "
                        "functions are available. Run database initialization first."
                    )

                with connection.cursor() as cursor:
                    cursor.execute("SELECT * FROM world_cup.fn_seed_synthetic_data()")
                    operation_row = cursor.fetchone()

                    if operation_row is None:
                        raise RuntimeError(
                            "Expected a single-row result from the synthetic seed function."
                        )

                connection.commit()

                return {
                    **self._load_database_status(connection),
                    "operation": "populate",
                    **operation_row,
                }
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def cleanup_database(
        self,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                status_before = self._load_database_status(connection)

                if not status_before["cleanup_function_ready"]:
                    raise RuntimeError(
                        "Cannot clean synthetic data before the synthetic support "
                        "functions are available. Run database initialization first."
                    )

                with connection.cursor() as cursor:
                    cursor.execute("SELECT * FROM world_cup.fn_cleanup_synthetic_data()")
                    operation_row = cursor.fetchone()

                    if operation_row is None:
                        raise RuntimeError(
                            "Expected a single-row result from the synthetic cleanup function."
                        )

                connection.commit()

                return {
                    **self._load_database_status(connection),
                    "operation": "cleanup",
                    **operation_row,
                }
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def fetch_all(
        self,
        sql: str,
        params: tuple[Any, ...] = (),
        connection_params: DatabaseConnectionParams | None = None,
    ) -> list[dict[str, Any]]:
        try:
            with get_connection(connection_params) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    return list(cursor.fetchall())
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def fetch_one(
        self,
        sql: str,
        params: tuple[Any, ...] = (),
        connection_params: DatabaseConnectionParams | None = None,
    ) -> dict[str, Any]:
        try:
            with get_connection(connection_params) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    row = cursor.fetchone()

                    if row is None:
                        raise RuntimeError("Expected a single-row result from the SQL function.")

                    return row
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def fetch_result(
        self,
        sql: str,
        params: tuple[Any, ...] = (),
        connection_params: DatabaseConnectionParams | None = None,
    ) -> NaturalQueryExecutionResult:
        try:
            with get_connection(connection_params) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    columns = [
                        description.name
                        for description in (cursor.description or [])
                    ]
                    fetched_rows = list(cursor.fetchall())
                    return {
                        "columns": columns,
                        "rows": [
                            {
                                column: self._to_json_safe(row.get(column))
                                for column in columns
                            }
                            for row in fetched_rows
                        ],
                        "rowCount": len(fetched_rows),
                        "truncated": False,
                        "notices": [],
                    }
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def execute_validated_sql(
        self,
        sql: str,
        row_limit: int = 200,
        statement_timeout_ms: int = 4000,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> NaturalQueryExecutionResult:
        try:
            with get_connection(connection_params) as connection:
                try:
                    with connection.cursor() as cursor:
                        self._begin_natural_query_transaction(
                            cursor=cursor,
                            statement_timeout_ms=statement_timeout_ms,
                        )
                        validated_sql = self._validate_generated_sql(
                            cursor=cursor,
                            sql=sql,
                            message=(
                                "The PostgreSQL read-only validator rejected this SQL "
                                "during controlled execution."
                            ),
                        )
                        self._preflight_validated_sql(
                            cursor=cursor,
                            sql=validated_sql,
                            message=(
                                "PostgreSQL rejected this SQL before execution during "
                                "controlled preflight."
                            ),
                        )

                        try:
                            cursor.execute(
                                f"SELECT * FROM ({validated_sql}) AS natural_query_result LIMIT {row_limit + 1}"
                            )
                        except psycopg.Error as exc:
                            raise NaturalQueryExecutionError(
                                scope="execution",
                                reason="database-runtime",
                                message="The approved SQL failed while running in PostgreSQL.",
                                detail=self._format_database_error(exc),
                            ) from exc

                        columns = [
                            description.name
                            for description in (cursor.description or [])
                        ]
                        fetched_rows = list(cursor.fetchall())
                        truncated = len(fetched_rows) > row_limit
                        materialized_rows = fetched_rows[:row_limit]
                        notices: list[str] = []

                        if truncated:
                            notices.append(
                                f"Result set truncated to {row_limit} rows for controlled execution."
                            )

                        return {
                            "columns": columns,
                            "rows": [
                                {
                                    column: self._to_json_safe(row.get(column))
                                    for column in columns
                                }
                                for row in materialized_rows
                            ],
                            "rowCount": len(materialized_rows),
                            "truncated": truncated,
                            "notices": notices,
                        }
                finally:
                    with suppress(psycopg.Error):
                        connection.rollback()
        except NaturalQueryExecutionError:
            raise
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    def preflight_generated_sql(
        self,
        sql: str,
        statement_timeout_ms: int = 2000,
        connection_params: DatabaseConnectionParams | None = None,
    ) -> str:
        try:
            with get_connection(connection_params) as connection:
                try:
                    with connection.cursor() as cursor:
                        self._begin_natural_query_transaction(
                            cursor=cursor,
                            statement_timeout_ms=statement_timeout_ms,
                        )
                        validated_sql = self._validate_generated_sql(
                            cursor=cursor,
                            sql=sql,
                            message=(
                                "The PostgreSQL read-only validator rejected this SQL "
                                "before approval."
                            ),
                        )
                        self._preflight_validated_sql(
                            cursor=cursor,
                            sql=validated_sql,
                            message="PostgreSQL rejected this SQL before approval.",
                        )
                        return validated_sql
                finally:
                    with suppress(psycopg.Error):
                        connection.rollback()
        except NaturalQueryExecutionError:
            raise
        except psycopg.Error as exc:
            raise RuntimeError(self._format_database_error(exc)) from exc

    @staticmethod
    def _begin_natural_query_transaction(
        *,
        cursor: psycopg.Cursor,
        statement_timeout_ms: int,
    ) -> None:
        cursor.execute("BEGIN READ ONLY")
        cursor.execute(f"SET LOCAL statement_timeout = '{statement_timeout_ms}ms'")
        cursor.execute("SET LOCAL search_path TO world_cup, public")

    def _validate_generated_sql(
        self,
        *,
        cursor: psycopg.Cursor,
        sql: str,
        message: str,
    ) -> str:
        try:
            cursor.execute(
                "SELECT world_cup.fn_validate_generated_sql(%s) AS validated_sql",
                (sql,),
            )
            validation_row = cursor.fetchone()
        except psycopg.Error as exc:
            raise NaturalQueryExecutionError(
                scope="validation",
                reason="database-validator",
                message=message,
                detail=self._format_database_error(exc),
            ) from exc

        if validation_row is None:
            raise RuntimeError("Expected a validated SQL string from fn_validate_generated_sql.")

        return validation_row["validated_sql"]

    def _preflight_validated_sql(
        self,
        *,
        cursor: psycopg.Cursor,
        sql: str,
        message: str,
    ) -> None:
        try:
            cursor.execute(f"SELECT * FROM ({sql}) AS natural_query_result LIMIT 0")
        except psycopg.Error as exc:
            raise NaturalQueryExecutionError(
                scope="validation",
                reason="database-preflight",
                message=message,
                detail=self._format_database_error(exc),
            ) from exc

    @staticmethod
    def _to_json_safe(value: Any) -> str | int | float | bool | None:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value

        if isinstance(value, (date, datetime, time)):
            return value.isoformat()

        if isinstance(value, Decimal):
            return str(value)

        if isinstance(value, UUID):
            return str(value)

        return str(value)

    @staticmethod
    def _format_database_error(exc: psycopg.Error) -> str:
        message = str(exc).strip()

        if exc.sqlstate == "3F000":
            return (
                "The `world_cup` schema is missing in the database selected by "
                "`DATABASE_URL`. Apply `sql/ddl.sql` first. For a complete setup, "
                "follow with `sql/synthetic_support.sql`, `sql/queries.sql`, and "
                "only use `sql/dml.sql` if you want to pre-seed the synthetic dataset "
                "outside the app."
            )

        if exc.sqlstate == "42883" and "world_cup.fn_" in message:
            return (
                "The required `world_cup` SQL functions are not available in the "
                "current database. Apply `sql/ddl.sql`, then `sql/synthetic_support.sql`, "
                "then `sql/queries.sql`, and retry the request."
            )

        return message

    def _load_database_status(self, connection: psycopg.Connection) -> dict[str, Any]:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    to_regnamespace('world_cup') IS NOT NULL AS schema_exists,
                    to_regprocedure('world_cup.fn_list_editions()') IS NOT NULL AS reporting_layer_ready,
                    to_regprocedure('world_cup.fn_seed_synthetic_data()') IS NOT NULL AS seed_functions_ready,
                    to_regprocedure('world_cup.fn_cleanup_synthetic_data()') IS NOT NULL AS cleanup_function_ready,
                    to_regprocedure('world_cup.fn_synthetic_data_status()') IS NOT NULL AS synthetic_status_ready,
                    to_regclass('world_cup.world_cup_edition') IS NOT NULL AS edition_table_exists,
                    to_regclass('world_cup.team') IS NOT NULL AS team_table_exists,
                    to_regclass('world_cup.match_game') IS NOT NULL AS match_table_exists
                """
            )
            capabilities = cursor.fetchone()

            if capabilities is None:
                raise RuntimeError("Unable to inspect the current database status.")

            status = {
                "schema_exists": capabilities["schema_exists"],
                "reporting_layer_ready": capabilities["reporting_layer_ready"],
                "seed_functions_ready": capabilities["seed_functions_ready"],
                "cleanup_function_ready": capabilities["cleanup_function_ready"],
                "synthetic_status_ready": capabilities["synthetic_status_ready"],
                "inspection_warning": None,
                "has_active_batch": False,
                "active_batch_id": None,
                "dataset_key": None,
                "edition_years": [],
                "created_at": None,
                "cleaned_at": None,
                "table_counts": {},
                "total_rows": 0,
                "history_batch_count": 0,
                "edition_count": 0,
                "team_count": 0,
                "match_count": 0,
            }

            if capabilities["synthetic_status_ready"]:
                try:
                    cursor.execute("SELECT * FROM world_cup.fn_synthetic_data_status()")
                    synthetic_status = cursor.fetchone()
                except psycopg.Error as exc:
                    status.update(
                        {
                            "synthetic_status_ready": False,
                            "inspection_warning": self._format_status_warning(exc),
                        }
                    )
                else:
                    if synthetic_status is not None:
                        status.update(
                            {
                                "has_active_batch": synthetic_status["has_active_batch"],
                                "active_batch_id": synthetic_status["active_batch_id"],
                                "dataset_key": synthetic_status["dataset_key"],
                                "edition_years": synthetic_status["edition_years"],
                                "created_at": synthetic_status["created_at"],
                                "cleaned_at": synthetic_status["cleaned_at"],
                                "table_counts": synthetic_status["table_counts"],
                                "total_rows": synthetic_status["total_rows"],
                                "history_batch_count": synthetic_status["history_batch_count"],
                            }
                        )

            if (
                capabilities["edition_table_exists"]
                and capabilities["team_table_exists"]
                and capabilities["match_table_exists"]
            ):
                cursor.execute(
                    """
                    SELECT
                        (SELECT COUNT(*)::BIGINT FROM world_cup.world_cup_edition) AS edition_count,
                        (SELECT COUNT(*)::BIGINT FROM world_cup.team) AS team_count,
                        (SELECT COUNT(*)::BIGINT FROM world_cup.match_game) AS match_count
                    """
                )
                counts = cursor.fetchone()

                if counts is not None:
                    status.update(
                        {
                            "edition_count": counts["edition_count"],
                            "team_count": counts["team_count"],
                            "match_count": counts["match_count"],
                        }
                    )

        return status

    def _format_status_warning(self, exc: psycopg.Error) -> str:
        message = self._format_database_error(exc)

        if exc.sqlstate == "42P01" and "synthetic_seed_batch" in message:
            return (
                "Synthetic batch metadata is unavailable because the database schema "
                "is missing the synthetic seed tables or the SQL objects were applied "
                "from an outdated definition. Reapply database initialization and retry."
            )

        return f"Synthetic batch metadata is unavailable. Original error: {message}"

    @staticmethod
    def _synthetic_support_ready(database_status: dict[str, Any]) -> bool:
        return (
            database_status["seed_functions_ready"]
            and database_status["cleanup_function_ready"]
            and database_status["synthetic_status_ready"]
        )

    def _database_core_ready(self, database_status: dict[str, Any]) -> bool:
        return (
            database_status["schema_exists"]
            and database_status["reporting_layer_ready"]
            and self._synthetic_support_ready(database_status)
        )

    @staticmethod
    def _build_database_operation_result(
        *,
        operation: str,
        status: str,
        message: str,
        database_status: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            **database_status,
            "operation": operation,
            "status": status,
            "message": message,
        }

    @staticmethod
    def _execute_sql_script(connection: psycopg.Connection, filename: str) -> None:
        script_path = SQL_DIRECTORY / filename

        with connection.cursor() as cursor:
            cursor.execute(script_path.read_text(encoding="utf-8"))


repository = QueryRepository()
