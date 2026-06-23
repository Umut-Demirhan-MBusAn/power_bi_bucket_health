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
| PBH-008 | Done | Implement data contract and parser | Codex | `capabilities.json` roles match `VISUAL_CONTRACT.md`; DataView parser produces normalized machine/component models and edge states. | Parser, data contract, and unit tests complete. Alarm sort applied. |
| PBH-009 | Done | Port adaptive bucket geometry engine | Codex | Pure TypeScript geometry functions reproduce handoff constants for body, teeth, lip shrouds, wing shrouds, hitch, guard, and alarm rings. | Pure geometry engine complete with unit tests. Hitch constants now in bucketGeometryConstants. |
| PBH-010 | Done | Implement single-machine detail view | Codex | Detail view matches `Bucket.dc.html` layout, colors, typography, geometry, alarm graphics, audio control, and component tooltip behavior. | SVG rendering, alarm rings, tooltip wiring via host.tooltipService, and alarm/watermark overlap fixed. |
| PBH-011 | Done | Implement fleet grid view | Codex | Fleet view matches `Fleet.dc.html`, with uniform fixed-height cards that flex-wrap (each card's width tracks its bucket aspect ratio), scroll on overflow, status legend, alarm-first sorting, and alarm card styling. | Flex-wrap proportional layout supersedes the old fixed column rules (see DECISIONS 2026-06-23). Alarm sort applied. |
| PBH-012 | Done | Implement edge states | Codex | No-fields, loading, invalid-config, no-data, and error states match `States.dc.html` and suppress audio. | Edge states (noFields, loading, invalidConfig, noData, error) implemented in renderEdgeStates.ts. |
| PBH-013 | Done | Implement alarm audio and transition controller | Codex | WebAudio alert arms on user gesture, plays 880/660 Hz pattern on fresh alarm transitions, dismisses on visual click, auto-stops at 120s, and respects reduced motion. | AlarmAudio (WebAudio 880/660Hz) and AlarmController (transition detection) implemented. Dismiss on click wired in visual.ts. |
| PBH-014 | Done | Implement formatting pane settings | Codex | Layout, bucket, ordering, status mapping/colors, alarm, and motion settings parse into typed settings with defaults. | Formatting model with Layout (minCardWidth), Ordering (wingSideAssignment), and Alarm (audioEnabled, reducedMotion) cards. |
| PBH-015 | Done | Add test and validation suite | Codex | Parser, status precedence, component counts, wing side assignment, alarm transitions, grid columns, geometry min/max, and edge-state logic have tests; `pbiviz lint` and `pbiviz package` pass. | columnCount and alarm-sort tests added. All unit tests pass. |
| PBH-016 | Done | Graphify repo setup | Codex | Codex/Claude Graphify instructions and hooks are configured; generated `graphify-out/` output is ignored. | Completed 2026-06-21; refreshed 2026-06-22 with shared Graphify hook guidance. |
| PBH-017 | Done | Define data schema and mock CSV fixture | Codex | `docs/DATA_SCHEMA.md` defines source CSV columns and parser rules; a representative mock CSV exists and validates with the repo test command. | Completed 2026-06-21; supports PBH-008 parser implementation. |
| PBH-018 | In Progress | Accessibility & AppSource certification | Codex/User | Hard certification requirements pass (audit/eslint/no-external/rendering events); recommended features (keyboard, high-contrast, context menu, selection) implemented and Desktop-verified. | Compliance baseline met and alarm-motion accessibility resolved; see `docs/CERTIFICATION.md`. Remaining features need Power BI Desktop verification. |

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

- [x] Single-machine detail matches `Bucket.dc.html` (code complete; Desktop smoke test pending).
- [x] Fleet grid matches `Fleet.dc.html` (code complete; Desktop smoke test pending).
- [x] Edge states match `States.dc.html` (code complete).
- [x] Alarm/audio behavior matches `IMPLEMENTATION.md` (code complete; Desktop smoke test pending for WebAudio user-gesture requirement).
- [ ] Screenshots captured for parity review (requires Desktop run).

## Open Questions

The detailed question list is in [docs/SPEC.md](docs/SPEC.md). Highest-priority decisions:

- Confirm real source column names and exact status source values.
- Confirm final business column names for supplied lip shroud rows and wing order values.
- Confirm whether the approved front-on SVG handoff fully satisfies "masterclass" visual quality.
- Confirm audio behavior in the target Power BI Desktop/service environment.
- Confirm whether Power BI selection/cross-filter/drill behavior is required.
- Confirm whether the visual is internal-only or AppSource/certification-bound.
- Desktop smoke test in Power BI Developer Visual is still needed to verify audio playback requires user gesture.
- Formatting pane wingSideAssignment ItemDropdown may need capabilities.json objects definition update if Power BI rejects it.

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
| 2026-06-22 | Refreshed shared agent workflow and Graphify hook guidance for Codex/Claude. |
| 2026-06-22 | Fixed alarm sort (machines with alarms appear first in fleet). |
| 2026-06-22 | Fixed grid column rules to match spec (1/2/3-6/7-12/13-20 columns). |
| 2026-06-22 | Removed dead d3 dependency from package.json. |
| 2026-06-22 | Bumped capabilities.json dataReductionAlgorithm row cap to 2000. |
| 2026-06-22 | Added loading state to BucketHealthDataState type. |
| 2026-06-22 | Added HITCH_ORIGIN_X/Y to bucketGeometryConstants. |
| 2026-06-22 | Removed dead softShadow SVG filter. Fixed alarm/watermark overlap. |
| 2026-06-22 | Extracted rendering into renderFleet, renderMachineCard, renderEdgeStates modules. |
| 2026-06-22 | Added AlarmController and AlarmAudio for alarm transition detection and audio. |
| 2026-06-22 | Added wingSideAssignment setting to formatting pane. |
| 2026-06-22 | Wired Power BI tooltip service for component hover. |
| 2026-06-22 | `pbiviz lint` and `pbiviz package` pass with all new modules. |
| 2026-06-22 | Removed fleet title/summary and bucket name watermark; cards size proportional to tooth count. |
| 2026-06-22 | Added statusMeta (single source for status colors, labels, severity). |
| 2026-06-22 | Machine card frames colored by worst component status; alarm frames flash. |
| 2026-06-22 | Alarm components and rings flash; reduced-motion + prefers-reduced-motion disable animation. |
| 2026-06-22 | Center alarm shows animated icon only; alarm types + component names listed in top-left banner. |
| 2026-06-22 | Tooltips show human-readable status labels instead of canonical keys. |
| 2026-06-22 | Uniform card height; bucket scales to fit, width tracks tooth count. |
| 2026-06-22 | Replaced host/native tooltips with a single custom styled component tooltip. |
| 2026-06-22 | Fixed cross-machine component-key collision that showed wrong (OK) status in tooltips. |
| 2026-06-22 | Tooltip formats Last seen as full local date and time. |
| 2026-06-23 | Added alarmTime data role; audio dedups by machine+component+alarmTime id and never re-fires (incl. after dismiss); audio shortened to 1 minute. |
| 2026-06-23 | Strengthened alarm visuals: big flashing ALARM! chip, flashing component glow, removed alarm ring circles. |
| 2026-06-23 | Removed prefers-reduced-motion auto-disable so OS setting no longer suppresses alarm flashing (explicit reducedMotion toggle still applies). |
| 2026-06-23 | Removed dead alarm-ring geometry (AlarmRingGeometry, addAlarmRing, alarmRings field) left unused after the ring circles were dropped; alarmLabel now derived directly from components. |
| 2026-06-23 | Tech-debt cleanup: removed dead columnCount layout helper, unified the component-key separator, compute each card's bucket geometry once, arm audio on a user gesture, added CI, and reconciled docs (SPEC/VISUAL_CONTRACT/ARCHITECTURE/DECISIONS) with current behavior. |
| 2026-06-23 | Certification readiness: fixed eslint script to required form, verified npm audit + certification-audit + eslint clean; added tri-state Alarm motion setting (always/auto/never) to reconcile flashing with reduced-motion accessibility; documented full path in docs/CERTIFICATION.md. |
