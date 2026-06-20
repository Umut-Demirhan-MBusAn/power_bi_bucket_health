---
name: spec-driven-workflow
description: Use for spec-driven project work: update BACKLOG.md, product spec, Power BI visual contract, architecture, decisions, and acceptance criteria before implementation.
---

# Spec-Driven Workflow

Use this skill before non-trivial project work.

## Start

1. Read `BACKLOG.md`.
2. Identify or create the backlog item for the work.
3. Read only the relevant docs:
   - `docs/SPEC.md` for user-visible behavior.
   - `docs/VISUAL_CONTRACT.md` for Power BI host contract changes.
   - `docs/ARCHITECTURE.md` for implementation structure.
   - `docs/DECISIONS.md` for durable decisions.
   - `docs/RESEARCH.md` for sourced facts.
4. Move the backlog item to `In Progress` when work starts.

## During Work

- Keep the implementation within the accepted spec and visual contract.
- Add open questions instead of guessing.
- Record durable decisions in `docs/DECISIONS.md`.
- Update acceptance criteria when scope changes.

## Finish

1. Mark the backlog item `Review` or `Done`.
2. Add validation evidence or note why validation could not run.
3. Confirm docs and implementation agree.
