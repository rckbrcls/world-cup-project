# AGENTS.md

## Project intent

This repository implements a FIFA World Cup management system for a database systems course, based on [`BD-Projeto-2026.pdf`](./BD-Projeto-2026.pdf).

The primary goal of the project is not to maximize application features. The primary goal is to model the domain correctly in PostgreSQL and express the main business rules through SQL artifacts.

## Core implementation policy

- PostgreSQL is the source of truth.
- The main business rules must be implemented on the SQL side.
- Prefer relational modeling, foreign keys, `CHECK` constraints, SQL functions, views, and triggers over Python-side validation.
- Python exists only as a thin API layer that receives parameters, calls prepared SQL functions, and returns results.
- Do not move core competition logic into Python just for convenience.
- If a rule can be enforced in the database, it should be enforced in the database.
- Frontend work is allowed, but frontend must consume and present existing domain rules instead of redefining them.
- Do not run build or run commands in this repository.

## Current repository structure

- `sql/ddl.sql`: schema, types, tables, constraints, indexes, trigger functions, and triggers
- `sql/dml.sql`: coherent demo data for two World Cup editions
- `sql/queries.sql`: the 10 mandatory queries required by the course, implemented as SQL functions/views
- `sql/verification.sql`: manual smoke queries and integrity scenarios
- `app/`: thin FastAPI layer that only exposes SQL functions through HTTP
- `client/`: Next.js frontend workspace using `shadcn/ui`, with theming required from day one

## Domain scope

The model must cover at least these concepts from the PDF:

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

## Business rules from the course brief

These rules are central and should remain enforced at the data layer:

- Every national team belongs to exactly one country.
- Every country belongs to exactly one confederation.
- Every World Cup edition has a year, a host country, a start date, and an end date.
- An edition can have one or more host cities.
- A host city can have one or more stadiums.
- Every stadium belongs to exactly one host city.
- Every edition is composed of phases.
- Group-stage teams are distributed into lettered groups.
- A team can participate in many editions, but at most once per edition.
- Every team participating in one edition must have exactly one responsible coach.
- A player can appear in different editions across the years.
- A player must never belong to more than one team in the same edition.
- A call-up must always be tied to both an edition and a team.
- Every match belongs to exactly one edition, one phase, one stadium, and one kickoff timestamp.
- Every match must involve exactly two distinct teams.
- Group-stage matches may end in a draw.
- Knockout or placement matches must declare a qualified winner.
- If a knockout match is tied after regular and extra time, penalties may decide the winner.
- A match may have a refereeing crew, but each referee can perform only one role per match.
- Match scores must store goals for both sides.
- Match events include at least goal, own goal, penalty goal, yellow card, red card, and substitution.
- Every match event belongs to one match and one moment in the game.
- A match event may reference a player depending on the event type.
- Group standings must be computed from points, goal difference, and goals scored.
- Each edition must record champion, runner-up, and optionally third place.

## Rules already reflected in the current SQL design

The current implementation already assumes and encodes these decisions:

- Team participation is edition-specific through `edition_team`.
- Player participation is edition-specific through `team_call_up`.
- Group standings are computed dynamically in SQL and are not stored manually.
- Top scorers count `GOAL` and `PENALTY_GOAL`.
- `OWN_GOAL` must not be counted as a goal for the player who generated the event.
- Group-stage matches cannot use penalty shootouts.
- Non-group matches cannot remain without a declared qualified team.
- Match events must reference only players that belong to the event team in that same edition.
- Host stadium usage must be compatible with the edition host-city list.

## Mandatory SQL-first enforcement

When adding or changing behavior, follow this order of preference:

1. Schema design
2. Foreign keys
3. `CHECK` constraints
4. Trigger functions
5. Reusable SQL functions or views
6. Thin Python route wiring
7. Frontend presentation and interaction

Do not implement important domain rules only in:

- FastAPI handlers
- Pydantic models
- frontend code
- ad hoc service-layer conditionals

Python should mostly do the following:

- open a database connection
- call `SELECT * FROM world_cup.fn_...`
- pass route parameters
- translate database exceptions into HTTP errors

