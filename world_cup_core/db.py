from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator
from urllib.parse import unquote, urlparse

import psycopg
from psycopg.rows import dict_row

from world_cup_core.config import settings


@dataclass(slots=True, frozen=True)
class DatabaseConnectionParams:
    host: str
    port: int
    database: str
    user: str
    password: str

    @classmethod
    def from_database_url(cls, database_url: str) -> "DatabaseConnectionParams":
        parsed = urlparse(database_url)

        if parsed.scheme not in {"postgres", "postgresql"}:
            raise ValueError("DATABASE_URL must use the postgres:// or postgresql:// scheme.")

        if not parsed.hostname:
            raise ValueError("DATABASE_URL must include a database host.")

        if parsed.username is None:
            raise ValueError("DATABASE_URL must include a database user.")

        database_name = unquote(parsed.path.lstrip("/"))
        if not database_name:
            raise ValueError("DATABASE_URL must include a database name.")

        return cls(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=database_name,
            user=unquote(parsed.username),
            password=unquote(parsed.password or ""),
        )

    def as_connect_kwargs(self) -> dict[str, str | int]:
        return {
            "host": self.host,
            "port": self.port,
            "dbname": self.database,
            "user": self.user,
            "password": self.password,
        }

    @property
    def display_name(self) -> str:
        return f"{self.user}@{self.host}:{self.port}/{self.database}"


def get_default_connection_params() -> DatabaseConnectionParams | None:
    database_url = settings.database_url

    if not database_url:
        return None

    return DatabaseConnectionParams.from_database_url(database_url)


@contextmanager
def get_connection(
    connection_params: DatabaseConnectionParams | None = None,
) -> Iterator[psycopg.Connection]:
    resolved_params = connection_params

    if resolved_params is None:
        try:
            resolved_params = get_default_connection_params()
        except ValueError as exc:
            raise RuntimeError(
                "DATABASE_URL is configured but invalid. "
                "Set a valid PostgreSQL URL or provide runtime connection parameters. "
                f"Original error: {str(exc).strip()}"
            ) from exc

    if resolved_params is None:
        raise RuntimeError(
            "Database connection parameters are not configured. "
            "Set DATABASE_URL in the environment or provide host, port, database, "
            "user, and password at runtime."
        )

    try:
        connection = psycopg.connect(
            row_factory=dict_row,
            **resolved_params.as_connect_kwargs(),
        )
    except psycopg.OperationalError as exc:
        raise RuntimeError(
            "Database connection failed. Check the provided connection parameters or "
            "DATABASE_URL and make sure the referenced PostgreSQL role and database exist. "
            f"Original error: {str(exc).strip()}"
        ) from exc

    try:
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO world_cup, public")
        yield connection
    finally:
        connection.close()
