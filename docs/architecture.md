# Architecture

## Overview

World Cup Project is a SQL-first database systems project. PostgreSQL owns the domain model, integrity rules, reporting functions, synthetic data lifecycle, and query validation. FastAPI exposes those SQL artifacts through HTTP, while the Next.js client provides an operational interface for browsing the dataset and reviewing Natural Query output.

## Goals

- Keep PostgreSQL as the source of truth for competition rules.
- Keep the backend thin and focused on orchestration.
- Make database lifecycle actions explicit.
- Keep generated SQL visible and validated before execution.
- Support both browser and terminal workflows.

## Non-Goals

- Reimplement standings, scorers, or competition rules in the frontend.
- Hide generated SQL behind a chat-only interface.
- Treat synthetic data as production data.

## System Components

### SQL Layer

`sql/ddl.sql`, `sql/dml.sql`, `sql/queries.sql`, `sql/synthetic_support.sql`, and `sql/verification.sql` define the database model, load data, expose reporting functions, and validate generated SQL.

### Backend

`app/main.py` exposes FastAPI routes for health checks, database setup, reporting setup, synthetic data lifecycle, read-only World Cup views, and Natural Query planning/execution.

### Frontend

`client/` is a Next.js app that displays database readiness, lifecycle actions, editions, teams, groups, standings, matches, knockout data, scorers, history, and Natural Query flows.

### Terminal

`world_cup_terminal/` provides a Typer/Textual interface over the same project domain for terminal-first exploration.

## Data Flow

1. SQL files define schema, data, reporting functions, and validation helpers.
2. FastAPI calls repository methods that execute controlled SQL against PostgreSQL.
3. The Next.js client calls backend endpoints and renders the returned rows.
4. Natural Query drafts SQL, validates it through database preflight checks, and executes only after review.

## Security Model

- Database credentials come from environment variables.
- Generated SQL must pass validation before execution.
- Database lifecycle endpoints can initialize, seed, or clean data and should not be exposed without an appropriate deployment boundary.
- Natural Query is designed as a reviewable assistant flow, not autonomous database write access.

## Trade-offs

- Keeping rules in SQL makes the academic database model clear, but requires contributors to read SQL artifacts before changing behavior.
- A thin backend reduces duplicated logic, but API behavior depends heavily on database functions staying stable.
- Natural Query improves exploration, but requires strict validation and visible SQL review.

## Future Improvements

- Add a formal deployment guide once the target environment is confirmed.
- Expand endpoint-level examples as the course deliverable stabilizes.
- Add screenshots for the dashboard and Natural Query workflow.
