# Security Policy

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report vulnerabilities privately to:

- Email: TODO

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Security Considerations

World Cup Project is SQL-first and includes PostgreSQL lifecycle actions, a FastAPI backend, a Next.js frontend, and Natural Query flows that plan and validate generated SQL.

Review these areas carefully:

- `DATABASE_URL` and local PostgreSQL credentials.
- Natural Query validation before executing generated SQL.
- Restricting generated SQL to controlled read-only behavior.
- Backend routes that initialize, reset, or seed database objects.
- Model provider configuration for local or hosted assistant behavior.

## Secrets

Never commit real secrets. Use `.env.example` as a template and keep local `.env` files untracked.
