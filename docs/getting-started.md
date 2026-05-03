# Getting Started

## Requirements

- Python 3.11 or newer.
- `uv` for Python dependency management.
- PostgreSQL.
- Node.js and pnpm for the Next.js client.
- Optional local model provider for Natural Query planning.

## Backend Installation

From the repository root:

```bash
uv sync
```

## Frontend Installation

From the repository root:

```bash
pnpm --dir client install
```

## Environment Setup

Copy `.env.example` to `.env` and configure the database/model provider values:

```bash
cp .env.example .env
```

The client also has local environment needs when pointing at the backend. Confirm any client-specific variables in `client/` before deployment.

## Running Locally

The Makefile defines:

```bash
make dev-server
make dev-client
make dev
```

The client package also defines:

```bash
pnpm --dir client dev
```

## Verification Scripts

The client package defines:

```bash
pnpm --dir client lint
pnpm --dir client typecheck
pnpm --dir client build
```

## Notes

- This documentation pass did not run install, dev, build, lint, typecheck, or test commands.
- Initialize and populate the database before relying on dashboard data.
