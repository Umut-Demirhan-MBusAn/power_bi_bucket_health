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
  - Derived counts, inferred lip shrouds, alarm summary
  |
  v
State Services
  - Alarm transition tracker
  - Audio alarm controller
  - Last-good-frame cache
  - Reduced-motion policy
  |
  v
Layout + Geometry
  - Fleet grid planner
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

```text
src/
  visual.ts
  capabilities.json
  settings.ts

  data/
    parseDataView.ts
    validateRoles.ts
    normalizeStatus.ts
    deriveMachines.ts
    types.ts

  domain/
    status.ts
    alarms.ts
    sorting.ts
    inferredComponents.ts

  geometry/
    bucketGeometry.ts
    toothGeometry.ts
    lipShroudGeometry.ts
    wingShroudGeometry.ts
    geometryTypes.ts

  layout/
    fleetGrid.ts
    cardSizing.ts
    viewMode.ts

  rendering/
    renderRoot.ts
    renderFleet.ts
    renderMachineCard.ts
    renderBucketSvg.ts
    renderStates.ts
    renderTooltip.ts
    styles.ts

  interactions/
    selection.ts
    tooltipService.ts
    drillNavigation.ts

  audio/
    audioAlarmController.ts
    webAudioBeep.ts

  test/
    fixtures.ts
    sampleData.ts
```

## Data Pipeline

1. `visual.update(options)` receives viewport, DataView, host state, and formatting metadata.
2. `validateRoles` determines whether the visual can render normal data or must render no-fields /
   invalid-config / no-data / error states.
3. `parseDataView` reads table rows using the roles in `VISUAL_CONTRACT.md`.
4. `normalizeStatus` maps source status values into canonical status keys:
   `ok`, `nodata`, `lockout`, `lockoutnd`, `prox`, `move`.
5. `deriveMachines` groups component rows by machine key.
6. `inferredComponents` derives lip shrouds as `teeth - 1`.
7. `alarms` calculates machine-level alarm counts and dominant alarm type.
8. The alarm transition tracker compares previous and current component status by stable component
   key.
9. Layout and geometry receive the domain model, viewport, and settings.
10. Renderer updates SVG/HTML and host tooltip/selection event handlers.

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

- 2 machines use 2 columns.
- 3-6 machines use 3 columns.
- 7-12 machines use 4 columns.
- 13-20 machines use 5 columns.
- Vertical scrolling is used when cards exceed available height.
- Alarm machines sort to front using `hasAlarm * 1000 + alarmCount`, ties by source order.
- Fleet cards do not show audio controls.
- Per-component tooltips are not required in fleet overview for the first build.

### Single-Machine Detail View

Rendered when one machine is present or when fleet card navigation targets one machine.

Rules:

- Card fills the visual while preserving bucket aspect ratio.
- Audio control is visible.
- Component hover tooltips are available.
- Alarm rings and center alarm graphic are visible when active.

## Adaptive Bucket Geometry

Use a deterministic SVG geometry engine based on the handoff constants.

Inputs:

- teeth count, clamped 4-20
- wing count per side, clamped 0-4
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
- alarm ring positions
- center alarm graphic position

Geometry invariants:

- Component sizes are fixed in SVG user units.
- Bucket width expands with teeth count.
- Bucket height expands with wing count.
- The top edge is 84% of cutting-edge width.
- The renderer scales the SVG to fit the card; the geometry engine should not mutate DOM directly.

## Alarm And Audio Architecture

### Alarm Transition Tracker

Responsibilities:

- Track previous canonical status per stable component key.
- Detect transition from non-alarm to `prox` or `move`.
- Ignore repeated updates where the same component remains in alarm.
- Reset only when a component clears and later re-enters alarm.

### Audio Alarm Controller

Responsibilities:

- Require explicit user gesture to arm audio.
- Use WebAudio square-wave two-tone pattern: 880 Hz then 660 Hz, approximately 0.24 seconds each,
  repeating every 1.5 seconds.
- Stop after 120 seconds.
- Stop on click anywhere inside the visual.
- Keep audio armed after dismissal.
- Restart for a fresh alarm transition while armed.
- Suppress audio in loading/error states and when reduced-motion preference is active.
  *(Note: The handoff README.md specifies suppressing audio entirely under reduced motion, whereas IMPLEMENTATION.md only mentions visual changes like freezing flash to solid. We follow the README.md and suppress audio entirely under reduced motion for safety and accessibility).*

## Rendering Strategy

Use SVG-first rendering.

Rationale:

- The handoff graphics are generated SVG.
- SVG supports crisp scaling, component hit targets, gradients, filters, and tooltips.
- Worst-case geometry is moderate: approximately 20 machines and fewer than 1,000 rendered GET
  shapes including inferred lip shrouds.
- SVG is simpler to test and maintain than WebGL for this front-on technical illustration.

D3 may be used for DOM joins and path updates, but the geometry math should remain framework-agnostic
pure TypeScript.

## Formatting Settings Architecture

Formatting model should map directly to the settings in `VISUAL_CONTRACT.md`:

- layout
- bucket
- ordering
- status mapping
- status colors
- alarm

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

Unit tests:

- status normalization and precedence
- role validation
- component row parsing
- machine grouping and inferred lip shrouds
- alarm transition detection
- fleet sort order
- grid column selection
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
7. Render fleet grid.
8. Add alarm transition/audio controller.
9. Add tooltip/selection behavior.
10. Add tests and packaging gate.

## Risks

- Power BI audio behavior may differ between Desktop and service due to browser/user-gesture policy.
- AppSource certification may reject or constrain audio behavior.
- Font loading from Google Fonts may not be acceptable; use bundled/system fallback if needed.
- The design handoff references `support.js`, but the checked-in handoff folder does not include it.
  Treat the HTML as design/reference source, not a runnable dependency.
