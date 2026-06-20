---
name: powerbi-visual-dev
description: Build, test, package, or review Power BI custom visuals in this repo using pbiviz, capabilities.json, DataView mappings, formatting models, Power BI visual MCP, and visual performance checks.
---

# Power BI Visual Development

Use this runbook for custom visual work in this repo.

## Start

1. Read [docs/POWERBI_VISUAL_TOOLING.md](../../../docs/POWERBI_VISUAL_TOOLING.md).
2. Confirm `pbiviz --version`.
3. If no visual is scaffolded yet, clarify the visual name, data roles, visual behavior, and expected
   interactions before running `pbiviz new`.

## Design Order

1. Define field wells and data roles.
2. Choose `categorical`, `table`, `matrix`, or `single` data view mapping.
3. Decide host interactions: selection, highlighting, sorting, drill, tooltips, filters, fetch more
   data, export, local storage, or web access.
4. Declare formatting pane objects in `capabilities.json`.
5. Build typed DataView parsing before rendering.
6. Render with D3/canvas/SVG/React only as needed.

## Validation

- `pbiviz lint`
- Unit tests if configured
- `pbiviz package`
- `pbiviz start` smoke test in Power BI Developer Visual
- For performance-sensitive visuals, measure update/render time with representative high-cardinality
  data.
