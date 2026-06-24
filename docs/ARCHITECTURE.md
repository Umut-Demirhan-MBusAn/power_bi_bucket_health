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

As built:

```text
src/
  visual.ts                 # IVisual entry point; host services, selection, keyboard, context menu
  settings.ts               # Formatting model (layout, ordering, alarm)
  data/                     # DataView parsing, validation, normalization, status mapping
  domain/                   # Status metadata/colours and wing-side assignment
  geometry/                 # Adaptive bucket and GET component SVG geometry
  rendering/                # SVG/HTML rendering: fleet, machine card, bucket SVG, edge states, tooltip
  audio/                    # AlarmController + WebAudio beep (AlarmAudio)

capabilities.json           # Data roles, formatting objects, dataView mapping, privileges
style/visual.less           # Stylesheet (incl. alarm flashing + reduced-motion media query)
test/unit/                  # Node.js unit tests (no framework, no DOM)
```

Layout/card sizing and selection/tooltip wiring live inside `rendering/` and `visual.ts` rather than
in separate `layout/` or `interactions/` directories.

## Data Flow

1. Power BI calls `visual.update(options)`.
2. Host options and `DataView` are parsed into an internal typed model.
3. Formatting settings are parsed from metadata.
4. Renderer receives viewport, model, settings, and interaction callbacks.
5. Layout uses uniform fixed-height, flex-wrapped cards; each card's width tracks its bucket aspect
   ratio (more teeth = wider), and there is no fixed column-count rule. Wrapped cards scroll on
   overflow.
6. Geometry engine computes the adaptive bucket body, cutting edge, side plates, teeth, lip shrouds,
   and wing shroud shapes for each card once from its GET counts, and the resulting geometry is passed
   to the SVG renderer.
7. The alarm-id dedup controller compares previous and current alarms by stable alarm id
   (machine + component + alarmTime) so each alarm fires audio at most once.
8. Renderer updates DOM/SVG and cleans obsolete state.

## Rendering Strategy

- Primary renderer: SVG-first, matching the handoff prototypes. Canvas or WebGL/Three.js should be
  considered only if SVG fails performance/fidelity tests.
- Libraries: none for rendering — a minimal hand-written DOM/SVG renderer is used (D3 was removed).
  Geometry math is pure TypeScript and framework-agnostic.
- Resize strategy: uniform fixed-height cards flex-wrap to fill the available width, each card sized
  to its bucket aspect ratio (more teeth = wider). Scroll overflow appears once the wrapped cards
  exceed the available space; there is no fixed column-count rule.
- Animation strategy: CSS-driven flashing for alarm components, controlled by the **Alarm motion**
  setting (`always` / `auto` / `never`). `always` (default) flashes regardless of the OS
  `prefers-reduced-motion` setting so a safety alarm is never silently suppressed; `auto` honors the
  OS setting by rendering a solid, still-prominent alarm; `never` is always solid. The alarm is never
  hidden and audio is independent.
- Tooltip strategy: a custom themed HTML tooltip element is rendered by the visual itself rather than
  calling the Power BI host tooltip service.
- Geometry strategy: bucket shape is generated, not a static image. More GET components widen/extend
  the bucket edge and sides; fewer GET components shrink/rebalance the bucket while maintaining a
  polished front-on schematic with depth shading appearance.

## Key Runtime Concerns

- Alarm audio is gated by an alarm-id dedup controller: each alarm id (machine + component +
  alarmTime) fires audio at most once and never re-fires, including after dismissal. The first render
  seeds known ids without firing, and the audio context is armed/resumed by a user click.
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
- Test worst-case expected data: 20 machines and ~940 supplied GET component rows (the host row cap
  is 2000; see [VISUAL_CONTRACT.md › Data Limits](VISUAL_CONTRACT.md#data-limits)).

## Resolved Architecture Questions

- Renderer: a minimal hand-written DOM/SVG renderer is used; D3 was removed as a dependency.
- AppSource certification: yes — targeted; see [CERTIFICATION.md](CERTIFICATION.md).
- Selection / cross-filter / context menu / keyboard navigation: implemented (PR #11).
- Audio without a user gesture: not possible (browser autoplay policy); audio is armed on the first
  user click inside the visual.
