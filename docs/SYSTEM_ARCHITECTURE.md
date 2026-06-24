# System Architecture

This document defines the implementation architecture for the Power BI Bucket Health custom visual.
It translates the Claude Design handoff into buildable modules and data flow.

Design source:

- [design_handoff_bucket_health/README.md](design_handoff_bucket_health/README.md)
- [design_handoff_bucket_health/IMPLEMENTATION.md](design_handoff_bucket_health/IMPLEMENTATION.md)
- [design_handoff_bucket_health/Bucket.dc.html](design_handoff_bucket_health/Bucket.dc.html)
- [design_handoff_bucket_health/Fleet.dc.html](design_handoff_bucket_health/Fleet.dc.html)
- [design_handoff_bucket_health/States.dc.html](design_handoff_bucket_health/States.dc.html)

## Architecture Goals

- Recreate the design handoff faithfully in a Power BI custom visual.
- Keep Power BI host APIs isolated from rendering and business logic.
- Normalize every Power BI DataView into typed machine/component models.
- Generate bucket SVG geometry deterministically from GET counts and card dimensions.
- Keep alarm/audio behavior testable and separate from visual rendering.
- Handle edge states without crashing or starting stale audio.

## Runtime Layers

```text
Power BI Host
  |
  v
Visual Entry Point
  - IVisual.update(options)
  - Formatting model bridge
  - Host services: tooltip, selection, localization
  |
  v
Data Adapter
  - DataView validation
  - Role extraction
  - Status mapping
  - Component row normalization
  |
  v
Domain Model
  - MachineBucketModel[]
  - ComponentRecord[]
  - Derived counts, wing side assignment, alarm summary
  |
  v
State Services
  - Alarm identity tracker
  - Audio alarm controller
  - Last-good-frame cache
  - Reduced-motion policy
  |
  v
Layout + Geometry
  - Fleet flex-wrap layout
  - Machine card sizing
  - Adaptive bucket geometry generator
  |
  v
Renderer
  - Single-machine detail view
  - Multi-machine fleet view
  - Edge-state views
  - Tooltip/interaction wiring
```

## Proposed Source Structure

As built (the early plan below was consolidated — validation lives in `parseDataView.ts`, status
metadata/sorting in `statusMeta.ts`, and selection/tooltip wiring in `rendering/` + `visual.ts`,
rather than in separate `layout/`/`interactions/` directories):

```text
src/
  visual.ts
  settings.ts

  data/
    keys.ts
    normalizeStatus.ts
    parseDataView.ts        # role validation + row parsing + machine derivation
    types.ts

  domain/
    statusMeta.ts           # status colours/labels, machine-status precedence
    wingSideAssignment.ts

  geometry/
    bucketGeometry.ts
    geometryTypes.ts

  rendering/
    renderBucketSvg.ts
    renderEdgeStates.ts
    renderFleet.ts
    renderMachineCard.ts

  audio/
    alarmAudio.ts           # WebAudio two-tone beep
    alarmController.ts      # alarm-id dedup + audio trigger

capabilities.json
style/visual.less
test/unit/                  # status, parser, geometry, wing-side, alarm-controller tests
```

## Data Pipeline

1. `visual.update(options)` receives viewport, DataView, host state, and formatting metadata.
2. `validateRoles` determines whether the visual can render normal data or must render no-fields /
   invalid-config / no-data / error states.
3. `parseDataView` reads table rows using the roles in `VISUAL_CONTRACT.md`.
4. `normalizeStatus` maps source status values into canonical status keys:
   `ok`, `nodata`, `lockout`, `lockoutnd`, `prox`, `move`.
5. `deriveMachines` groups component rows by machine key.
6. `wingSideAssignment` derives left/right wing placement from component order and formatting settings.
7. `alarms` calculates machine-level alarm counts and dominant alarm type.
8. The alarm identity tracker builds an alarm id (machine + component + alarm time) for each active
   alarm and fires audio only for ids it has not seen before.
9. Layout and geometry receive the domain model, viewport, and settings.
10. Renderer updates SVG/HTML, a custom HTML tooltip overlay, and selection event handlers.

## Data Model

Use the normalized model defined in [VISUAL_CONTRACT.md](VISUAL_CONTRACT.md). The renderer must never
read raw Power BI `DataView` objects directly.

Important derived values:

- `teethCount`
- `lipShroudCount = teethCount - 1`
- `wingsPerSide`
- `hasAlarm`
- `alarmCount`
- `dominantAlarm`
- `sourceOrder`
- `sortPriority`

## View Modes

### Edge State View

Rendered when required roles/data are missing or invalid.

States:

- no fields bound
- loading
- invalid configuration
- no data
- error

Rules:

- No machine cards render.
- Audio is suppressed.
- Error state may keep the last good frame if available, but no new alarm audio starts.

### Fleet View

Rendered when two or more machines are present.

Rules:

- Cards have a uniform fixed height and wrap (flex-wrap); there is no fixed column-count rule.
- Each card's width tracks its bucket aspect ratio, so machines with more teeth render wider.
- Vertical scrolling is used when cards exceed available height.
- Alarm machines sort to the front (movement before proximity, then by alarm count, then source order).
- Fleet cards do not show audio controls; audio is armed by clicking anywhere in the visual.
- Per-component tooltips are available via a custom themed HTML overlay (not the host tooltip service).

