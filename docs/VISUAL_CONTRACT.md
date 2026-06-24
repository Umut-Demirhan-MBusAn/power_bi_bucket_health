# Power BI Visual Contract

This file defines the contract between Power BI and the visual. Update it before changing
`capabilities.json`, formatting settings, selections, privileges, or host interactions.

Design source: [design_handoff_bucket_health](design_handoff_bucket_health/README.md) and
[IMPLEMENTATION.md](design_handoff_bucket_health/IMPLEMENTATION.md).

## Visual Identity

- Visual name: `bucketHealth` (internal `name` in `pbiviz.json`).
- Display name: **Bucket Health**.
- GUID: `bucketHealthD598C3A88E864DB290BEFCEF7B22DF7B`.
- API version: `5.11.0`; `powerbi-visuals-tools` `7.1.0`.
- Package target: AppSource listing + Microsoft certification — see [CERTIFICATION.md](CERTIFICATION.md).

## Expected Dataset Shape

One row represents one GET component status for one machine.

The concrete source CSV schema and fixture columns are defined in [DATA_SCHEMA.md](DATA_SCHEMA.md).
Power BI field wells may be bound from differently named business columns later, but the initial
fixture uses stable, snake_case source names so parser behavior can be tested before the visual is
scaffolded.

Counts are derived from component rows:

- Teeth = count of `category = tooth` rows for the machine, clamped to 4-20.
- Lip shrouds = count of `category = lipShroud` rows for the machine; count must equal `teeth - 1`.
- Wing shrouds = count of `category = wingShroud` rows, up to 8 total. Left/right side is derived
  from `order` using a visual formatting setting, not from a source data column.

## Data Roles

| Role | Kind | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| machine | Grouping | Yes | The machine's name and its unique identifier. Each unique value becomes one card in the fleet view and is shown as the card header label. Must be stable across data refreshes — changing this value resets alarm state for that machine. | Must uniquely identify a machine across all rows and across refreshes. |
| machineType | Grouping | No | Human-readable machine class or model label (e.g. "Hydraulic Excavator"). Shown in the card header below the machine name. | Displayed below the machine name in the card header. Omit if not applicable. |
| component | Grouping | Yes | The component's name, unique within its machine. Identifies a single tooth, lip shroud, or wing shroud. Used for rendering, tooltip, cross-filter selection, and alarm transition detection. Must be stable across refreshes — changing this value resets alarm history for that component. | Must be unique within each machine. |
| category | Grouping | Yes | GET component type. Determines where on the bucket schematic the component is drawn. | Must be one of: `tooth`, `lipShroud`, `wingShroud`. |
| order | Measure or Grouping | Yes | Integer position of this component within its category, starting at 1. For teeth and lip shrouds, 1 is the leftmost position. For wing shrouds, left/right side is inferred from this value by the Wing side assignment formatting setting — there is no left/right column in the data. | Integer ≥ 1. Must be unique within the same machine and category. |
| status | Grouping or Measure | Yes | Current health status of the component. Must match one of the six accepted status strings (case-insensitive). | Maps to the status model below. |
| alarmTime | Grouping or Measure | No (recommended) | Timestamp when this component entered its current alarm state. The visual builds an alarm identity from machine + component + alarmTime. Audio fires exactly once per unique identity and is permanently cached for the session. The visual renders normally without it; **without it, a component that clears and re-alarms in the same session will not trigger audio a second time** because the identity never changes. Strongly recommended for live dashboards. Leave null/blank for non-alarm rows. | ISO 8601 datetime string or datetime value. Must be null/blank for non-alarm rows. |
| lastSeen | Grouping or Measure | No | Timestamp of the last data receipt for this component. Displayed in the component tooltip as a full local date and time. | — |
| tooltipFields | Measure, multiple | No | Additional report-author-selected columns appended to the component tooltip after the standard fields. Multiple columns can be bound. | — |

## Status Model

