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
  layout/                   # Responsive machine-card grid and bucket geometry
  geometry/                 # Adaptive bucket and GET component shape generation
  alarms/                   # Alarm transition tracking, audio, dismissal state
  test/                     # Test helpers and fixtures
```

## Data Flow

1. Power BI calls `visual.update(options)`.
2. Host options and `DataView` are parsed into an internal typed model.
3. Formatting settings are parsed from metadata.
4. Renderer receives viewport, model, settings, and interaction callbacks.
5. Layout engine computes machine card positions from viewport, machine count, card minimums, and
   alarm priority.
6. Geometry engine computes adaptive bucket body, cutting edge, side plates, teeth, lip shrouds, and
   wing shroud shapes from GET counts and card dimensions.
7. Alarm state compares previous and current component statuses by stable component key.
8. Renderer updates DOM/SVG/canvas and cleans obsolete state.

## Rendering Strategy

- Primary renderer: TBD. SVG is likely best for high-fidelity scalable bucket/component geometry and
  tooltips; canvas or WebGL/Three.js should be considered only if SVG cannot meet fidelity or
  performance requirements.
- Libraries: TBD; D3 subpackages are likely useful for geometry/selection, but avoid large
  all-in-one charting packages.
- Resize strategy: responsive layout engine chooses card grid and scaling from viewport dimensions.
  Use scroll overflow once cards would fall below configured minimum dimensions.
- Animation strategy: CSS or renderer-managed flashing for alarm components, with reduced-motion
  fallback.
- Geometry strategy: bucket shape is generated, not a static image. More GET components widen/extend
  the bucket edge and sides; fewer GET components shrink/rebalance the bucket while maintaining a
  polished 3D-style appearance.

## Key Runtime Concerns

- Alarm audio requires transition detection: non-alarm to `Proximity Alarm` or `Movement Alarm`.
- Audio dismissal is visual-session state and should not hide visual alarm indicators.
- Alarm machine priority changes card ordering, so layout must be stable enough to avoid confusing
  reorder churn.
- Tooltip data should be derived from the component record and optional user-bound fields.
- Every component should have a stable key so updates, animations, and alarm transitions are
  deterministic.
- Adaptive bucket geometry must be deterministic and testable from component counts, ordering,
  viewpoint, and card dimensions.

## Testing Strategy

- Data parser unit tests.
- Layout calculation tests for 1, 2, many, and overflow machine counts.
- Geometry tests for minimum/maximum teeth, lip shrouds, and wing shrouds.
- Component ordering tests for teeth, lip shrouds, and wing shrouds.
- Alarm transition/dismissal tests.
- Formatting model tests.
- Interaction tests for selection/tooltips where practical.
- `pbiviz lint`.
- `pbiviz package`.
- Manual Developer Visual smoke test in Power BI.

## Performance Strategy

- Avoid full recompute when data/settings/viewport are unchanged.
- Define high-cardinality limits in `VISUAL_CONTRACT.md`.
- Measure representative render/update timings before release.
- Test worst-case expected data: 20 machines and up to roughly 940 component records.

## Open Architecture Questions

- SVG, canvas, HTML, React, or hybrid?
- Should true 3D/WebGL be used, or should we create a pseudo-3D SVG technical illustration?
- What bucket reference/viewpoint should geometry match?
- What data volume must be supported?
- Is AppSource certification required?
- How reliable is audio playback in Power BI Desktop/service without an initial user gesture?
- Should machine-card reordering animate, happen instantly, or be disabled for accessibility?
