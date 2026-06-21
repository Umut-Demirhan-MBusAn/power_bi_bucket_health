# Data Schema

This document defines the concrete source schema used by the initial mock CSV fixture. It maps to the
Power BI data roles in [VISUAL_CONTRACT.md](VISUAL_CONTRACT.md) and should be treated as the parser
contract until real business column names are confirmed.

Fixture path: [test/fixtures/bucket_health_components.csv](../test/fixtures/bucket_health_components.csv)

## Row Grain

One row represents one GET component status for one machine at one update time.

The visual groups rows by `machine_key`, then derives a `MachineBucketModel`:

- Teeth are supplied as `component_category = tooth` rows.
- Lip shrouds are supplied as `component_category = lipShroud` rows.
- Wing shrouds are supplied as `component_category = wingShroud` rows.

The source data does not contain wing side. The visual assigns wing shrouds to left/right sides from
`component_order` using a formatting setting.

## Columns

| Column | Required | Type | Power BI Role | Description |
| --- | --- | --- | --- | --- |
| `machine_key` | Yes | Text | `machine` | Stable unique machine identifier used for grouping and alarm state. |
| `machine_name` | No | Text | Display metadata | Friendly machine label shown in the card header. Falls back to `machine_key`. |
| `machine_type` | No | Text | `machineType` | Machine class or model label shown in the card header. |
| `component_key` | Yes | Text | `component` | Stable unique component key within a machine. |
| `component_name` | No | Text | Tooltip metadata | Human-friendly component label. Falls back to `component_key`. |
| `component_category` | Yes | Enum | `category` | One of `tooth`, `lipShroud`, `wingShroud`. |
| `component_order` | Yes | Integer | `order` | Physical order within the component category. Starts at 1. Wing side assignment is derived from this value. |
| `status` | Yes | Enum | `status` | Source status string mapped to the canonical status model. |
| `last_seen_utc` | No | ISO datetime text | `lastSeen` | Last update timestamp, stored as UTC in the fixture. |
| `tag_id` | No | Text | Tooltip metadata | Source tag/sensor identifier. |

## Enumerations

`component_category`:

- `tooth`
- `lipShroud`
- `wingShroud`

`status` source values:

- `OK`
- `No data (1h)`
- `Lockout`
- `Lockout + No data`
- `Proximity alarm`
- `Movement alarm`

Parser output must normalize those values to:

| Source Value | Canonical Key |
| --- | --- |
| `OK` | `ok` |
| `No data (1h)` | `nodata` |
| `Lockout` | `lockout` |
| `Lockout + No data` | `lockoutnd` |
| `Proximity alarm` | `prox` |
| `Movement alarm` | `move` |

## Wing Side Assignment

Wing shroud side is a visual setting, not a data column. The parser preserves source order and
`component_order`; a domain function later assigns each wing shroud to a rendered side.

Supported assignment modes:

- `OddLeftEvenRight`: odd `component_order` values render on the left; even values render on the
  right.
- `OddRightEvenLeft`: odd `component_order` values render on the right; even values render on the
  left.
- `FirstHalfLeftSecondHalfRight`: lower order values render on the left; remaining values render on
  the right.
- `FirstHalfRightSecondHalfLeft`: lower order values render on the right; remaining values render on
  the left.

## Validation Rules

- Required columns must exist.
- Required field values must be non-empty.
- `component_key` must be unique within each `machine_key`.
- `component_order` must be an integer greater than or equal to 1.
- Each machine must have 4-20 supplied tooth rows.
- Each machine must have supplied lip shroud rows equal to `tooth count - 1`.
- Each machine may have 0-8 wing shroud rows total.
- The fixture must use exactly the documented columns; wing side and unrelated operational fields
  are not part of the source schema.
- The fixture must contain no more than 20 machines.
- The parser must preserve source row order as `sourceOrder` before applying alarm priority sorting.

## Mock Coverage

The fixture intentionally includes:

- A single-machine alarm scenario with both proximity and movement alarms.
- Explicit lip shroud rows for every machine.
- A maximum-geometry machine with 20 teeth, 19 lip shrouds, and 8 wing shrouds.
- A minimum-geometry machine with 4 teeth, 3 lip shrouds, and no wing shrouds.
- All six status source values.