### Single-Machine Detail View

Rendered when one machine is present or when fleet card navigation targets one machine.

Rules:

- Card fills the visual while preserving bucket aspect ratio.
- Component hover tooltips are available via a custom themed HTML overlay.
- When active, alarm components flash with a colored glow, the card frame flashes, the status chip
  shows a flashing "ALARM!", an animated center warning icon appears, and a top-left banner lists the
  alarm type and component names (joined with " - "). There are no alarm ring circles.

## Adaptive Bucket Geometry

Use a deterministic SVG geometry engine based on the handoff constants.

Inputs:

- teeth count, clamped 4-20
- derived wing count per side, clamped 0-4
- ordered component statuses
- card size/view mode

Outputs:

- `viewBox`
- body shell path
- cavity path
- cutting edge beam path
- spill guard rectangles
- hitch bracket transform
- tooth paths
- lip shroud rectangles
- wing shroud polygons
- center alarm position and dominant alarm label

Geometry invariants:

- Component sizes are fixed in SVG user units.
- Bucket width expands with teeth count.
- Bucket height expands with wing count.
- The top edge is 84% of cutting-edge width.
- The renderer scales the SVG to fit the card; the geometry engine should not mutate DOM directly.

## Alarm And Audio Architecture

### Alarm Identity Tracker

Responsibilities:

- Build a stable alarm id per alarm from machine key + component key + alarm time.
- Cache every alarm id that has fired; the same id never fires audio twice, including after dismissal.
- Seed the cache on the first render so pre-existing alarms do not fire on open.
- Treat a new alarm time as a new id, which fires while audio is armed.

### Audio Alarm Controller

Responsibilities:

- Require an explicit user-gesture click to arm and resume audio.
- Use WebAudio square-wave two-tone pattern: 880 Hz then 660 Hz, approximately 0.24 seconds each,
  repeating every 1.5 seconds.
- Stop after 60 seconds.
- Stop on click anywhere inside the visual.
- Keep audio armed after dismissal.
- Fire only for a new alarm id while armed (see Alarm Identity Tracker).
- Suppress audio in loading/error states.
  *(Reduced motion: the **Alarm motion** setting governs flashing — `always` (default) flashes regardless of the OS prefers-reduced-motion setting; `auto` honors it by showing a solid, still-prominent alarm; `never` is always solid. The alarm is never hidden, and audio is governed independently by the audio-enabled setting.)*

## Rendering Strategy

Use SVG-first rendering.

Rationale:

- The handoff graphics are generated SVG.
- SVG supports crisp scaling, component hit targets, gradients, filters, and tooltips.
- Worst-case geometry is moderate: ~20 machines and ~940 supplied GET component rows, within the
  2000-row host cap (see [VISUAL_CONTRACT.md › Data Limits](VISUAL_CONTRACT.md#data-limits)).
- SVG is simpler to test and maintain than WebGL for this front-on technical illustration.

D3 may be used for DOM joins and path updates, but the geometry math should remain framework-agnostic
pure TypeScript.

## Formatting Settings Architecture

Formatting model maps directly to the settings in `VISUAL_CONTRACT.md` (three cards only):

- layout (minimum card width)
- ordering (wing side assignment, teeth & lip order)
- alarm (enable audio, alarm motion)

There is no `bucket`, `status mapping`, or `status colors` card: geometry is adaptive and status
strings/colours are fixed.

Settings parsing must produce a typed settings object with defaults. Rendering modules should receive
the typed settings object, not raw Power BI formatting metadata.

## Edge-State Architecture

Edge-state detection order:

1. Loading
2. No DataView / no roles
3. Invalid required roles
4. Empty data after filters
5. Data parse error
6. Normal render

Audio suppression applies to states 1-5.

## Test Architecture

Pre-scaffold validation:

- CSV schema validation using `scripts/validate-mock-data.ps1`.
- Representative fixture data in `test/fixtures/bucket_health_components.csv`.
- Parser acceptance criteria documented in [docs/DATA_SCHEMA.md](DATA_SCHEMA.md).

Unit tests:

- status normalization and precedence
- role validation
- component row parsing
- machine grouping, lip shroud count validation, and wing side assignment
- alarm-id dedup (seed on first render, no re-fire of the same id)
- fleet sort order (alarm-first)
- machine card width from bucket aspect ratio
- bucket geometry at min/max teeth and wings
- edge-state decision logic

Integration/manual tests:

- `pbiviz lint`
- `pbiviz package`
- Developer Visual smoke test in Power BI
- screenshots for single-machine, fleet counts, alarm state, and edge states

## Implementation Phases

1. Scaffold `pbiviz` project.
2. Add capabilities/data roles and settings skeleton.
3. Build data parser and normalized model.
4. Port bucket geometry engine from design handoff.
5. Render edge states.
6. Render single-machine detail.
7. Render fleet (flex-wrap layout).
8. Add alarm-id dedup/audio controller.
9. Add tooltip/selection behavior.
10. Add tests and packaging gate.

## Risks

- Power BI audio behavior may differ between Desktop and service due to browser/user-gesture policy.
- AppSource certification may reject or constrain audio behavior.
- Font loading from Google Fonts may not be acceptable; use bundled/system fallback if needed.
- The design handoff references `support.js`, but the checked-in handoff folder does not include it.
  Treat the HTML as design/reference source, not a runnable dependency.
