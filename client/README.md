# Frontend Overview

> **Status:** Active
> This frontend is currently maintained as the Next.js operational prototype for the World Cup project.

## Summary

- Next.js frontend for the SQL-first World Cup database prototype.
- Solves the operational UI for database readiness, setup actions, dataset browsing, and visible Natural Query review.
- Main stack: Next.js App Router, React, TypeScript, shadcn-style UI primitives, TanStack Query, AI SDK packages, and backend proxy routes.
- Current status: active prototype frontend that consumes FastAPI and SQL-backed outputs instead of owning competition rules.
- Technical value: keeps SQL transparent in the AI-assisted flow while still offering structured World Cup navigation.

## Overview

This frontend is the current operational prototype for the World Cup project. It presents the SQL-backed dataset through focused sections and keeps Natural Query visible and reviewable instead of hiding SQL behind a chat-first shell.

## Features

- show database readiness and lifecycle actions
- let users initialize SQL objects and manage the synthetic sample dataset
- browse editions, teams, groups, standings, matches, knockout, scorers, and history
- expose Natural Query as a secondary workflow with visible SQL review

The frontend does not own competition rules. It consumes backend responses.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- shadcn-style UI primitives
- TanStack Query
- AI SDK packages
- Same-origin proxy routes under `app/api`

## Getting Started

### Running Locally

- `make dev-client`
- `make dev`

## Usage

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

Main workspace sections:

- `Database`
- `Overview`
- `Teams`
- `Groups`
- `Matches`
- `Knockout`
- `Top Scorers`
- `History`

There is also a Natural Query drawer for AI-assisted SQL planning and controlled execution.

## Project Structure

```text
client/
├── app/                    # App Router routes and API proxy routes
├── components/home/        # Dashboard and World Cup workspace sections
├── components/natural-query/
├── components/ui/          # Local UI primitives
├── hooks/world-cup/        # Data hooks for domain views
└── lib/world-cup/          # Typed client helpers for backend data
```

## Architecture

### Data Flow

- browser calls `/api/world-cup/...`
- the Next.js proxy forwards the request to FastAPI
- FastAPI calls the SQL layer

- the frontend checks provider status through the backend
- the backend generates a SQL proposal
- the proposal stays visible for review
- execution happens only through the controlled backend path

## Technical Highlights

- Structured, domain-first navigation.
- Dense operational views.
- Theme-safe `shadcn/ui` primitives.
- SQL transparency in the AI-assisted flow.

## Known Limitations

- The frontend depends on the FastAPI backend and an initialized PostgreSQL database.
- Competition rules should remain in SQL and backend responses, not duplicated in browser state.
- Read the root [README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/README.md) for the full project summary.
- Read [app/README.md](/Users/erickpatrickbarcelos/codes/world-cup-project/app/README.md) for backend details.
