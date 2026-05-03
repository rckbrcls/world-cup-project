# Backend Overview

> **Status:** Active
> This backend is currently maintained as the thin FastAPI layer for the World Cup project.

The backend is a thin FastAPI layer that exposes the PostgreSQL model behind the World Cup project. It exists to wire HTTP requests to SQL artifacts and to operate the database lifecycle without moving core competition logic out of PostgreSQL.

## Backend responsibilities

- inspect database readiness
- initialize the SQL layers needed by the prototype
- reapply reporting objects
- populate and clean the synthetic sample dataset through SQL functions
- expose the SQL-backed World Cup endpoints
- mediate Natural Query planning and controlled read-only execution

## SQL lifecycle order

When the backend initializes the database, it applies these scripts in order:

1. `sql/ddl.sql`
2. `sql/synthetic_support.sql`
3. `sql/queries.sql`

`sql/dml.sql` remains the canonical data-loading entrypoint and is represented in the app-managed flow by the `Populate synthetic data` action, which calls `world_cup.fn_seed_synthetic_data()`.

## Common local command

- `make dev-server`

## Design contract

- PostgreSQL owns business rules and integrity.
- SQL functions and views own reporting logic.
- FastAPI owns connection handling, route wiring, lifecycle orchestration, and error translation.
- Python must stay thin.

## Main files

- `main.py`: FastAPI app and route wiring
- `repository.py`: database access, lifecycle script application, synthetic operations, controlled SQL execution
- `db.py`: PostgreSQL connection handling
- `config.py`: environment-based settings
- `ollama_client.py`: local Ollama status and generation helpers

## Lifecycle endpoints

- `GET /health`
- `GET /database/status`
- `POST /database/setup`
- `POST /database/reporting`
- `POST /database/populate`
- `DELETE /database/cleanup`
- `GET /synthetic-data/status`
- `POST /synthetic-data/populate`
- `DELETE /synthetic-data`

`/database/setup` is the route that applies `ddl.sql`, `synthetic_support.sql`, and `queries.sql` for the current database state.

## SQL-backed domain endpoints

- `GET /editions`
- `GET /editions/{edition_id}/teams`
- `GET /editions/{edition_id}/groups`
- `GET /groups/{group_id}/standings`
- `GET /editions/{edition_id}/matches`
- `GET /editions/{edition_id}/knockout`
- `GET /editions/{edition_id}/teams/{team_id}/squad`
- `GET /matches/{match_id}/events`
- `GET /editions/{edition_id}/top-scorers`
- `GET /teams/{team_id}/history`

These routes stay thin and call prepared `world_cup.fn_*` SQL artifacts.

## Natural Query endpoints

- `GET /natural-query/status`
- `POST /natural-query/generate`
- `POST /natural-query/plan-stream`
- `POST /natural-query/execute`

The backend keeps SQL generation separate from execution. Execution only accepts validated read-only SQL.

## Notes

- The backend does not replace the SQL source of truth.
- Read the root [README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/README.md) for the full project picture.