## Required query coverage

The project must continue supporting these course queries through SQL:

1. List all World Cup editions with year, host country, and champion.
2. List the participating teams of a given edition.
3. List the groups of an edition and the teams in each group.
4. Show the group standings table.
5. List all matches of an edition with phase, date, stadium, and score.
6. Show the knockout path of an edition and the qualified teams in each phase.
7. List the called-up squad of a team in a given edition.
8. List the events of a match.
9. Show the top scorers of an edition.
10. Show the historical record of a team, including participations, final positions, matches, wins, draws, and losses.

## Current technical decisions

- Database: PostgreSQL
- API framework: FastAPI
- Frontend framework: Next.js
- Frontend component system: `shadcn/ui`
- SQL schema namespace: `world_cup`
- API routes should call prepared SQL functions instead of duplicating query logic in Python
- Demo data should remain coherent enough to demonstrate groups, knockout rounds, standings, top scorers, squad call-ups, and team history

## UI / Frontend Implementation Rules

### Core stance

- The UI MUST NOT look AI-generated, template-like, or like a generic SaaS starter.
- The UI MUST feel product-specific, domain-aware, and operational.
- Do not use vague directives such as "clean and modern", "sleek", "futuristic", "AI-native", or "beautiful" unless they are translated into concrete layout, component, and hierarchy decisions.
- This product is data-first and workflow-first. Clarity, hierarchy, and task completion MUST take priority over decorative flair.

### Forbidden patterns

- AVOID generic purple or indigo gradient hero sections.
- AVOID glassmorphism, heavy blur, floating glowing orbs, and neon effects unless there is a domain-specific reason.
- AVOID huge empty hero sections and marketing-style landing-page composition inside the app.
- AVOID generic three-card feature layouts.
- AVOID oversized border radius across the interface.
- AVOID excessively soft shadows and floaty cards.
- AVOID chat-first layouts for structured tasks.
- AVOID placeholder dashboards with meaningless metrics or decorative charts.
- AVOID generic AI copy such as "Ask AI anything", "Your intelligent copilot", or similar filler language.

### Interaction model

- Do not default to chat as the main UI.
- Chat or natural language input MUST be secondary and contextual.
- For structured or repeatable tasks, PREFER explicit UI first: tables, filters, tabs, segmented controls, forms, drawers, dialogs, sidebars, inspectors, timelines, command menus, quick actions, breadcrumbs, and search.
- Favor direct manipulation and clear task flows over conversational wrappers.
- Every screen MUST have a clear primary job.

### AI / Natural Query UX

