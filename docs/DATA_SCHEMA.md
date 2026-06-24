# Data Schema

This document defines the Power BI field role contract and the concrete source column names used by
the mock CSV fixture. It is the authoritative reference for anyone binding data to the visual or
writing queries that feed it.

Fixture path: [test/fixtures/bucket_health_components.csv](../test/fixtures/bucket_health_components.csv)

## Row grain

One row = one GET component on one machine at one point in time.

The visual groups rows by machine, derives component counts per category, and renders one bucket card
per machine. There is no aggregation — every component row is rendered individually.

## Field roles (Fields pane)

These are the roles you bind in the Power BI Fields pane. The column names in your data model can be
anything; the role name is what matters.

| Role | Required | Type | Fixture column | Description |
| --- | --- | --- | --- | --- |
| **Machine** | ✓ | Text | `machine_key` | The machine's name and its unique identifier. Every row must belong to a machine. Each unique value becomes one card in the fleet view and is also shown as the card header label. Must be stable across data refreshes — changing this value resets alarm state for that machine. |
| **Machine Type** | — | Text | `machine_type` | Human-readable machine class or model (e.g. "Hydraulic Excavator"). Shown in the card header below the machine name. If omitted, only the machine name is shown. |
| **Component** | ✓ | Text | `component_key` | The component's name, unique within its machine. Identifies a single tooth, lip shroud, or wing shroud on that machine. Used for status rendering, the component tooltip, cross-filter selection, and alarm transition detection. Must be stable across refreshes — changing this value resets alarm history for that component. |
| **Category** | ✓ | Text | `component_category` | The component type. Determines where on the bucket schematic the component is drawn. Must be one of three exact values: `tooth`, `lipShroud`, `wingShroud`. |
| **Order** | ✓ | Integer | `component_order` | Integer position of this component within its category, starting at 1. For teeth and lip shrouds, 1 is the leftmost position. For wing shrouds, left/right side is inferred from this value by the **Wing side assignment** Formatting pane setting — there is no left/right column in the data. Must be unique within the same machine and category. |
| **Component Status** | ✓ | Text | `status` | The current health status of this component. Matched case-insensitively against the accepted status strings (see [Status values](#status-values) below). Non-alarm rows should have a blank Comp. Alarm Time. |
| **Comp. Alarm Time** | Recommended | Datetime | `alarm_time` | Timestamp when this component entered its current alarm state. The visual constructs an alarm identity from machine + component + alarm time; audio fires exactly once per unique identity. **Strongly recommended: if you leave this unbound, a component that clears its alarm and then re-alarms in the same session will not play audio the second time** — the alarm identity is permanently cached for the lifetime of that session (see [Alarm audio logic](#alarm-audio-logic)). The visual still renders normally without it. Leave the cell blank (null) for non-alarm rows. |
| **Last Seen** | — | Datetime | `last_seen_utc` | Timestamp of the last data receipt for this component. Shown in the component tooltip as a full local date and time. |
| **Tooltip Fields** | — | Any, multiple | `tag_id` (example) | Additional columns to include in the component tooltip after the standard fields. You can bind multiple columns here. |

## Status values

The **Component Status** value is matched **case-insensitively** (leading/trailing spaces are
ignored). Each status accepts several spellings; the visual normalises them to a canonical key and
shows a fixed display label. Bind any of the accepted inputs below:

| Accepted input (any case) | Canonical key | Displayed in the visual | Alarm + audio |
| --- | --- | --- | --- |
| `OK` | `ok` | OK | No |
| `No Data` · `No data (1h)` · `nodata` | `nodata` | No Data (1h) | No |
| `Lockout` | `lockout` | Lockout | No |
| `Lockout + No Data` · `lockout+no data` · `lockoutnd` | `lockoutnd` | Lockout + No Data | No |
| `Proximity Alarm` · `proximity` · `prox` | `prox` | Proximity Alarm | Yes — on transition |
| `Movement Alarm` · `movement` · `move` | `move` | Movement Alarm | Yes — on transition |

An unrecognised status string is treated as **No Data (1h)**.

Status **colours (hex), alarm precedence, and the component stroke rule** are defined once in the host
contract — see [VISUAL_CONTRACT.md › Status Model](VISUAL_CONTRACT.md#status-model) — and are not
repeated here.

## Component counts per machine

The bucket geometry adapts to the number of component rows you supply per machine:

| Category | Min | Max | Rule |
| --- | --- | --- | --- |
| `tooth` | 4 | 20 | Any count in this range |
| `lipShroud` | 3 | 19 | Must equal teeth count − 1 |
| `wingShroud` | 0 | 8 | Up to 4 per side; side is inferred from Order |

More teeth widen the bucket; more wing shrouds extend the bucket sides. The schematic always looks
proportional because the body geometry recalculates from the counts.

## Wing side assignment

Wing shrouds do not carry a left/right column. The visual derives each wing's side from its **Order**
value using the **Wing side assignment** Formatting pane setting:

| Setting | Rule |
| --- | --- |
| Odd left / Even right *(default)* | Odd Order → left side; even Order → right side |
| Odd right / Even left | Odd Order → right side; even Order → left side |
| First half left / Second half right | Lower half of order values → left; remainder → right |
| First half right / Second half left | Lower half of order values → right; remainder → left |

Choose the mode that matches how your source system numbers wing shrouds.

## Alarm audio logic

Understanding this logic explains why **Comp. Alarm Time is strongly recommended**:

1. On the **first data update** after the visual loads, all currently-alarming components are
   recorded silently — no audio fires. This prevents the report from beeping every time it opens.
2. On each **subsequent update**, the visual checks whether any alarm identity (machine + component +
   alarm time) is new since the last update. If it finds a new identity, audio fires.
3. An alarm identity, once heard, is **permanently cached** for the lifetime of that visual session.
   It will never fire again in that session regardless of dismiss or data changes.
4. When the report is **closed and reopened**, the session resets and the cache is empty, so the
   seeding step runs again on the first update.

**Why binding Comp. Alarm Time matters:**

Without an alarm time, the identity for component `T1` on machine `EX-204` is always
`EX-204::T1::` (empty timestamp). The first time it alarms, the identity is new and audio fires.
But the identity is then cached. If the operator fixes the component (status returns to OK) and it
later re-alarms, the identity is still `EX-204::T1::` — already cached — and no audio plays.

With an alarm time, the second alarm produces a different identity (`EX-204::T1::2026-06-24T10:30:00Z`)
that was never cached, so audio fires correctly.

**Consequence if left empty:** the visual still renders and the *first* alarm on each component still
plays audio. You only lose the audio cue for a **repeat** alarm on the **same** component within one
uninterrupted session (closing and reopening the report resets the cache). The flashing/solid visual
alarm is unaffected either way. Bind Comp. Alarm Time for reliable repeat-alarm audio in long-running
live dashboards.

## Validation rules

- All required roles must be bound.
- Status values must match one of the six accepted strings.
- Component must be unique within each machine.
- Order must be an integer ≥ 1 and unique within the same machine and category.
- Each machine must have 4–20 tooth rows.
- Each machine must have exactly `teeth − 1` lip shroud rows.
- Each machine may have 0–8 wing shroud rows.
- The visual supports up to 20 machines per data update.

## Fixture coverage

The mock CSV (`test/fixtures/bucket_health_components.csv`) intentionally covers:

- A single-machine alarm scenario with both proximity and movement alarms.
- A maximum-geometry machine: 20 teeth, 19 lip shrouds, 8 wing shrouds.
- A minimum-geometry machine: 4 teeth, 3 lip shrouds, 0 wing shrouds.
- All six status values across different machines and components.
- Explicit alarm_time values on all alarm rows.
