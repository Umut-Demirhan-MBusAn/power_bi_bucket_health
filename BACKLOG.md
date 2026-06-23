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
| PBH-002 | Done | Product visual specification | Codex/User | `docs/SPEC.md` defines target users, problem, core workflows, visual states, interactions, and non-goals. | Completed; remaining open questions deferred as post-ship enhancements. |
| PBH-003 | Done | Power BI host contract | Codex/User | `docs/VISUAL_CONTRACT.md` defines data roles, mappings, formatting objects, privileges, and interaction requirements. | Finalized; capabilities.json fully declared with correct types. |
| PBH-004 | Done | Technical architecture | Codex/User | `docs/ARCHITECTURE.md` and `docs/SYSTEM_ARCHITECTURE.md` define rendering approach, module boundaries, state model, data parser, testing plan, and performance strategy. | Both docs reconciled with current implementation. |
| PBH-005 | Done | Resolve visual behavior questions | User/Codex | Key open questions on data shape, layout, ordering, alarm restart, audio, and Power BI interactions are answered or deferred. | Resolved through iterative implementation and user feedback. |
| PBH-006 | Done | Resolve adaptive bucket geometry direction | User/Codex | Bucket viewpoint, fidelity target, renderer approach, and GET shape rules are defined well enough to prototype. | Resolved: front-on adaptive SVG with exact geometry constants. |
| PBH-007 | Done | Scaffold Power BI custom visual project | Codex | `pbiviz new` project exists with committed baseline, package scripts, lint/package commands, and no design-handoff runtime dependency. | Completed 2026-06-21. |
| PBH-008 | Done | Implement data contract and parser | Codex | `capabilities.json` roles match `VISUAL_CONTRACT.md`; DataView parser produces normalized machine/component models and edge states. | Parser, data contract, and unit tests complete. Alarm sort applied. |
| PBH-009 | Done | Port adaptive bucket geometry engine | Codex | Pure TypeScript geometry functions reproduce handoff constants for body, teeth, lip shrouds, wing shrouds, hitch, guard. | Geometry engine complete with unit tests. |
| PBH-010 | Done | Implement single-machine detail view | Codex | Detail view matches handoff layout, colors, typography, geometry, alarm graphics, and component tooltip behavior. | SVG rendering complete. |
| PBH-011 | Done | Implement fleet grid view | Codex | Fleet view with uniform fixed-height cards, flex-wrap, overflow scroll, alarm-first sorting, and alarm card styling. | Alarm sort applied. |
| PBH-012 | Done | Implement edge states | Codex | All five states match handoff and suppress audio. | All states implemented with polished inline SVG icons and structured field-list guidance (2026-06-24). |
| PBH-013 | Done | Implement alarm audio and transition controller | Codex | WebAudio alert arms on user gesture, plays 880/660 Hz pattern on fresh alarm transitions, dismisses on click, auto-stops at 60s. | AlarmAudio and AlarmController complete. |
| PBH-014 | Done | Implement formatting pane settings | Codex | Layout, ordering (wing side + component direction), and alarm (audio + motion) settings parse into typed settings with defaults. | Three cards; all properties declared in capabilities.json with correct types. |
| PBH-015 | Done | Add test and validation suite | Codex | Parser, status precedence, component counts, wing side assignment, alarm transitions, and geometry tests pass; `pbiviz lint` and `pbiviz package` pass. | 41 unit tests passing. |
| PBH-016 | Done | Graphify repo setup | Codex | Graphify instructions and hooks configured; generated output ignored. | Completed 2026-06-21. |
| PBH-017 | Done | Define data schema and mock CSV fixture | Codex | `docs/DATA_SCHEMA.md` defines source CSV columns and parser rules; mock CSV validates. | Completed 2026-06-21. |
| PBH-018 | Done | Accessibility & AppSource certification | Codex/User | Hard certification requirements pass; all four recommended features (keyboard, high-contrast, context menu, selection) implemented. | PR #11 merged. Certification branch created at submission time. |
| PBH-019 | Done | Icon redesign | Codex | `assets/icon.svg` (300×300 source) and `assets/icon.png` (300×300 PNG) replaced with a mining bucket schematic showing GET components in status colours. | `scripts/gen-icon.js` — pure Node.js, no deps. |
| PBH-020 | Done | Privacy policy & support pages | Codex | `docs/privacy-policy.html` and `docs/support.html` written, committed, and published via GitHub Pages. URLs ready for Partner Center. | Privacy: `.../privacy-policy.html` · Support: `.../support.html` |
| PBH-021 | Done | README rewrite | Codex | `README.md` is AppSource/user-facing: features, data schema table, formatting pane docs, screenshots, and support links. | Replaced internal README with shipping-quality user guide. |
| PBH-022 | Done | Repo cleanup | Codex | Dead files removed (stray root `tooltips.png`, design handoff HTML prototypes in `docs/design_handoff_bucket_health/`); no TODO/FIXME in `src/`. | Removed; history preserved in git. |

