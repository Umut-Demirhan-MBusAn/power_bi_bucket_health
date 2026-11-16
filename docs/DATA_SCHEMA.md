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
| **Machine Type** | — | Text | `machine_type` | Human-readable machine class or model (e.g. "Hydraulic Excavator"). Shown in the card header below the machine name (the first non-blank value among the machine's valid rows) and in each component's tooltip. If omitted, only the machine name is shown. |
| **Component** | ✓ | Text | `component_key` | The component's name, unique within its machine. Identifies a single tooth, lip shroud, or wing shroud on that machine. Used for status rendering, the component tooltip, cross-filter selection, and alarm transition detection. Must be stable across refreshes — changing this value resets alarm history for that component. |
| **Category** | ✓ | Text | `component_category` | The component type. Determines where on the bucket schematic the component is drawn. Matched leniently — see [Category matching](#category-matching) — against `tooth`, `lipShroud`, `wingShroud`. |
| **Order** | ✓ | Integer | `component_order` | Position of this component within its category, starting at 1 (accepted as a number or a digit-only string — see [Validation rules](#validation-rules)). For teeth and lip shrouds, 1 is the leftmost position under the default **Teeth & lip order** setting (choose *Right to left* to flip it). For wing shrouds, left/right side is inferred from this value by the **Wing side assignment** Formatting pane setting — there is no left/right column in the data. Use unique values within each machine and category: duplicates are not rejected, but they tie-break by source row order, which makes the layout depend on row order. |
| **Component Status** | ✓ | Text | `status` | The current health status of this component. Matched case-insensitively against the accepted status strings (see [Status values](#status-values) below). Audio follows changes in this value (see [Alarm audio logic](#alarm-audio-logic)). |
| **Comp. Alarm Time** | — | Datetime | `alarm_time` | Informational timestamp of the component's alarm. Optional: it is not displayed (not in the tooltip) and does not affect audio, which follows Component Status alone (see [Alarm audio logic](#alarm-audio-logic)). Any value, including blank, is accepted. |
| **Last Seen** | — | Datetime | `last_seen_utc` | Timestamp of the last data receipt for this component. Shown in the component tooltip as a local date and time, to the minute. |
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
("Tooth 4 (EX-107-T04): status 'Broken' is not recognised. Use OK, …") and excluded from that
machine's geometry and counts — it does not fail the whole visual. Make sure your source system only emits the accepted spellings
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
| `lipShroud` | 3 | 19 | Must equal teeth count − 1 (checked only when the tooth count is in range and none of the machine's rows was rejected) |
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
| First half left / Second half right | The machine's wing shrouds sorted by Order: the first half → left, the rest → right |
| First half right / Second half left | The first half → right, the rest → left |

With an odd count, the half split gives the extra wing to the first side (3 wings: 2 and 1). On
each side the lowest Order is drawn at the top. Choose the mode that matches how your source
system numbers wing shrouds.

## Alarm audio logic

Audio follows each component's **Component Status** transitions. Comp. Alarm Time plays no part.

1. The visual remembers each component's last status, keyed by **Machine** + **Component**.
2. On the **first data update** after the visual loads, every status is recorded silently — no
   audio fires, so the report does not beep every time it opens.
3. On each **later update**, audio fires when a component's status is an alarm status (Proximity or
   Movement Alarm) that differs from its remembered status:
   - a non-alarm status becomes an alarm;
   - Proximity Alarm becomes Movement Alarm, or the reverse;
   - a component first seen after the first update is already alarming.
4. The **same alarm status on later rows stays silent**, whatever its alarm time. A source that
   repeats an ongoing alarm every 30 s with a fresh alarm time beeps once, not on every repeat.
5. An alarm that **clears** to a non-alarm status and later **comes back** fires again.
6. A component **missing** from an update (filtered out, partial load) keeps its remembered status,
   so its ongoing alarm does not fire again when it returns. Edge states (no fields, invalid
   configuration, no data, error) do not reset the remembered statuses either.
7. A click dismisses the sound; the dismissed alarm stays silent while its status persists. An
   alarm that first appears while **Enable audio alarm** is off never plays later.
8. When the report is **closed and reopened**, the remembered statuses are empty and step 2 runs
   again.

The flashing/solid visual alarm follows the current status and is independent of audio.

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

A row-level issue names the component the way the report author knows it — "Tooth 4 (EX-107-T04)"
when category and order are usable, else the component key, else "A tooth row" / "A row" — and says
which values are accepted. It never cites a row number: rows are numbered by the host's query
result, which the author cannot see and which changes with filters and sorting.

A row with a **blank Machine** value cannot be attributed to any machine at all: it is skipped and
counted into one fleet-level warning ("N rows have no machine and are not shown.") shown as a banner above
the grid, rather than becoming a row-level issue on some machine's card. If every row in the update
has a blank machine, there is nothing to render and the visual shows the Error state using that same
warning.

Machine-level checks (run only on that machine's valid rows):

- Component must be unique within the machine (each duplicate is its own issue).
- Teeth count must be 4–20.
- Lip shroud count must equal `teeth − 1` — checked only when the teeth count is itself in range.
- Each wing side (after applying **Wing side assignment**) must have at most 4 wing shrouds.

While any of the machine's rows is rejected, the "fewer than 4 teeth" and lip-shroud checks are
skipped: counting without the rejected row would blame a category that is actually fine (a bad
tooth status would otherwise also report "4 lip shrouds; expected 3."). The "more than 20 teeth"
and per-side wing limits always run, because a rejected row can only lower a count. The card
header's machine type and counts come from the valid rows only.

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
