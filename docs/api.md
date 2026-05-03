# API Documentation

## Base URL

```text
http://localhost:8000
```

Confirm the active port before relying on this URL in another environment.

## Health and Database Lifecycle

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/health` | Backend health check. |
| `GET` | `/database/status` | Inspect database readiness. |
| `POST` | `/database/setup` | Initialize database objects. |
| `POST` | `/database/reporting` | Apply reporting query objects. |
| `POST` | `/database/populate` | Populate the database. |
| `DELETE` | `/database/cleanup` | Clean the populated dataset. |
| `GET` | `/synthetic-data/status` | Alias for data readiness status. |
| `POST` | `/synthetic-data/populate` | Populate synthetic data. |
| `DELETE` | `/synthetic-data` | Remove synthetic data. |

## World Cup Data

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/editions` | List World Cup editions. |
| `GET` | `/editions/{edition_id}/teams` | List teams in an edition. |
| `GET` | `/editions/{edition_id}/groups` | List groups in an edition. |
| `GET` | `/groups/{group_id}/standings` | Read group standings. |
| `GET` | `/editions/{edition_id}/matches` | List matches in an edition. |
| `GET` | `/editions/{edition_id}/knockout` | Read knockout path data. |
| `GET` | `/editions/{edition_id}/teams/{team_id}/squad` | List a team squad. |
| `GET` | `/matches/{match_id}/events` | List match events. |
| `GET` | `/editions/{edition_id}/top-scorers` | List top scorers. |
| `GET` | `/teams/{team_id}/history` | Read team history. |

## Natural Query

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/natural-query/status` | Inspect assistant readiness. |
| `POST` | `/natural-query/generate` | Generate a SQL draft from a prompt. |
| `POST` | `/natural-query/plan-stream` | Stream planning state for a prompt. |
| `POST` | `/natural-query/execute` | Execute validated SQL. |

## Notes

- The backend is intentionally thin. Most domain behavior is implemented in SQL functions and validation helpers.
- Do not add write-capable generated SQL execution without updating the security model.
- Keep frontend route adapters aligned with this file when API paths change.
