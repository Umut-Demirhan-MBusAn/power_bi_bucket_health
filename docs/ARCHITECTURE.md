# Architecture

As-built implementation architecture for the Bucket Health Power BI custom visual. For the host
contract (data roles, formatting objects, privileges, geometry constants) see
[VISUAL_CONTRACT.md](VISUAL_CONTRACT.md); for user-visible behavior see [SPEC.md](SPEC.md).

## Principles

- Host contract first: `capabilities.json` and [VISUAL_CONTRACT.md](VISUAL_CONTRACT.md) define the
  boundary; rendering code never reads raw host objects.
- Typed parser boundary: every Power BI `DataView` is converted into an internal model before
  rendering.
- Deterministic geometry: bucket shapes are computed from component counts by pure functions, so
  they are testable without a DOM or host.
- Alarm/audio state is isolated from rendering and testable on its own.

## Runtime Layers

```text
Power BI Host
  |
  v
Visual entry point (src/visual.ts)
  - IVisual.update(options), rendering events API
  - Host services: selection manager, context menu, color palette (high contrast)
  - Custom HTML tooltip, keyboard navigation, alarm audio wiring
  |
  v
Data adapter (src/data/)
  - Role validation, row parsing, status normalization
  - Machine derivation and edge-state decision
  |
  v
Domain model (src/data/types.ts, src/domain/)
  - MachineBucketModel[] / ComponentRecord[]
  - Status metadata & machine-status reduction, wing side assignment
  |
  v
State services (src/audio/)
  - AlarmController: alarm-identity dedup (machine + component + alarmTime)
  - AlarmAudio: WebAudio two-tone beep, gesture arming, 60 s auto-stop
  |
  v
Geometry (src/geometry/)
  - Adaptive bucket geometry from GET counts (pure TypeScript)
  |
  v
Renderer (src/rendering/)
  - Fleet grid, machine card, bucket SVG, edge states
```

## Source Structure

```text
src/
  visual.ts                 # IVisual entry point; host services, selection, keyboard,
                            # context menu, custom HTML tooltip
  settings.ts               # Formatting model (layout, ordering, alarm)
  audio/
    alarmController.ts      # Alarm-identity dedup (machine + component + alarmTime)
    alarmAudio.ts           # WebAudio two-tone beep, gesture arming, 60 s auto-stop
  data/
    keys.ts                 # Composite key builder (JSON-encodes the parts array)
    normalizeStatus.ts      # Source strings -> canonical status keys; alarm predicate
    parseDataView.ts        # Role validation + row parsing + machine derivation
    types.ts                # ComponentRecord, MachineBucketModel, data-state union
  domain/
    statusMeta.ts           # Status colours/labels, high-contrast colors, machine-status reduction
    wingSideAssignment.ts   # Order -> left/right wing side (four modes)
    settingsGuards.ts       # Enum guards for persisted formatting values
  geometry/
    bucketGeometry.ts       # Adaptive bucket + GET geometry engine (pure functions)
    geometryTypes.ts
  rendering/
    renderBucketSvg.ts      # Bucket SVG from geometry + theme
    renderEdgeStates.ts     # The five non-normal states
    renderFleet.ts          # Flex-wrap fleet grid + truncation banner
    renderMachineCard.ts    # Card frame, header, alarm banner

capabilities.json           # Data roles, formatting objects, dataView mapping, privileges
style/visual.less           # Stylesheet (incl. alarm flashing + reduced-motion media query)
test/unit/                  # Node.js built-in test runner; jsdom for the rendering tests
scripts/
  gen-icon.js               # Regenerates assets/icon.png (pure Node.js, no deps)
  validate-mock-data.ps1    # Schema-validates the CSV fixture
```

Selection and tooltip wiring live inside `visual.ts` (not `rendering/`): the custom HTML tooltip
element, its positioning, and its content builder are all owned by the entry point.

## Data Flow

1. Power BI calls `visual.update(options)`. Once the visual has rendered, an update without the
   Data or Style flag (resize, view mode) stops here: the cards already fit by CSS.
2. `parseDataView` validates roles and parses table rows into the typed model, returning one of the
   data states: `noFields`, `invalidConfig`, `noData`, `error`, or `ready`. (A `loading` state
   exists in the union and renderer as a reserved branch, but the current synchronous parse path
   never produces it.)
3. Formatting settings are parsed from metadata into a typed settings object (with enum guards for
   persisted values).
4. For non-`ready` states the edge-state renderer draws guidance and all audio is suppressed.
5. For `ready` data, the geometry engine computes each machine's bucket once from its GET counts;
   the renderer draws uniform fixed-height, flex-wrapped cards whose width tracks the bucket aspect
   ratio (more teeth = wider). Wrapped cards scroll on overflow; there is no fixed column-count
   rule.
