# Product Spec

What the Bucket Health Power BI custom visual does, as shipped (v1.0.0.0). Implementation detail
lives in [ARCHITECTURE.md](ARCHITECTURE.md); the host contract in
[VISUAL_CONTRACT.md](VISUAL_CONTRACT.md); the data contract in [DATA_SCHEMA.md](DATA_SCHEMA.md).

## Summary

A full-page-style Power BI custom visual for monitoring mining machine bucket health. The visual
renders one responsive machine card per machine. Each card shows a high-fidelity, front-on
schematic bucket with depth shading whose GET (Ground Engaging Tools) component counts — teeth, lip
shrouds, and wing shrouds — come from the bound data. The bucket shape expands, shrinks, and
changes proportions with the component layout. Components are color-coded by status, support rich
custom tooltips, and alarm states trigger visual prominence plus a dismissible one-minute audio
alarm when a component newly transitions into an alarming status.

## Problem

Mining operations need a fast visual way to see which machines and bucket components need
attention. Standard Power BI tables or charts do not show the physical bucket layout clearly
enough, especially when the number of machines and the number/order of components changes by
machine.

## Target Users

- Report authors: configure the visual, bind machine/component/status fields, and choose
  layout/ordering/alarm settings.
- Report consumers: monitor live machine bucket status and quickly spot alarms or missing data.
- Operations stakeholders: review fleet-level bucket health and prioritize response to alarms.

## Behavior

### Layout

- One machine: the card scales to fill the visual while preserving bucket proportions.
- Multiple machines: uniform fixed-height cards flex-wrap to fill the available width; each card's
  width tracks its bucket aspect ratio (more teeth = wider). There is no fixed column-count rule.
  Wrapped cards scroll when they overflow; cards never shrink below the configurable minimum card
  width.
- The design and performance target is up to 20 machines. The machine count itself is not
  enforced; the effective ceiling is the 2000-row host cap, and a truncation banner appears when
  the host truncates rows.

### Bucket geometry

