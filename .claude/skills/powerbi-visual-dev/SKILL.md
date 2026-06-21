---
name: powerbi-visual-dev
description: Build, test, package, or review Power BI custom visuals in this repo using pbiviz, capabilities.json, DataView mappings, formatting models, Power BI visual MCP, and visual performance checks.
---

# Power BI Visual Development

Use this runbook for custom visual work in this repo.

## Start

1. Read [BACKLOG.md](../../../BACKLOG.md).
2. Read [docs/SPEC.md](../../../docs/SPEC.md), [docs/VISUAL_CONTRACT.md](../../../docs/VISUAL_CONTRACT.md),
   [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md), and
   [docs/SYSTEM_ARCHITECTURE.md](../../../docs/SYSTEM_ARCHITECTURE.md) only as needed for the task.
3. Read [docs/POWERBI_VISUAL_TOOLING.md](../../../docs/POWERBI_VISUAL_TOOLING.md).
4. For visual parity or implementation tasks, read the relevant handoff file under
   [docs/design_handoff_bucket_health](../../../docs/design_handoff_bucket_health).
5. Confirm `pbiviz --version`.
6. If no visual is scaffolded yet, clarify the visual name, data roles, visual behavior, and expected
   interactions before running `pbiviz new`.
7. Update `BACKLOG.md` when status, deliverables, or blockers change.

## Design Order

1. Define field wells and data roles.
2. Choose `categorical`, `table`, `matrix`, or `single` data view mapping.
3. Decide host interactions: selection, highlighting, sorting, drill, tooltips, filters, fetch more
   data, export, local storage, or web access.
4. Declare formatting pane objects in `capabilities.json`.
5. Build typed DataView parsing before rendering.
6. Render with D3/canvas/SVG/React only as needed.

Current architecture decision: SVG-first. Port the handoff's parametric bucket geometry into pure
TypeScript functions and render with SVG. Do not ship or depend on the `.dc.html` files at runtime.

## Validation

- `pbiviz lint`
- Unit tests if configured
- `pbiviz package`
- `pbiviz start` smoke test in Power BI Developer Visual
- For performance-sensitive visuals, measure update/render time with representative high-cardinality
  data.
