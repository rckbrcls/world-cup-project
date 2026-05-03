# Documentation

Welcome to the documentation for World Cup Project.

## Guides

- [Getting Started](getting-started.md)
- [Architecture](architecture.md)
- [API](api.md)
- [Troubleshooting](troubleshooting.md)

## Project Surfaces

- `sql/`: PostgreSQL schema, seed data, reporting queries, validation helpers, and synthetic data support.
- `app/`: FastAPI backend that exposes SQL-backed workflows.
- `client/`: Next.js operational frontend.
- `world_cup_terminal/`: Typer/Textual terminal interface.

## Notes

- PostgreSQL is the source of truth for competition rules and reporting logic.
- The backend should remain thin and should not reimplement database rules in Python.
- Natural Query must keep SQL review and validation visible before execution.