6. `AlarmController` compares previous and current alarms by stable alarm identity
   (machine + component + alarmTime) so each identity fires audio at most once per session.
7. The first ready render builds the fleet; later ones reconcile it card by card (`updateFleet`).
   Each card is keyed by machine and stores a signature of everything it draws (theme, minimum
   width, name, type, issues, and each component's key, order, status and wing side). A card with
   an unchanged signature keeps its DOM node, so focus, hover and running animations survive;
   changed cards are rebuilt, missing ones removed, and cards move only when the order changes.
   Focus inside a rebuilt card returns to the same component. Handlers live on the root element,
   so nothing is re-wired. An edge state replaces the whole subtree.

## Rendering Strategy

- SVG-first, hand-written DOM/SVG renderer — no rendering libraries. Geometry math
  is pure TypeScript and framework-agnostic.
- Resize strategy: uniform fixed-height cards flex-wrap to fill the available width; scroll
  overflow appears once the wrapped cards exceed the available space.
- Animation strategy: CSS-driven flashing for alarm components, controlled by the **Alarm motion**
  setting (`always` / `auto` / `never`). `always` (default) flashes regardless of the OS
  `prefers-reduced-motion` setting so a safety alarm is never silently suppressed; `auto` honors
  the OS setting by rendering a solid, still-prominent alarm; `never` is always solid. The alarm is
  never hidden and audio is governed independently.
- Tooltip strategy: a custom themed HTML tooltip element is rendered by the visual itself rather
  than calling the Power BI host tooltip service (the host tooltip cannot be themed to match the
  visual's design). It survives updates: an open tooltip is refreshed from the new model, or
  closed when its component is gone.
- Flash phase: every card sets `--bh-sync-<period>` to minus (timeline time mod period) when it is
  inserted, and each alarm animation uses it as its delay, so a rebuilt card flashes in step with
  the cards around it. A change of Alarm motion or of the OS reduced-motion setting restarts every
  animation at once, so all cards are re-synced then.
- High contrast: when the host palette reports high-contrast mode, decorative gradients are
  replaced by background fills with foreground outlines, and alarm components use the
  selected-foreground accent with a heavier stroke.

## Alarm And Audio Architecture

**AlarmController (alarm-identity dedup):**

- Builds a stable alarm identity per alarm from machine key + component key + alarmTime, JSON-encoded
  by `buildCompositeKey`.
- Caches every identity that has been seen; the same identity never fires audio twice, including
  after dismissal.
- Seeds the cache on the first render so pre-existing alarms do not beep when the report opens.
- A new alarmTime produces a new identity, which fires again while audio is armed.

**AlarmAudio (WebAudio beep):**

- Requires an explicit user-gesture click to arm/resume the audio context (browser autoplay
  policy).
- Square-wave two-tone pattern: 880 Hz then 660 Hz, ~0.24 s each, repeating every 1.5 s.
- Auto-stops after 60 s; stops on click anywhere inside the visual. Stopping closes the audio
  context, so the next alarm creates a new one.
- Suppressed in edge states and when the **Enable audio alarm** setting is off; a sounding alarm
  stops on the first update that turns the setting off or leaves the `ready` state, including an
  update that throws and shows the error state.

## Key Runtime Concerns

- Audio dismissal is visual-session state and never hides visual alarm indicators.
- Alarm machines sort to the front (movement before proximity, then alarm count, then source
  order), so layout stays stable enough to avoid reorder churn.
- Every component has a stable composite key so updates, selection, and alarm transitions are
  deterministic across machines with identical component names.
- Adaptive bucket geometry is deterministic from component counts, ordering, and settings; the
  geometry engine never touches the DOM.

## Performance

- Worst expected data: 20 machines × (20 teeth + 19 lip shrouds + 8 wing shrouds) ≈ 940 rows,
  comfortably under the 2000-row host cap declared in `capabilities.json` (see
  [VISUAL_CONTRACT.md › Data Limits](VISUAL_CONTRACT.md#data-limits)).
- A data update rebuilds only the cards whose signature changed; a DirectQuery refresh that only
  moves last-seen times rebuilds nothing. Resize and view-mode updates skip parsing entirely.

## Testing

See [TESTING.md](TESTING.md) for the test inventory and infrastructure (Node.js built-in runner,
jsdom for rendering tests) and the manual Developer Visual checklist. Validation gates: the
pre-PR gate in [AGENTS.md](../AGENTS.md) (`pbiviz package` runs the pbiviz lint).
