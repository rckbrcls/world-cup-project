# World Cup Database Project

Academic database project for SCC0640, based on `BD-Projeto-2026.pdf`.

The project models a FIFA World Cup management system in PostgreSQL and provides a Python command-line prototype for the required demonstrations.

## Scope

- PostgreSQL relational model for World Cup editions, teams, groups, matches, squads, referees, stadiums, events, and standings.
- SQL-first business rules through keys, constraints, functions, views, and triggers.
- Direct SQL data script for the demonstration dataset.
- Python terminal prototype that reads database login parameters, executes the 10 required reports, asks local Ollama to convert natural language to SQL, streams planning feedback, shows generated SQL before execution, and handles PostgreSQL errors.

This repository intentionally keeps the course sources directly in the project tree. Final packaging should be done only when the project is ready to send.

## Main Files

- `BD-Projeto-2026.pdf`: original course brief.
- `modeling/`: draw.io source diagrams and exported PDFs for the entity-relationship and relational models.
- `sql/ddl.sql`: schema, types, constraints, indexes, validation functions, triggers, and the 10 required reporting functions.
- `sql/dml.sql`: direct demonstration dataset.
- `sql/verification.sql`: optional manual smoke checks and consistency queries.
- `world_cup_core/`: shared Python database, settings, Ollama, and SQL validation helpers.
- `world_cup_terminal/`: command-line prototype.
- `INSTRUCOES.txt`: short execution instructions for the course delivery.

## Setup

Create a PostgreSQL database, then apply the SQL files in this order:

```bash
psql "$DATABASE_URL" -f sql/ddl.sql
psql "$DATABASE_URL" -f sql/dml.sql
```

Optional manual checks:

```bash
psql "$DATABASE_URL" -f sql/verification.sql
```

Install Python dependencies:

```bash
uv sync
```

The Python settings can be provided through `.env`:

```text
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/world_cup
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:4b
OLLAMA_TIMEOUT_SECONDS=60
```

## Prototype

Run the terminal prototype with:

```bash
uv run world-cup-terminal
```

or:

```bash
uv run python -m world_cup_terminal
```

The prototype asks for host, port, database, user, and password. It then offers:

- database status
- the 10 required SQL reports
- Natural Query chat through local Ollama, with streamed planning feedback
- controlled SQL execution with visible SQL and error handling

The Natural Query chat can also be opened directly:

```bash
uv run world-cup-terminal natural-query chat
```

Inside the chat, `run` executes only the latest validated SQL proposal, and
`exit` returns to the menu.

## Final Packaging

When preparing the final course zip, use the project sources directly:

- `modeling/entity-relationship.pdf` as `01.ER.pdf`
- `modeling/entity-relationship.xml` as `02.ER.xml`
- `modeling/relational-model.pdf` as `03.Relacional.pdf`
- `modeling/relational-model.xml` as `04.Relacional.xml`
- `sql/ddl.sql` as `05.DDL.sql`
- `sql/dml.sql` as `06.DML.sql`
- the Python project files as `07.Prototipo.zip`
- `INSTRUCOES.txt` as `08.Instrucoes.txt`