## Milestones

### M0 - Project Baseline ✅
Repo structure, agent guidance, spec-driven operating model, and PBI tooling documented.

### M1 - Visual Definition ✅
Product spec, visual contract, architecture, and open questions resolved.

### M2 - Scaffold And Prototype ✅
`pbiviz new` project, DataView parser, rendering path, formatting model, and validation passing.

### M3 - Design Handoff Parity ✅
Single-machine view, fleet grid, edge states, and alarm/audio behavior all implemented.

### M4 - AppSource Submission Ready ✅ (engineering)
All accessibility features, polished landing page, icon, privacy/support pages, and repo clean-up complete.

**Remaining (owner action required):**
- Desktop smoke test in Power BI Developer Visual (all features)
- Build final `.pbiviz` (`npm run package`)
- Create `certification` branch (`git checkout main && git checkout -b certification && git push -u origin certification`)
- Submit on Partner Center with Privacy URL, Support URL, icon, and screenshots

## Open Questions

- Confirm real source column names and exact status string values with the business.
- Desktop smoke test needed: WebAudio user gesture, selection/cross-filter, keyboard nav, high-contrast, context menu.

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-20 | Created initial backlog for spec-driven Power BI visual development. |
| 2026-06-20 | Drafted first machine bucket health visual spec, visual contract, and architecture notes from user requirements. |
| 2026-06-20 | Added adaptive high-fidelity 3D-style bucket geometry requirement driven by GET counts. |
| 2026-06-21 | Integrated Claude Design handoff into host contract, system architecture, spec, and implementation backlog. |
| 2026-06-21 | Configured Graphify and ignored generated output. |
| 2026-06-21 | Added pre-scaffold testing setup, source data schema, mock CSV fixture, and fixture validator. |
| 2026-06-21 | Scaffolded `BucketHealth` Power BI visual and added initial table DataView parser. |
| 2026-06-21 | Added no-dependency Node unit tests for status normalization, parser behavior, and wing side assignment. |
| 2026-06-21 | Added pure adaptive bucket geometry engine and min/max/alarm geometry unit tests. |
| 2026-06-22 | Refreshed shared agent workflow and Graphify hook guidance. |
| 2026-06-22 | Fixed alarm sort; fixed grid column rules; removed dead d3 dependency; bumped row cap to 2000. |
| 2026-06-22 | Added loading state; fixed alarm/watermark overlap; extracted rendering modules. |
| 2026-06-22 | Added AlarmController and AlarmAudio; wired tooltip service; all `pbiviz lint` / `pbiviz package` passing. |
| 2026-06-22 | Cards size proportional to tooth count; statusMeta added; alarm frames flash; tooltips show human-readable labels. |
| 2026-06-22 | Uniform card height; custom styled component tooltip; fixed cross-machine component-key collision. |
| 2026-06-23 | alarmTime data role; audio dedup; audio shortened to 60 s; alarm visuals strengthened. |
| 2026-06-23 | Removed prefers-reduced-motion auto-disable; removed dead alarm-ring geometry. |
| 2026-06-23 | Tech-debt cleanup; CI added; docs reconciled. |
| 2026-06-23 | Certification readiness: eslint script fixed; npm audit + certification-audit + eslint clean; tri-state Alarm motion. |
| 2026-06-23 | High-contrast, selection, keyboard navigation, and context menu implemented (PR #11). |
| 2026-06-23 | Settings persistence fixed; scroll position preserved; NO DATA badge color fixed; scrollbar themed. |
| 2026-06-24 | Redesigned icon: 300×300 mining bucket PNG (scripts/gen-icon.js, no deps). |
| 2026-06-24 | Polished landing page: inline SVG icons for all five edge states; field-list guidance for noFields/invalidConfig. |
| 2026-06-24 | Added docs/privacy-policy.html and docs/support.html for AppSource submission. |
| 2026-06-24 | Rewrote README.md as user/AppSource-facing guide. |
| 2026-06-24 | Removed stray root tooltips.png and docs/design_handoff_bucket_health/ (design handoff served its purpose). |