- Teeth: dynamic count, 4 to 20 per machine (an out-of-range count is a validation issue on that
  machine's own card — see [Visual States](#visual-states)).
- Lip shrouds: always `teeth − 1`.
- Wing shrouds: 0–4 per side, 0–8 total per machine; each wing's left/right side is derived from
  its Order value by the **Wing side assignment** setting. More than 4 on one side is a validation
  issue on that machine's card.
- More teeth/lip shrouds widen the bucket edge; more wing shrouds extend the bucket sides; fewer
  components shrink and rebalance the bucket proportionally. Component shapes are integrated into
  the parametric bucket body, not pasted onto a static image.

### Component ordering

- Teeth and lip shrouds lay out by their Order value, left-to-right by default; the
  **Teeth & lip order** setting can flip the direction.
- Wing shrouds are assigned to left/right sides from their Order value: odd/even or
  first-half/second-half split, each with either side direction (four modes). A half split puts
  the extra wing of an odd count on the first side. On each side the lowest Order is at the top.

### Core workflows

**Monitor one machine** — with one machine bound, the card fills the visual; all components are
readable, status colors are clear, and hover tooltips expose component metadata.

**Monitor multiple machines** — cards keep a uniform fixed height, wrap to fill the width, and
reflow on resize without overlapping or breaking bucket geometry.

**Inspect a component** — hovering a tooth, lip shroud, or wing shroud shows a custom themed
tooltip: a heading with the component label ("Tooth 3", "Lip shroud 2", "Wing shroud 1") and a
status dot, then Status (in the status colour), Machine, Type (when Machine Type is bound),
Component (its key), Last seen (local date and time to the minute, when bound), and any bound
tooltip fields.

**Respond to an alarm** — when a component newly transitions into an alarm status: the component
flashes red/dark red with a glow, the card frame flashes, a flashing "ALARM!" chip and an animated
center warning icon appear, and a top-left banner lists each alarm type with its affected
components (type and list joined with " - ", component names separated by commas — e.g.
"Movement Alarm - Tooth 3, Lip 5"). The card sorts to the front, and audio plays for up to one
minute unless dismissed by clicking anywhere inside the visual. Visual highlighting remains while
the alarm status is active; there are no alarm ring circles.

## Visual States

The five non-normal states, all rendered with inline SVG icons and guidance text, all with audio
suppressed:

| State | Title | Trigger |
| --- | --- | --- |
| No fields | Add data to get started | No data view / no roles bound (landing page; lists the required fields and the Comp. Alarm Time tip) |
| Loading | Loading machine data | Reserved: implemented in the renderer but not produced by the current synchronous parse path |
| Invalid configuration | Configuration incomplete | One or more required roles not bound (lists each as "not bound") |
| No data | No machines to show | Roles bound but zero rows after filters |
| Error | Couldn’t render the visual | A failure not attributable to one machine — every row's machine is blank, or an unexpected render exception — shown as an `ERR · <detail>` line, with audio suppressed |

Normal data renders responsive machine cards; high-cardinality data renders up to the host row cap
with a truncation banner and scrolling.

Row/count problems that **are** attributable to a machine (bad category, out-of-range counts,
unknown status, duplicate component, the row cap splitting a machine's data) never fail the whole
visual: that machine renders its own card instead, with the bucket schematic replaced by a capped
problem list. It still sorts, alarms, and beeps like any other machine. Each problem names the
component it concerns ("Tooth 4 (EX-107-T04): status 'Broken' is not recognised. …"), never a row
position. While a row is rejected, only count problems it cannot have caused are listed (more than
20 teeth, more than 4 wing shrouds on a side).

| Card state | Badge | Trigger |
| --- | --- | --- |
| Invalid machine | ALARM! (if alarming), else DATA ERROR | The machine has one or more row-level or count validation issues |
| Incomplete machine | ALARM! (if alarming), else INCOMPLETE | The host's 2,000-row cap cut this machine's data short; its count checks are replaced by one "row limit reached" issue |

Both have a grey frame (host foreground in high contrast) unless alarming, and the header's type and counts come from the valid rows
only.

## Status Model

Six statuses. Exact hex colours and canonical keys are defined once in
[VISUAL_CONTRACT.md › Status Model](VISUAL_CONTRACT.md#status-model); accepted input spellings
(several per status, case-insensitive) are in
[DATA_SCHEMA.md › Status values](DATA_SCHEMA.md#status-values).

| Status (as displayed) | Visual Treatment | Audio Alarm |
| --- | --- | --- |
| OK | Green | No |
| No Data (1h) | Yellow | No |
| Lockout | Blue | No |
| Lockout + No Data | Dark blue | No |
| Proximity Alarm | Flashing red | Yes, on transition into alarm |
| Movement Alarm | Flashing dark red | Yes, on transition into alarm |

### Machine frame status

Each machine card frame and badge reflect the worst status across its components:

- ALARM! (red frame): any component is in an alarm status (movement outranks proximity).
- NO DATA (yellow frame): no alarm present, and every component is either no-data or
  lockout + no-data.
- OK (green frame): otherwise.
- DATA ERROR / INCOMPLETE (grey frame): the machine has issues and no alarm (see
  [Visual States](#visual-states)).

### Alarm identity and audio

- Alarm id rule: each alarm has a stable id formed from machine + component + alarm time (the
  `alarmTime` data role, **strongly recommended**). Audio fires once per distinct alarm id and
  never re-fires for that same id, including after dismissal. The first render after the visual
  loads seeds the known alarm ids without firing audio, so pre-existing alarms do not beep on
  load. Without `alarmTime` bound, the id falls back to machine + component + "" — audio still
  fires the first time a component alarms, but a clear-then-re-alarm in the same session stays
  silent (see [DATA_SCHEMA.md › Alarm audio logic](DATA_SCHEMA.md#alarm-audio-logic)).
- Dismissal rule: clicking anywhere on the visual dismisses current audio. Dismissing does not
  re-arm the already-heard alarm id; only a genuinely new alarm id plays audio.
- Stop rule: a sounding alarm stops at once when **Enable audio alarm** is turned off or the data
  drops to an edge state (landing page, invalid configuration, no data, error). An alarm id first
  seen while audio is off never plays later.
- Audio gesture rule: browser autoplay policies require a user gesture, so audio is armed/resumed
  by a user click inside the visual before it can play.
- Audio pattern: WebAudio two-tone square-wave beep, 880 Hz then 660 Hz, ~0.24 seconds each,
  repeating every 1.5 seconds, with auto-stop after 60 seconds.
- A new alarm id while the beep is sounding does not restart it or its 60 seconds. Clearing an
  alarm does not stop a sounding beep; only a click, turning audio off, an edge state or the
  60-second limit does.

## Interactions

- Selection/cross-filter: clicking a component selects it and cross-filters other visuals on the
  page; Ctrl+click adds or removes a component. Components outside the selection dim to 40 %
  opacity (alarming components stay fully visible), re-applied on every render. Clicking empty
  space in the visual clears the selection. Every click inside the visual also arms audio and stops a sounding alarm.
- Highlight: not supported, so a selection in another visual filters this one. A machine left
  with a few components then shows count issues; set Edit interactions to None on visuals that
  should not filter it.
- Tooltips: component-level custom themed HTML tooltips (not the Power BI host tooltip service)
  with component metadata and user-added fields. A tooltip closes as soon as the pointer leaves its
  component or the visual. While the pointer stays on the component it closes after 8 seconds
  without pointer movement (each move restarts the count) and stays closed until the pointer leaves
  that component and returns. Moving onto another component opens that component's tooltip. A data
  refresh updates an open tooltip's content without restarting its count or reopening a closed one.
- Sorting: alarm priority overrides base order in fleet view (movement before proximity, then
  alarm count); ties keep source order.
- Drill: not used — the visual auto-renders the single-machine detail view when one machine is
  present and the fleet view otherwise.
- Context menu: right-click opens Power BI's default context menu, for the component under the
  pointer or, elsewhere, with no data point.
- Hosts that disallow interactions (`allowInteractions` false): clicks, the context menu and
  keyboard navigation do nothing, so audio can be neither armed nor stopped by a click.
- Formatting pane: minimum card width (Layout); wing side assignment and teeth/lip order
  (Ordering); audio toggle and alarm motion (Alarm). Status strings and colours are fixed and
  bucket geometry is adaptive — neither is author-configurable.
- Keyboard/focus: components are focusable. Right/Down moves focus to the next component and
  Left/Up to the previous one, card by card (wing shrouds, lip shrouds, teeth), wrapping at the
  ends; Enter/Space selects (Ctrl adds).

## Accessibility

- Status never relies on color alone: alarm animation, labels, ARIA labels, and tooltips provide
  secondary signals.
- Audio alarm is dismissible.
- The **Alarm motion** setting controls flashing without ever hiding the alarm: *Always flash*
  (default) ignores the OS reduced-motion setting so a safety alarm is never silently suppressed;
  *Auto* renders a solid, still-prominent alarm when the OS requests reduced motion; *Never* is
  always solid. Audio is independent (governed by the audio toggle).
- High-contrast mode: fills, strokes, and outlines adapt to the host high-contrast palette.
- Components carry `aria-label`s ("Tooth 3: OK"); cards carry machine-level `aria-label`s.

## Acceptance Criteria

- With one machine, the card fills the visual while preserving bucket layout proportions.
- With multiple machines, uniform fixed-height cards flex-wrap to fill the available width; each
  card's width tracks its bucket aspect ratio; wrapped cards scroll instead of paginating.
- Teeth, lip shrouds, and wing shrouds render with dynamic counts and valid ordering; bucket
  geometry expands/shrinks with component counts and stays polished at supported card sizes.
- Component statuses map to the defined colors/animations; tooltips show required metadata and
  optional user-added fields.
- A new alarm id triggers audio for up to one minute; clicking anywhere dismisses it; a dismissed
  id never re-fires; a genuinely new id (new component alarm, or same component at a new alarm
  time) plays audio.
- Alarming machine cards are highlighted (flashing frame, ALARM! chip, center icon, top-left
  banner) and sorted to the front; there are no alarm ring circles.
- No data, invalid config, and error states never crash the visual and suppress audio.
