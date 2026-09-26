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
anything; the role name is what matters. Each role accepts exactly one field (`capabilities.json`
declares `max: 1` per role) — binding a second field to the same role is not supported. For
**Comp. Alarm Time** and **Last Seen**, bind the underlying datetime column itself, not a Power BI
date hierarchy (Year/Quarter/Month/Day): a hierarchy expands into several synthetic columns, and
the visual only reads the one value bound to the role.

| Role | Required | Type | Fixture column | Description |
| --- | --- | --- | --- | --- |
| **Machine** | ✓ | Text | `machine_key` | The machine's name and its unique identifier. Every row must belong to a machine. Each unique value becomes one card in the fleet view and is also shown as the card header label. Must be stable across data refreshes — changing this value resets alarm state for that machine. |
| **Machine Type** | — | Text | `machine_type` | Human-readable machine class or model (e.g. "Hydraulic Excavator"). Shown in the card header below the machine name. If omitted, only the machine name is shown. |
| **Component** | ✓ | Text | `component_key` | The component's name, unique within its machine. Identifies a single tooth, lip shroud, or wing shroud on that machine. Used for status rendering, the component tooltip, cross-filter selection, and alarm transition detection. Must be stable across refreshes — changing this value resets alarm history for that component. |
| **Category** | ✓ | Text | `component_category` | The component type. Determines where on the bucket schematic the component is drawn. Matched leniently — see [Category matching](#category-matching) — against `tooth`, `lipShroud`, `wingShroud`. |
| **Order** | ✓ | Integer | `component_order` | Position of this component within its category, starting at 1 (accepted as a number or a digit-only string — see [Validation rules](#validation-rules)). For teeth and lip shrouds, 1 is the leftmost position under the default **Teeth & lip order** setting (choose *Right to left* to flip it). For wing shrouds, left/right side is inferred from this value by the **Wing side assignment** Formatting pane setting — there is no left/right column in the data. Use unique values within each machine and category: duplicates are not rejected, but they tie-break by source row order, which makes the layout depend on row order. |
| **Component Status** | ✓ | Text | `status` | The current health status of this component. Matched case-insensitively against the accepted status strings (see [Status values](#status-values) below). Non-alarm rows should have a blank Comp. Alarm Time. |
| **Comp. Alarm Time** | Recommended | Datetime | `alarm_time` | Timestamp when this component entered its current alarm state. The visual constructs an alarm identity from machine + component + alarm time; audio fires exactly once per unique identity. **Strongly recommended: if you leave this unbound, a component that clears its alarm and then re-alarms in the same session will not play audio the second time** — the alarm identity is permanently cached for the lifetime of that session (see [Alarm audio logic](#alarm-audio-logic)). The visual still renders normally without it. Leave the cell blank (null) for non-alarm rows. |
| **Last Seen** | — | Datetime | `last_seen_utc` | Timestamp of the last data receipt for this component. Shown in the component tooltip as a full local date and time. |
| **Tooltip Fields** | — | Any, multiple | `tag_id` (example) | Additional columns to include in the component tooltip after the standard fields. You can bind multiple columns here. |

## Status values

The **Component Status** value is matched **case-insensitively**, after normalization:
leading/trailing spaces are trimmed, runs of internal whitespace collapse to one space, spacing
around `+` is normalised to ` + `, and a missing space before `(` is inserted (so `No Data(1h)`
matches the same as `No data (1h)`). Each status accepts several spellings; the visual normalises
them to a canonical key and shows a fixed display label. Bind any of the accepted inputs below:

| Accepted input (any case) | Canonical key | Displayed in the visual | Alarm + audio |
| --- | --- | --- | --- |
| `OK` | `ok` | OK | No |
| `No Data` · `No data (1h)` · `nodata` | `nodata` | No Data (1h) | No |
| `Lockout` | `lockout` | Lockout | No |
| `Lockout + No Data` · `lockout+no data` · `lockoutnd` | `lockoutnd` | Lockout + No Data | No |
| `Proximity Alarm` · `proximity` · `prox` | `prox` | Proximity Alarm | Yes — on transition |
| `Movement Alarm` · `movement` · `move` | `move` | Movement Alarm | Yes — on transition |

An unrecognised status string is a **row-level issue**: the row is listed on its machine's card
("Row N: status '…' is not supported.") and excluded from that machine's geometry and counts — it
does not fail the whole visual. Make sure your source system only emits the accepted spellings
above.

Status **colours (hex), alarm precedence, and the component stroke rule** are defined once in the host
contract — see [VISUAL_CONTRACT.md › Status Model](VISUAL_CONTRACT.md#status-model) — and are not
repeated here.

## Category matching

The **Category** value is matched case-insensitively after stripping spaces, underscores, and
hyphens: `tooth` and `teeth` both map to the tooth category, `lipshroud`/`lip_shroud`/`lip shroud`
all map to `lipShroud`, and the equivalent forms map to `wingShroud`. Anything else is a row-level
issue on that row's machine, listing the three accepted values, and excludes the row the same way
an unrecognised status does (see [Status values](#status-values)).

## Component counts per machine

The bucket geometry adapts to the number of component rows you supply per machine:

| Category | Min | Max | Rule |
| --- | --- | --- | --- |
| `tooth` | 4 | 20 | Any count in this range |
| `lipShroud` | 3 | 19 | Must equal teeth count − 1 (checked only when the tooth count is itself in range) |
| `wingShroud` | 0 | 8 | 0–4 per side; side is inferred from Order. More than 4 on either side is a validation issue on that machine's card. |

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
`["EX-204","T1",""]` (empty timestamp; the visual JSON-encodes the machine/component/time triple as
its internal identity). The first time it alarms, the identity is new and audio fires. But the
identity is then cached. If the operator fixes the component (status returns to OK) and it later
re-alarms, the identity is still `["EX-204","T1",""]` — already cached — and no audio plays.

With an alarm time, the second alarm produces a different identity
(`["EX-204","T1","2026-06-24T10:30:00Z"]`) that was never cached, so audio fires correctly.

**Consequence if left empty:** the visual still renders and the *first* alarm on each component still
plays audio. You only lose the audio cue for a **repeat** alarm on the **same** component within one
uninterrupted session (closing and reopening the report resets the cache). The flashing/solid visual
alarm is unaffected either way. Bind Comp. Alarm Time for reliable repeat-alarm audio in long-running
live dashboards.

## Validation rules

Validation is **per machine**: a problem on one machine's rows never fails the whole visual. That
machine renders its own card with a capped list of its problems instead of the bucket schematic;
every other machine renders normally, and the invalid machine still sorts, alarms, and beeps like
any other.

Row-level checks (excluded row does not count toward that machine's geometry or counts):

- Component must be non-blank.
- Category must match one of the three accepted values (see [Category matching](#category-matching)).
- Status must match one of the accepted spellings (see [Status values](#status-values)).
- Order must be a whole number ≥ 1 — accepted as a number or a digit-only string (e.g. `"3"`);
  booleans, dates, hex-looking strings (`"0x3"`), and decimals (`"1.5"`) are all rejected.

A row with a **blank Machine** value cannot be attributed to any machine at all: it is skipped and
counted into one fleet-level warning ("N row(s) skipped: machine is blank.") shown as a banner above
the grid, rather than becoming a row-level issue on some machine's card. If every row in the update
has a blank machine, there is nothing to render and the visual shows the Error state using that same
warning.

Machine-level checks (run only on that machine's valid rows):

- Component must be unique within the machine (each duplicate is its own issue).
- Teeth count must be 4–20.
- Lip shroud count must equal `teeth − 1` — checked only when the teeth count is itself in range.
- Each wing side (after applying **Wing side assignment**) must have at most 4 wing shrouds.

Each machine's issue list is capped at 20 entries, with a final "…and N more." summary when there
are more.

**Row cap / truncation:** the host's 2000-row cap (see [Data Limits](VISUAL_CONTRACT.md#data-limits))
can cut a machine's rows mid-way. When it does, a banner appears above the grid, and the one machine
whose rows were most likely split — the machine whose first row in the data comes latest — shows a
single "Incomplete — the 2,000-row limit was reached." issue in place of its teeth/lip/wing-count
checks (its row-level issues, if any, still show).

Not validated, but recommended: unique Order values per machine+category (duplicates tie-break by
row order), and ≤ 20 machines per update (the design/performance target).

## Fixture coverage

The mock CSV (`test/fixtures/bucket_health_components.csv`) intentionally covers:

- A single-machine alarm scenario with both proximity and movement alarms.
- A maximum-geometry machine: 20 teeth, 19 lip shrouds, 8 wing shrouds.
- A minimum-geometry machine: 4 teeth, 3 lip shrouds, 0 wing shrouds.
- All six status values across different machines and components.
- Explicit alarm_time values on all alarm rows.