- Local Ollama is the default provider for Natural Query.
- The frontend MUST reach Ollama through the existing backend proxy layer instead of calling local model runtimes directly from the browser.
- AI experiences MUST remain local-first whenever viable, without browser-side model download, WebGPU inference, warm-up flows, or model artifact caching in the client.
- The default local model is controlled by backend environment configuration, with `OLLAMA_MODEL` defaulting to `gemma4:4b` unless explicitly overridden by the operator.
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TIMEOUT_SECONDS` are backend-side operational settings and MUST NOT become user-facing configuration inside the Natural Query UI by default.
- AI MUST be contextual and secondary inside the product, never the dominant UI layer.
- The interface MUST explicitly support these model states: unavailable, ready, generating SQL, success, error, and canceled.
- SQL generation MUST remain separate from controlled SQL execution.
- Provider status MUST stay visible in the workspace, including the configured local model and whether the local Ollama server is reachable.
- AI surfaces MUST keep generated SQL visible for review instead of hiding core logic behind conversational responses.
- AI components MUST use `shadcn/ui` primitives whenever a close primitive already exists.
- AI panels, prompts, status surfaces, SQL previews, and results areas MUST obey the same design system, semantic tokens, and theming rules as the rest of the app from day one.
- Graceful degradation is mandatory when the local Ollama server or configured model is unavailable. The workspace must stay useful and explicit about why local execution is unavailable.

### Information density and hierarchy

- Optimize for scanability, hierarchy, and strong signal-to-noise ratio.
- PREFER dense, useful desktop layouts when the product is data-heavy.
- Do not waste above-the-fold space.
- Use typography, spacing, and layout to make primary actions obvious and secondary content quiet.
- If a screen is query-heavy or data-heavy, PREFER operational views such as tables, inspectors, result panes, timelines, histories, brackets, standings, logs, and entity detail views over generic dashboard filler.

### Product specificity

- Use domain language in labels, navigation, empty states, filters, and actions.
- Organize screens around real workflows, real objects, and real decisions in the product.
- Navigation and screen names SHOULD map to the actual domain: editions, teams, groups, standings, matches, events, squads, top scorers, and history.

### State design

- Every new screen and every major component MUST account for loading, empty, error, success, disabled, selected, hover, focus, pagination or overflow, no-results, filtered-empty, and permission or unavailable states.
- Do not ship happy-path-only UI.

### shadcn/ui rules

- Use `shadcn/ui` components whenever a close primitive already exists.
- Compose from `shadcn/ui` primitives before inventing custom components.
- If a custom component is necessary, document why existing `shadcn/ui` primitives were insufficient.
- PREFER `shadcn/ui` patterns for table, dialog, drawer, sheet, tabs, sidebar, chart, form, dropdown, tooltip, breadcrumb, command, scroll area, and other foundational UI.

### Theming rules

- Theming MUST exist from day one.
- Support light theme, dark theme, and system theme.
- Use CSS variables and semantic theme tokens.
- Use `next-themes` and `ThemeProvider` patterns when applicable.
- Do not hardcode one-off colors when a semantic token can express the intent.
- All components MUST remain theme-safe in both light and dark mode.

### Token and styling rules

- PREFER semantic tokens such as `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `border`, `input`, `ring`, `destructive`, and chart tokens.
- Keep radius, border, shadow, and motion restrained and consistent.
- Use a neutral base palette with one controlled accent color.
- Any expressive visual treatment MUST be justified by product meaning, not added just to look impressive.

### Accessibility and quality bar

- Maintain strong contrast and readable hierarchy.
- Avoid low-contrast text over gradients, images, or translucent surfaces.
- Keyboard, focus, and interactive states MUST be visible and deliberate.
- Prefer clarity over ornament.

### Benchmarking rules

- Benchmark against real products first.
- PREFER Mobbin and Page Flows as primary inspiration sources because they show real shipped screens and real flows.
- Do not use concept-shot galleries as the main benchmark source.
- When referencing inspiration, extract patterns and interaction logic, not superficial styling.

### Pre-ship checklist

- Is this using existing `shadcn/ui` components where possible?
- Does it work in light theme, dark theme, and system theme?
- Does it include loading, empty, error, and no-results states?
- Is the hierarchy obvious in under 5 seconds?
- Does it look like this product, or like a generic AI app?
- Is chat used only where chat is truly the right abstraction?

## Change guidelines for future work

- Preserve the SQL-first architecture.
- Extend `sql/ddl.sql` before adding Python-side logic.
- Extend `sql/queries.sql` before adding custom route-side SQL text.
- Keep API endpoints thin and predictable.
- Frontend must consume SQL-backed API outputs instead of redefining business rules.
- Prefer `shadcn/ui` primitives and semantic tokens in the frontend.
- When necessary to achieve the best technical result, it is allowed and encouraged to recommend installing well-chosen libraries or tools instead of forcing a custom implementation. Prefer mature, actively maintained libraries when they materially improve streaming, cancellation, observability, reliability, or developer experience.
- Keep all app strings and code in English.
- Reply to the user in Portuguese, but keep source code and app-facing strings in English unless explicitly requested otherwise.

## Verification guidance

When validating changes, prefer:

- static review of schema and SQL
- manual execution of `sql/verification.sql`
- direct verification of constraints, trigger behavior, and query outputs in PostgreSQL
- UI review against the frontend rules in this file, including theming and non-happy-path states

Avoid treating the Python layer as the place where business correctness is proven. In this repository, correctness should primarily come from the database model.
