# Frontend Overview

This frontend is the current operational prototype for the World Cup project. It presents the SQL-backed dataset through focused sections and keeps Natural Query visible and reviewable instead of hiding SQL behind a chat-first shell.

## Frontend responsibilities

- show database readiness and lifecycle actions
- let users initialize SQL objects and manage the synthetic sample dataset
- browse editions, teams, groups, standings, matches, knockout, scorers, and history
- expose Natural Query as a secondary workflow with visible SQL review

The frontend does not own competition rules. It consumes backend responses.

## Lifecycle flow shown in the UI

The `Database` workspace reflects the backend lifecycle:

1. `Initialize database`
   - applies `sql/ddl.sql`
   - applies `sql/synthetic_support.sql`
   - applies `sql/queries.sql`
2. `Populate synthetic data`
   - loads the canonical sample dataset through the SQL synthetic-support functions
3. `Apply reporting queries`
   - reapplies the reporting layer when needed
4. `Remove synthetic data`
   - cleans only the active tracked synthetic batch

## Common local commands

- `make dev-client`
- `make dev`

## Main workspace sections

- `Database`
- `Overview`
- `Teams`
- `Groups`
- `Matches`
- `Knockout`
- `Top Scorers`
- `History`

There is also a Natural Query drawer for AI-assisted SQL planning and controlled execution.

## Data flow

### Structured data

- browser calls `/api/world-cup/...`
- the Next.js proxy forwards the request to FastAPI
- FastAPI calls the SQL layer

### Natural Query

- the frontend checks provider status through the backend
- the backend generates a SQL proposal
- the proposal stays visible for review
- execution happens only through the controlled backend path

## Design stance

- structured, domain-first navigation
- dense operational views
- theme-safe `shadcn/ui` primitives
- SQL transparency in the AI-assisted flow

## Notes

- Read the root [README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/README.md) for the full project summary.
- Read [app/README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/app/README.md) for backend details.
