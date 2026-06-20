# Backlog

This is the source of truth for project tasks, deliverables, and status. Keep it current whenever
scope changes, work starts, work completes, or a blocker appears.

## Status Legend

- `Not Started`
- `In Progress`
- `Blocked`
- `Review`
- `Done`

## Current Focus

| ID | Status | Deliverable | Owner | Acceptance Criteria | Notes |
| --- | --- | --- | --- | --- | --- |
| PBH-001 | Done | Spec-driven documentation baseline | Codex | Repo has spec, backlog, visual contract, architecture, decision, and research docs wired into agent guidance. | Completed 2026-06-20. |
| PBH-002 | Not Started | Product visual specification | TBD | `docs/SPEC.md` defines target users, problem, core workflows, visual states, interactions, and non-goals. | Required before scaffolding. |
| PBH-003 | Not Started | Power BI host contract | TBD | `docs/VISUAL_CONTRACT.md` defines data roles, mappings, formatting objects, privileges, and interaction requirements. | Required before `pbiviz new` implementation work. |
| PBH-004 | Not Started | Technical architecture | TBD | `docs/ARCHITECTURE.md` defines rendering approach, state model, data parser, testing plan, and performance strategy. | Depends on PBH-002 and PBH-003. |

## Milestones

### M0 - Project Baseline

Goal: establish the spec-driven operating model and Power BI visual development environment.

Deliverables:

- [x] Repository connected to GitHub.
- [x] Power BI custom visual tooling documented.
- [x] Agent and MCP guidance added.
- [x] Spec/backlog documentation system created.

### M1 - Visual Definition

Goal: define what the custom visual must do before implementation starts.

Deliverables:

- [ ] Product spec completed.
- [ ] Visual contract completed.
- [ ] Architecture draft completed.
- [ ] Open questions resolved or explicitly deferred.

### M2 - Scaffold And Prototype

Goal: scaffold the `pbiviz` project and build the first working visual slice.

Deliverables:

- [ ] `pbiviz new` project created.
- [ ] DataView parser implemented.
- [ ] Minimal rendering path implemented.
- [ ] Formatting model skeleton implemented.
- [ ] `pbiviz lint` and `pbiviz package` pass.

## Open Questions

- What exact business problem should the visual solve?
- What is the intended report author/user workflow?
- What data shape should the visual accept?
- What interactions are required: selection, highlighting, drill, sorting, tooltips, filters?
- Is certification/AppSource submission a target, or is this an internal/private visual?

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-20 | Created initial backlog for spec-driven Power BI visual development. |
