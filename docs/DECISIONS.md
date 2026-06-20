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
