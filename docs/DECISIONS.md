# Decisions

Record durable decisions here. Use short entries; link to spec/backlog items when useful.

## Template

### YYYY-MM-DD - Title

Status: Proposed / Accepted / Superseded

Decision:

Context:

Consequences:

## Accepted Decisions

### 2026-06-20 - Use spec-driven development

Status: Accepted

Decision: Maintain product requirements, host contract, architecture, and backlog documents before
implementation work.

Context: The project is a complex Power BI custom visual and needs clear behavior, data mapping,
interaction, and acceptance criteria before scaffolding and implementation.

Consequences: Agents must read and update `BACKLOG.md` and the relevant docs before making
substantive code changes.

### 2026-06-21 - Use Claude Design handoff as visual source of truth

Status: Accepted

Decision: Treat `docs/design_handoff_bucket_health` as the visual fidelity and behavior reference
for the first implementation.

Context: The handoff includes single-machine, fleet, and edge-state designs plus implementation
details for data roles, geometry math, status colors, audio behavior, and responsive layout.

Consequences: Implementation should port the handoff logic into typed Power BI visual modules rather
than shipping or depending on the `.dc.html` design files.

### 2026-06-21 - Use SVG-first adaptive bucket rendering

Status: Accepted

Decision: Implement the bucket and GET components as generated SVG using deterministic geometry
functions.

Context: The design handoff is SVG-based and gives exact constants for front-on adaptive bucket
geometry. The worst-case rendered element count is moderate enough for SVG-first implementation.

Consequences: Keep geometry generation as pure TypeScript, test it with min/max component counts, and
consider canvas/WebGL only if SVG fails measured performance or fidelity targets.

### 2026-06-21 - Use table DataView mapping

Status: Accepted

Decision: Use Power BI's `table` DataView mapping instead of `categorical` mapping.

Context: The visual requires reading multiple fields together per logical record (one row = one GET component status for one machine). Table mapping matches this contract perfectly and simplifies parsing of optional tooltip fields.

Consequences: The internal parser will normalize the flat table rows into the typed `MachineBucketModel` and `ComponentRecord` structures. Categorical mapping will only be considered if report author field well UX demands it.
