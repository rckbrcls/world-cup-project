# Troubleshooting

## Database connection fails

Symptoms:

- `/database/status` returns an error.
- Backend startup succeeds but SQL routes fail.

Possible causes:

- `DATABASE_URL` is missing or points to the wrong PostgreSQL instance.
- PostgreSQL is not running.
- Required SQL objects have not been initialized.

Fix:

- Check `.env.example` and your local `.env`.
- Confirm the PostgreSQL server and database name.
- Use the database setup endpoint or documented setup flow before browsing data.

## Frontend cannot load data

Symptoms:

- The client loads but cards or tables stay empty.
- Database readiness actions fail.

Possible causes:

- The backend is not reachable from the client.
- The database has not been initialized or populated.
- CORS or local port assumptions changed.

Fix:

- Confirm the backend base URL used by the client.
- Check `/health` and `/database/status`.
- Reinitialize or repopulate the dataset if needed.

## Natural Query is unavailable

Symptoms:

- `/natural-query/status` reports the assistant is not ready.
- SQL generation fails before validation.

Possible causes:

- The configured model provider is not available.
- Ollama or another local model service is not running.
- The prompt produces SQL that fails validation.

Fix:

- Confirm model-provider configuration in the environment.
- Inspect the generated SQL before execution.
- Use the repair flow when validation returns actionable failure details.

## Ports are already in use

The `Makefile` contains cleanup logic for known local backend and client ports, but it intentionally refuses to stop unrelated processes.

Fix:

- Identify the process using the port.
- Stop only processes that belong to this project.
- Avoid killing unrelated local services.
