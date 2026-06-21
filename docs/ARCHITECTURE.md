# Architecture

This file summarizes how the visual will be implemented. The detailed build architecture lives in
[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

Design source: [design_handoff_bucket_health](design_handoff_bucket_health/README.md).

## Principles

- Spec first: do not implement behavior that is not described in the spec or backlog.
- Host contract first: define `capabilities.json` before rendering code.
- Typed parser boundary: convert Power BI `DataView` objects into an internal model before rendering.
- Rendering code should not depend directly on raw host objects.
- Performance-sensitive paths should be measurable.
- The Claude Design handoff is the visual fidelity source of truth.

## Proposed Structure

```text
src/
  visual.ts                 # Power BI IVisual entry point
  capabilities.json         # Visual capabilities and data roles
  settings.ts               # Formatting model and settings

  data/                     # DataView parsing, validation, and normalization
  domain/                   # Domain logic (status, alarms, sorting, wing side assignment)
  geometry/                 # Adaptive bucket and GET component shape generation
  layout/                   # Responsive machine-card grid and card sizing
  rendering/                # SVG/HTML rendering (fleet, machine card, states, tooltips)
  interactions/             # Selection, tooltips, and drill navigation
  audio/                    # Audio alarm controller and WebAudio beep generation
  test/                     # Test helpers, fixtures, and sample data
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

- Primary renderer: SVG-first, matching the handoff prototypes. Canvas or WebGL/Three.js should be
  considered only if SVG fails performance/fidelity tests.
- Libraries: D3 subpackages may be used for DOM joins/path updates. Geometry math should stay pure
  TypeScript and framework-agnostic.
- Resize strategy: responsive layout engine chooses card grid and scaling from viewport dimensions.
  Use scroll overflow once cards would fall below configured minimum dimensions.
- Animation strategy: CSS or renderer-managed flashing for alarm components, with reduced-motion
  fallback.
- Geometry strategy: bucket shape is generated, not a static image. More GET components widen/extend
  the bucket edge and sides; fewer GET components shrink/rebalance the bucket while maintaining a
  polished front-on schematic with depth shading appearance.

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

- Pre-scaffold schema validation for CSV fixtures, documented in [TESTING.md](TESTING.md).
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
- Test worst-case expected data: 20 machines and about 940 supplied GET component rows.

## Open Architecture Questions

- Whether D3 should be used directly or whether a minimal DOM/SVG renderer is enough.
- Is AppSource certification required?
- How reliable is audio playback in Power BI Desktop/service without an initial user gesture?
- Should Power BI selection/cross-filter/drill behavior be implemented in the first build?
