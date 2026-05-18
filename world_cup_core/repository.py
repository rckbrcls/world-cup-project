from contextlib import suppress
from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, TypedDict
from uuid import UUID

import psycopg

from world_cup_core.db import DatabaseConnectionParams, get_connection


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
                "follow with `sql/dml.sql`."
            )

        if exc.sqlstate == "42883" and "world_cup.fn_" in message:
            return (
                "The required `world_cup` SQL functions are not available in the "
                "current database. Apply `sql/ddl.sql`, then retry the request."
            )

        return message

    def _load_database_status(self, connection: psycopg.Connection) -> dict[str, Any]:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    to_regnamespace('world_cup') IS NOT NULL AS schema_exists,
                    to_regprocedure('world_cup.fn_list_editions()') IS NOT NULL AS reporting_layer_ready,
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
                "inspection_warning": None,
                "edition_count": 0,
                "team_count": 0,
                "match_count": 0,
            }

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


repository = QueryRepository()
