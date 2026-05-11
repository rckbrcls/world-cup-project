# AGENTS.md

## Language policy

- Reply to Erick in Portuguese.
- Keep source code, comments, docstrings, terminal labels, and user-facing prototype strings in English unless explicitly requested otherwise.

## Hard restrictions

- Do not run build commands.
- Do not run application or prototype commands.
- Do not start servers.
- Do not introduce extra product surfaces outside the terminal prototype.

## Project intent

This repository implements the database systems course project described in `BD-Projeto-2026.pdf`.

The project must stay aligned with the course definition:

- PostgreSQL, necessarily.
- Python, necessarily for this implementation.
- Command-line prototype, not a web product.
- Local Ollama integration for natural-language-to-SQL.
- Eight formal delivery files in the required names.

## Source of truth

- PostgreSQL is the source of truth.
- Business rules belong in SQL first.
- Prefer schema design, foreign keys, `CHECK` constraints, SQL functions, views, and triggers over Python-side validation.
- Python should connect to PostgreSQL, collect parameters from the keyboard, call prepared SQL functions, display results, call Ollama for SQL planning, and report errors.
- Do not move competition rules into Python just for convenience.

## Current repository structure

- `sql/ddl.sql`: schema, types, tables, constraints, indexes, validation functions, and triggers.
- `sql/queries.sql`: SQL views and functions for the 10 mandatory reports.
- `sql/dml.sql`: direct demonstration data.
- `sql/verification.sql`: manual smoke checks and consistency checks.
- `world_cup_core/`: shared Python settings, database, SQL validation, and Ollama helpers.
- `world_cup_terminal/`: command-line prototype.
- `submission/`: staging folder for the required delivery file names.

## Domain scope

The model must cover these concepts from the PDF:

- confederations
- countries
- national teams
- players
- coaches
- referees
- host cities
- stadiums
- World Cup editions
- competition phases
- groups
- team participation by edition
- squad call-ups
- matches
- match officials
- match events

## Mandatory business rules

Keep these rules enforced at the data layer whenever possible:

- Every national team belongs to exactly one country.
- Every country belongs to exactly one confederation.
- Every World Cup edition has a year, host country, start date, and end date.
- An edition has one or more host cities.
- A host city has one or more stadiums.
- Every stadium belongs to exactly one host city.
- Every edition is composed of phases.
- Group-stage teams are distributed into lettered groups.
- A team can participate in many editions, but at most once per edition.
- Every team participating in an edition has exactly one responsible coach.
- A player can appear in different editions, but this project forbids switching national teams across editions.
- A call-up is tied to both an edition and a team.
- Every match belongs to exactly one edition, one phase, one stadium, and one kickoff timestamp.
- Every match involves exactly two distinct teams.
- Group-stage matches may end in a draw.
- Knockout or placement matches must declare a qualified winner.
- Penalties may decide tied knockout matches.
- A referee can perform only one role per match.
- Match scores store goals for both sides.
- Match events include goal, own goal, penalty goal, yellow card, red card, and substitution.
- Every match event belongs to one match and one moment in the game.
- Match events reference players according to event type.
- Group standings are computed from points, goal difference, and goals scored.
- Each edition records champion, runner-up, and optionally third place.

## Required query coverage

The SQL layer must continue supporting:

1. List all World Cup editions with year, host country, and champion.
2. List participating teams of a given edition.
3. List groups of an edition and the teams in each group.
4. Show group standings.
5. List matches of an edition with phase, date, stadium, and score.
6. Show the knockout path and qualified teams.
7. List the called-up squad of a team in a given edition.
8. List events of a match.
9. Show top scorers of an edition.
10. Show historical record of a team.

## Prototype rules

- The prototype must read database login parameters from the keyboard.
- It must execute all 10 mandatory SQL reports.
- It must connect to local Ollama.
- It must convert natural-language requests to SQL.
- It must show generated SQL before execution.
- It must handle database errors clearly.
- It must not depend on graphical-interface-specific behavior.

## Verification guidance

Prefer:

- static review of SQL schema and query coverage
- manual execution of `sql/verification.sql`
- direct PostgreSQL checks for constraints, triggers, and query outputs
- static checks that no web/API framework references were reintroduced

Do not treat Python as the place where database correctness is proven.
