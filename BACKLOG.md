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
| PBH-002 | In Progress | Product visual specification | Codex/User | `docs/SPEC.md` defines target users, problem, core workflows, visual states, interactions, and non-goals. | First draft captured from user description; open questions remain. |
| PBH-003 | In Progress | Power BI host contract | Codex/User | `docs/VISUAL_CONTRACT.md` defines data roles, mappings, formatting objects, privileges, and interaction requirements. | First draft assumes component-level rows; needs confirmation. |
| PBH-004 | In Progress | Technical architecture | Codex/User | `docs/ARCHITECTURE.md` defines rendering approach, state model, data parser, testing plan, and performance strategy. | First draft updated with layout/alarm implications. |
| PBH-005 | Not Started | Resolve visual behavior questions | User | Key open questions on data shape, layout, ordering, alarm restart, audio, and Power BI interactions are answered or deferred. | Required before scaffolding. |
| PBH-006 | Not Started | Resolve adaptive bucket geometry direction | User/Codex | Bucket viewpoint, fidelity target, renderer approach, and GET shape rules are defined well enough to prototype. | Required before rendering implementation. |

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

The detailed question list is in [docs/SPEC.md](docs/SPEC.md). Highest-priority decisions:

- Confirm data grain: one row per component status, one row per machine snapshot, or another shape.
- Confirm data roles and whether component counts are inferred or supplied.
- Confirm exact bucket geometry and component ordering rules.
- Confirm adaptive 3D-style bucket viewpoint, fidelity target, and GET geometry rules.
- Confirm alarm priority, audio restart, and dismissal behavior.
- Confirm whether Power BI selection/cross-filter/drill behavior is required.
- Confirm whether the visual is internal-only or AppSource/certification-bound.

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-20 | Created initial backlog for spec-driven Power BI visual development. |
| 2026-06-20 | Drafted first machine bucket health visual spec, visual contract, and architecture notes from user requirements. |
| 2026-06-20 | Added adaptive high-fidelity 3D-style bucket geometry requirement driven by GET counts. |
