# Architecture

This file records how the visual will be implemented after the spec and host contract are clear.

## Principles

- Spec first: do not implement behavior that is not described in the spec or backlog.
- Host contract first: define `capabilities.json` before rendering code.
- Typed parser boundary: convert Power BI `DataView` objects into an internal model before rendering.
- Rendering code should not depend directly on raw host objects.
- Performance-sensitive paths should be measurable.

## Proposed Structure

```text
src/
  visual.ts                 # Power BI IVisual entry point
  data/                     # DataView parsing and validation
  rendering/                # SVG/canvas/HTML rendering
  formatting/               # Formatting model and settings
  interactions/             # Selection, tooltips, host services
  test/                     # Test helpers and fixtures
```

## Data Flow

1. Power BI calls `visual.update(options)`.
2. Host options and `DataView` are parsed into an internal typed model.
3. Formatting settings are parsed from metadata.
4. Renderer receives viewport, model, settings, and interaction callbacks.
5. Renderer updates DOM/SVG/canvas and cleans obsolete state.

## Rendering Strategy

- Primary renderer: `TBD`
- Libraries: `TBD`
- Resize strategy: `TBD`
- Animation strategy: `TBD`

## Testing Strategy

- Data parser unit tests.
- Formatting model tests.
- Interaction tests for selection/tooltips where practical.
- `pbiviz lint`.
- `pbiviz package`.
- Manual Developer Visual smoke test in Power BI.

## Performance Strategy

- Avoid full recompute when data/settings/viewport are unchanged.
- Define high-cardinality limits in `VISUAL_CONTRACT.md`.
- Measure representative render/update timings before release.

## Open Architecture Questions

- SVG, canvas, HTML, React, or hybrid?
- What data volume must be supported?
- Is AppSource certification required?