| Canonical Status | Accepted Design Key | Fill | Alarm | Audio |
| --- | --- | --- | --- | --- |
| OK | `ok` | `#34D399` | No | No |
| No data (1h) | `nodata` | `#F4C04E` | No | No |
| Lockout | `lockout` | `#5BA8F5` | No | No |
| Lockout + No data | `lockoutnd` | `#3B5BD9` | No | No |
| Proximity alarm | `prox` | `#FF5A5A` | Yes | Yes, on transition |
| Movement alarm | `move` | `#C42B4A` | Yes | Yes, on transition |

Precedence for multiple statuses on one component: movement > proximity > lockout+nodata > lockout >
nodata > ok.

Component stroke = component fill mixed 42% toward black.

## Data View Mapping

Preferred mapping: `table`.

Rationale:

- The visual needs one logical record per machine component.
- Required fields must be read together per row.
- Optional tooltip fields may be arbitrary and multiple.
- Table mapping matches the handoff's "one row = one GET component status" contract.

Implementation may revisit `categorical` only if Power BI field well UX demands it, but the internal
parser should still normalize to component records.

## Internal Normalized Model

```ts
type BucketStatusKey =
  | "ok"
  | "nodata"
  | "lockout"
  | "lockoutnd"
  | "prox"
  | "move";

interface ComponentRecord {
  machineKey: string;
  componentKey: string;
  category: "tooth" | "lipShroud" | "wingShroud";
  order: number;
  derivedWingSide?: "left" | "right";
  status: BucketStatusKey;
  lastSeen?: Date | string;
  tooltipFields: Array<{ label: string; value: unknown }>;
}

interface MachineBucketModel {
  key: string;
  name: string;
  type?: string;
  teeth: ComponentRecord[];
  lipShrouds: ComponentRecord[];
  wingShroudsLeft: ComponentRecord[];
  wingShroudsRight: ComponentRecord[];
  alarmCount: number;
  hasAlarm: boolean;
  dominantAlarm?: "prox" | "move";
}
```

## Formatting Objects

These are the **only** formatting properties declared in `capabilities.json`. The implementation
lives in [`src/settings.ts`](../src/settings.ts); the two files must stay in lock-step.

| Object | Property | Type | Default | Description |
| --- | --- | --- | --- | --- |
| layout | minCardWidth | Numeric | 220 | Minimum machine-card width in px. Cards never shrink below this; the fleet scrolls instead. |
| ordering | wingSideAssignment | Enumeration | `OddLeftEvenRight` | Maps each wing shroud's `order` to a side: `OddLeftEvenRight`, `OddRightEvenLeft`, `FirstHalfLeftSecondHalfRight`, `FirstHalfRightSecondHalfLeft`. |
| ordering | componentOrder | Enumeration | `leftToRight` | Lay teeth and lip shrouds `leftToRight` or `rightToLeft`. |
| alarm | audioEnabled | Boolean | true | Play the two-tone alert when a component transitions into an alarm status. |
| alarm | alarmMotion | Enumeration | `always` | Alarm flashing: `always` (flash regardless of OS setting), `auto` (flash, but solid when the OS requests reduced motion), `never` (always solid). The alarm is never hidden, and audio is governed separately by `audioEnabled`. |

