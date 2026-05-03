# World Cup Project

> **Status:** Active
> This academic database project is currently maintained as a SQL-first prototype and course deliverable workspace.

World Cup Project is a SQL-first FIFA World Cup management system built for a database systems course. The current repository state already includes the PostgreSQL domain model, a thin FastAPI backend, and a Next.js operational frontend. Formal course-deliverable packaging is still pending.

## Summary

- SQL-first FIFA World Cup database project for an academic database systems deliverable.
- Solves relational modeling, integrity, reporting, synthetic data lifecycle, and controlled query execution by keeping PostgreSQL as the source of truth.
- Main implemented surfaces are `sql/`, a thin FastAPI backend in `app/`, a Next.js operational frontend in `client/`, and a Rich/Textual/Typer terminal package in `world_cup_terminal/`.
- Main stack: PostgreSQL, SQL functions/triggers/views, FastAPI, psycopg, Next.js, React, TypeScript, Rich, Textual, Typer, Ollama integration, and Makefile orchestration.
- Current status: active prototype and course workspace; final academic packaging artifacts are still pending.

## Motivation

- Demonstrate a database-first implementation of FIFA World Cup data and rules.
- Keep PostgreSQL as the source of truth for integrity, reporting, and validation.
- Provide a thin backend and operational frontend without duplicating business rules in application code.
- Support academic evaluation through clear SQL artifacts, verification scripts, and documented workflows.

Natural Query is secondary to the structured workflow. Generated SQL stays visible for review before execution.

## Features

The current backend + frontend prototype supports:

- database status inspection
- database initialization and query-layer reapplication
- synthetic dataset population and cleanup
- editions, teams, groups, standings, matches, knockout path, squads, events, top scorers, and team history
- Natural Query planning and controlled read-only SQL execution through the backend
- terminal-oriented query browsing through the `world-cup-terminal` package

## Tech Stack

- PostgreSQL schema, constraints, triggers, views, and SQL functions.
- FastAPI backend with psycopg for SQL lifecycle and domain endpoints.
- Next.js/React/TypeScript frontend for the operational prototype.
- Rich, Textual, and Typer terminal package for terminal-oriented exploration.
- Ollama integration for local Natural Query planning.
- Makefile orchestration for common local workflows.

## Getting Started

### Running Locally

**App-managed setup**

Use the current prototype workflow when you want the backend to prepare the database lifecycle objects:

1. Create the PostgreSQL database and configure the root `.env`.
2. Start the backend and frontend.
3. In the `Database` workspace, run `Initialize database`.

Common local commands:

- `make dev`
- `make dev-server`
- `make dev-client`

That action applies:

1. `sql/ddl.sql`
2. `sql/synthetic_support.sql`
3. `sql/queries.sql`

After that, `Populate synthetic data` loads the canonical sample dataset through `sql/dml.sql` semantics by calling `world_cup.fn_seed_synthetic_data()`.

**Manual SQL-first setup**

Use this order if you want to prepare the database directly with SQL scripts:

1. apply `sql/ddl.sql`
2. apply `sql/synthetic_support.sql`
3. apply `sql/queries.sql`
4. apply `sql/dml.sql`
5. optionally inspect `sql/verification.sql`

`sql/dml.sql` is intentionally the data-loading entrypoint only. Structural synthetic-support objects live in `sql/synthetic_support.sql`.

## Project Structure

- `sql/ddl.sql`: schema, keys, constraints, trigger functions, triggers, and SQL-side integrity rules
- `sql/synthetic_support.sql`: internal synthetic dataset support objects and lifecycle functions used by the app
- `sql/dml.sql`: canonical data-loading entrypoint for the synthetic sample dataset
- `sql/queries.sql`: SQL functions and views for the course queries
- `sql/verification.sql`: manual verification queries and integrity scenarios
- `app/`: thin FastAPI backend
- `client/`: operational frontend workspace
- `world_cup_terminal/`: terminal interface and query catalog package exposed as `world-cup-terminal`

## Architecture

The repository follows one clear rule: important business behavior belongs in PostgreSQL first.

- Schema design, foreign keys, `CHECK` constraints, and triggers define integrity.
- SQL functions and views define reporting behavior.
- FastAPI mainly opens connections, applies SQL scripts, calls `world_cup.fn_*`, and translates errors.
- The frontend consumes backend outputs instead of redefining competition rules in the browser.

## Technical Highlights

- Relational modeling is visible in SQL rather than hidden behind ORM-only application code.
- Trigger-backed integrity and SQL functions keep competition behavior close to the database.
- Natural Query keeps generated SQL visible for review before execution.
- The backend remains intentionally thin around PostgreSQL lifecycle and query artifacts.

## Current Status

- PostgreSQL is the source of truth for domain rules, integrity, standings, scorers, and controlled SQL validation.
- FastAPI exposes prepared SQL artifacts and database lifecycle actions without reimplementing competition rules.
- Next.js provides the current prototype workspace for browsing the dataset and using the Natural Query flow.
- The repository is already usable as an application prototype, but the final academic packaging artifacts are not part of this slice yet.

## Roadmap

The repository already emphasizes the database-heavy parts of the course brief:

- relational modeling
- SQL-enforced business rules
- trigger-based integrity
- SQL-backed reporting for the required course queries

What is still pending outside this slice:

- ER and relational-diagram delivery artifacts
- final course packaging files and zip structure
- the final CLI/TUI-oriented academic prototype path, if the team decides to add it

## Known Limitations

- Read `sql/` first if you want the real source of truth.
- Read [app/README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/app/README.md) for backend lifecycle details.
- Read [client/README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/client/README.md) for frontend workflow details.
