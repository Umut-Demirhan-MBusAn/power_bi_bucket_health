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
| PBH-003 | Review | Power BI host contract | Codex/User | `docs/VISUAL_CONTRACT.md` defines data roles, mappings, formatting objects, privileges, and interaction requirements. | Updated from Claude Design handoff; pending business column/status confirmation. |
| PBH-004 | Review | Technical architecture | Codex/User | `docs/ARCHITECTURE.md` and `docs/SYSTEM_ARCHITECTURE.md` define rendering approach, module boundaries, state model, data parser, testing plan, and performance strategy. | System architecture drafted from handoff. |
| PBH-005 | Not Started | Resolve visual behavior questions | User | Key open questions on data shape, layout, ordering, alarm restart, audio, and Power BI interactions are answered or deferred. | Required before scaffolding. |
| PBH-006 | Done | Resolve adaptive bucket geometry direction | User/Codex | Bucket viewpoint, fidelity target, renderer approach, and GET shape rules are defined well enough to prototype. | Resolved by handoff: front-on adaptive SVG with exact geometry constants. |
| PBH-007 | Done | Scaffold Power BI custom visual project | Codex | `pbiviz new` project exists with committed baseline, package scripts, lint/package commands, and no design-handoff runtime dependency. | Completed 2026-06-21 using visual name `BucketHealth`. |
| PBH-008 | Review | Implement data contract and parser | Codex | `capabilities.json` roles match `VISUAL_CONTRACT.md`; DataView parser produces normalized machine/component models and edge states. | Initial parser, summary render, and parser unit tests pass; needs Power BI Desktop smoke test. |
| PBH-009 | Review | Port adaptive bucket geometry engine | Codex | Pure TypeScript geometry functions reproduce handoff constants for body, teeth, lip shrouds, wing shrouds, hitch, guard, and alarm rings. | Pure engine and geometry unit tests pass; pending renderer integration. |
| PBH-010 | In Progress | Implement single-machine detail view | Codex | Detail view matches `Bucket.dc.html` layout, colors, typography, geometry, alarm graphics, audio control, and component tooltip behavior. | First SVG render slice implemented; tooltip behavior, audio control, and Desktop smoke test pending. |
| PBH-011 | Not Started | Implement fleet grid view | Codex | Fleet grid matches `Fleet.dc.html`, including column rules, vertical scroll, status legend, alarm-first sorting, and alarm card styling. | Depends on PBH-008/PBH-009. |
| PBH-012 | Not Started | Implement edge states | Codex | No-fields, loading, invalid-config, no-data, and error states match `States.dc.html` and suppress audio. | Can start after scaffold. |
| PBH-013 | Not Started | Implement alarm audio and transition controller | Codex | WebAudio alert arms on user gesture, plays 880/660 Hz pattern on fresh alarm transitions, dismisses on visual click, auto-stops at 120s, and respects reduced motion. | Requires Power BI Desktop/service verification. |
| PBH-014 | Not Started | Implement formatting pane settings | Codex | Layout, bucket, ordering, status mapping/colors, alarm, and motion settings parse into typed settings with defaults. | Depends on scaffold. |
| PBH-015 | In Progress | Add test and validation suite | Codex | Parser, status precedence, component counts, wing side assignment, alarm transitions, grid columns, geometry min/max, and edge-state logic have tests; `pbiviz lint` and `pbiviz package` pass. | Parser/status/wing-side/geometry unit tests added; remaining suite follows layout/alarm work. |
| PBH-016 | Done | Graphify repo setup | Codex | Codex Graphify instructions and hooks are configured; generated `graphify-out/` output is ignored. | Completed 2026-06-21. |
| PBH-017 | Done | Define data schema and mock CSV fixture | Codex | `docs/DATA_SCHEMA.md` defines source CSV columns and parser rules; a representative mock CSV exists and validates with the repo test command. | Completed 2026-06-21; supports PBH-008 parser implementation. |

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

- [ ] Product spec completed (blocked on PBH-005).
- [x] Visual contract drafted from design handoff.
- [x] System architecture drafted from design handoff.
- [ ] Open questions resolved or explicitly deferred (blocked on PBH-005).

### M2 - Scaffold And Prototype

Goal: scaffold the `pbiviz` project and build the first working visual slice.

Deliverables:

- [x] `pbiviz new` project created.
- [x] DataView parser implemented.
- [x] Minimal rendering path implemented.
- [x] Formatting model skeleton implemented.
- [x] `pbiviz lint` and `pbiviz package` pass.
- [x] Mock data fixture validates against documented schema.

### M3 - Design Handoff Parity

Goal: implement the approved Claude Design handoff faithfully.

Deliverables:

- [ ] Single-machine detail matches `Bucket.dc.html`.
- [ ] Fleet grid matches `Fleet.dc.html`.
- [ ] Edge states match `States.dc.html`.
- [ ] Alarm/audio behavior matches `IMPLEMENTATION.md`.
- [ ] Screenshots captured for parity review.

## Open Questions

The detailed question list is in [docs/SPEC.md](docs/SPEC.md). Highest-priority decisions:

- Confirm real source column names and exact status source values.
- Confirm final business column names for supplied lip shroud rows and wing order values.
- Confirm whether the approved front-on SVG handoff fully satisfies "masterclass" visual quality.
- Confirm audio behavior in the target Power BI Desktop/service environment.
- Confirm whether Power BI selection/cross-filter/drill behavior is required.
- Confirm whether the visual is internal-only or AppSource/certification-bound.

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-20 | Created initial backlog for spec-driven Power BI visual development. |
| 2026-06-20 | Drafted first machine bucket health visual spec, visual contract, and architecture notes from user requirements. |
| 2026-06-20 | Added adaptive high-fidelity 3D-style bucket geometry requirement driven by GET counts. |
| 2026-06-21 | Integrated Claude Design handoff into host contract, system architecture, spec, and implementation backlog. |
| 2026-06-21 | Configured Graphify for Codex and ignored generated graph output. |
| 2026-06-21 | Added pre-scaffold testing setup, source data schema, mock CSV fixture, and fixture validator. |
| 2026-06-21 | Scaffolded `BucketHealth` Power BI visual and added initial table DataView parser. |
| 2026-06-21 | Added no-dependency Node unit tests for status normalization, parser behavior, and wing side assignment. |
| 2026-06-21 | Added pure adaptive bucket geometry engine and min/max/alarm geometry unit tests. |