There are intentionally **no** `bucket`, `statusMapping`, or `statusColors` objects: bucket geometry
is fully adaptive (not author-configurable), and status strings/colours are fixed by the
[Status Model](#status-model). Adding any property here requires declaring it in both
`capabilities.json` and `src/settings.ts`.

## Host Interactions

- Selection / cross-filter: clicking a component selects it via the host `ISelectionManager` and
  cross-filters other visuals on the page. Implemented (PR #11).
- Highlight: alarm highlight is visual-owned; alarming machines flash/solid and sort to the front.
- Tooltip: the visual renders its own custom themed HTML tooltip rather than calling the Power BI
  host tooltip service. It shows the component label, a human-readable status, the machine, the full
  local Last seen date and time, and the bound tooltip fields. The official tooltip API and report
  page tooltips are not used (see [DECISIONS.md](DECISIONS.md)).
- Sorting: alarm priority overrides base order in fleet view (movement before proximity, then alarm
  count, then source order). Ties keep source order.
- Context menu: right-click opens the Power BI default context menu via
  `ISelectionManager.showContextMenu`. Implemented (PR #11).
- Keyboard: components are focusable (`supportsKeyboardFocus`); arrow keys move focus, Enter/Space
  selects. Implemented (PR #11).
- Fetch more data: not needed under the 20-machine / 2000-row cap.
- Persist properties: formatting-pane settings persist via the formatting model.

## Privileges

| Privilege | Required | Reason |
| --- | --- | --- |
| WebAccess | No | No external calls planned. |
| LocalStorage | No | Alarm dismissal is session-only. |
| ExportContent | No | No export behavior planned. |

Audio uses the in-browser WebAudio API, so no host privilege is declared. Because browser autoplay
policies block sound without a user gesture, the audio context is armed/resumed on a user click
inside the visual before any alarm can play.

The visual targets AppSource listing and Microsoft certification; `privileges` is empty (`[]`) so the
visual makes no external calls — a prerequisite for certification (see [CERTIFICATION.md](CERTIFICATION.md)).

## Data Limits

- Maximum machines: 20.
- Teeth per machine: 4 to 20.
- Lip shrouds per machine: supplied rows equal to `teeth - 1`.
- Wing shrouds per machine: 0 to 8 total, assigned to sides by visual settings.
- Host row cap: `capabilities.json` requests `dataReductionAlgorithm.top.count = 2000` rows. The
  practical worst case under the 20-machine / 20-tooth limits is ~940 supplied component rows
  (20 × (20 teeth + 19 lip shrouds + 8 wing shrouds)), comfortably under the 2000 cap.
- Reduction strategy: the 2000-row top cap is the only reduction; the visual needs all current
  component rows at once (no aggregation or paging).

## Geometry Contract

All geometry is front-on parametric SVG. Component sizes are fixed in SVG user units; the bucket
scales around them.

Constants from handoff:

```text
SLOT       = 66
TOOTH_W    = 36
TOOTH_H    = 62
LIP_W      = 22
LIP_H      = 24
WING_HL    = 24
WING_IN    = 11
WING_OUT   = 14
WING_PITCH = 56
MARGIN     = 72
```

For teeth count `n` and wings per side `w`:

```text
halfBot = n * SLOT / 2
halfTop = halfBot * 0.84
topY    = 86
bucketH = 116 + w * 46
botY    = topY + bucketH
CX      = halfBot + MARGIN
viewBox = 0 0 (2 * CX) (botY + TOOTH_H + 40)
```

Body corners:

- `TL=(CX-halfTop, topY)`
- `TR=(CX+halfTop, topY)`
- `BL=(CX-halfBot, botY)`
- `BR=(CX+halfBot, botY)`

Geometry rules:

- Teeth are tapered wedges distributed along the cutting edge.
- Lip shrouds are rectangular plates between teeth and are supplied as component rows.
- Wing shrouds are quads along side edges with fixed 56-unit pitch.
- Hitch bracket is centered on the top edge and scaled by top width.
- Spill guard bars run across the top edge.

## Validation Checklist

- [ ] Every formatting descriptor exists in `capabilities.json`.
- [ ] Empty/missing data views are handled.
- [ ] Invalid field assignments show useful guidance.
- [ ] Selection IDs are built from the correct data view shape.
- [ ] Privileges match actual behavior.
- [ ] High-cardinality behavior is explicit.
- [ ] Alarm transition detection has a deterministic key per component.
- [ ] Audio dismissal state does not suppress visual alarm highlighting.
- [ ] Layout has tested minimum card dimensions and overflow behavior.
- [ ] Bucket geometry adapts to GET counts without overlapping components.
- [ ] Component geometry remains legible at minimum supported card size.
