 Product Spec

This file defines what the Power BI custom visual must do. Keep implementation details out unless
they affect user-visible behavior.

Design source: [design_handoff_bucket_health](design_handoff_bucket_health/README.md). Treat the
handoff prototypes as the visual fidelity reference.

## Summary

Build a full-page-style Power BI custom visual for monitoring mining machine bucket health. The
visual renders one responsive machine card per machine. Each machine card shows a high-fidelity,
front-on schematic with depth shading adaptive bucket with dynamic GET (Ground Engaging Tools) component counts for teeth, lip
shrouds, and wing shrouds. The bucket shape itself expands, shrinks, and changes proportions based on
the component layout so the visual feels purpose-built rather than static. Components are color-coded
by status, support rich custom tooltips, and alarm states trigger visual prominence plus a dismissible
one-minute audio alarm when a component newly transitions into an alarming status.

## Problem

Mining operations need a fast visual way to see which machines and bucket components need attention.
Standard Power BI tables or charts do not show the physical bucket layout clearly enough, especially
when the number of machines and the number/order of components changes by machine.

## Target Users

- Report authors: configure the visual in Power BI reports, bind machine/component/status fields,
  and choose layout/status settings.
- Report consumers: monitor active machine bucket status and quickly spot alarms or missing data.
- Operations stakeholders: review fleet-level bucket health and prioritize response to alarms.

## Goals

- Render between 1 and 20 machines in one visual.
- Make one machine fill most/all available visual space when only one machine is present.
- Arrange machine cards as uniform fixed-height cards that flex-wrap to fill the available width;
  each card's width tracks its bucket aspect ratio (more teeth produces a wider card). There is no
  fixed column-count rule.
- Show scrollbars once the wrapped cards overflow the available space.
- Render bucket/GET components by category:
  - Teeth: dynamic count from 4 to 20.
  - Lip shrouds: always `teeth - 1`.
  - Wing shrouds: up to 8 total, up to 4 on each side.
- Render a masterclass bucket shape:
  - Bucket geometry must adapt to GET counts using the front-on parametric SVG model from the design
    handoff.
  - More teeth/lip shrouds should visually extend/widen the bucket edge.
  - More wing shrouds should extend/shape the bucket sides.
  - Fewer GET components should shrink and rebalance the bucket proportionally.
  - Component shapes must look integrated into the bucket, not pasted onto a static image.
- Support configurable component ordering:
  - Teeth and lip shrouds default left-to-right incremental.
  - Wing shrouds are assigned to left/right sides by visual settings from component order: odd/even
    side assignment or sequential order split, with either side direction available.
- Show each component's status using color and alarm animation.
- Show tooltip data for each component, including component name, tag ID, status, last seen, and any
  additional user-provided fields.
- Trigger a dismissible audio alarm for alarm status transitions.
- Move/highlight alarming machine cards for maximum visibility.

## Non-Goals

- No implementation/scaffold assumptions until the visual contract is finalized.
- No external network calls unless explicitly approved and declared in the visual privileges.
- No writeback/control of machine systems from the visual.
- No assumption yet that this is AppSource-certified; certification target is an open question.

## Core User Workflows

### Monitor One Machine

- Starting context: report contains one machine with valid component data.
- User action: report consumer views the visual.
- Expected visual response: one machine card scales to fill the visual, with bucket components shown
  clearly and proportionally. The bucket body and GET geometry adapt to the machine's component
  counts.
- Success criteria: all components are readable, status colors are clear, and hover tooltips expose
  component metadata.

### Monitor Multiple Machines

- Starting context: report contains 2 to 20 machines.
- User action: report consumer views or resizes the visual.
- Expected visual response: machine cards keep a uniform fixed height and flex-wrap to fill the
  available width; each card is as wide as its bucket aspect ratio requires (more teeth = wider).
  When the wrapped cards exceed the available space, scrolling is used. Each card keeps its adaptive
  bucket proportions.
- Success criteria: layout remains legible, cards do not overlap, and resizing reflows the wrapped
  cards without breaking the bucket/component geometry.

### Inspect A Component

- Starting context: visual shows a machine bucket with component statuses.
- User action: report consumer hovers over a tooth, lip shroud, or wing shroud.
- Expected visual response: a custom themed tooltip displays the component label, a human-readable
  status, the machine, the full local Last seen date and time, and any additional fields bound by the
  report author.
- Success criteria: tooltip content is correct for the hovered component and does not obscure
  critical alarm visibility more than necessary.

### Respond To An Alarm

- Starting context: one or more components transition from a non-alarm status to an alarm status.
- User action: report consumer sees/hears the alarm and clicks anywhere inside the visual to dismiss
  audio.
- Expected visual response: the affected component flashes red/dark red with a flashing glow, the
  affected machine card frame flashes, a large flashing "ALARM!" chip and an animated center warning
  icon appear, a top-left banner lists the alarm type(s) and the affected component names (joined with
  " - "), the card is moved to the top-left/front of the visual ordering, and audio plays for up to
  one minute unless dismissed. There are no alarm ring circles.
- Success criteria: alarm is obvious, audio stops on dismissal, visual highlighting remains while the
  alarm status remains active, and the machine returns to normal ordering only when alarm priority no
  longer applies.

## Visual States

- Empty/no fields: show setup guidance for required machine and component fields.
- Loading: show a lightweight loading state without stale alarm audio.
- Invalid configuration: explain which required data roles are missing or inconsistent.
- No data: show an empty state with no machine cards.
- Normal data: render responsive machine cards and components.
- High-cardinality data: render up to supported limits and use scrolling/overflow behavior.
- Error: show a non-crashing error state and suppress new audio alarms until valid data returns.

The five non-normal states must match `States.dc.html`:

- Add data to get started.
- Loading machine data.
- Configuration incomplete.
- No machines to show.
- Couldn't render the visual.

## Status Model

The six statuses and how each is treated. Exact hex colours, canonical keys, and alarm precedence are
defined once in [VISUAL_CONTRACT.md › Status Model](VISUAL_CONTRACT.md#status-model); accepted input
spellings are in [DATA_SCHEMA.md › Status values](DATA_SCHEMA.md#status-values).

| Status (as displayed) | Visual Treatment | Audio Alarm |
| --- | --- | --- |
| OK | Green | No |
| No Data (1h) | Yellow | No |
| Lockout | Blue | No |
| Lockout + No Data | Dark blue | No |
| Proximity Alarm | Flashing red | Yes, on transition into alarm |
| Movement Alarm | Flashing dark red | Yes, on transition into alarm |

### Machine Frame Status

Each machine card frame and badge reflect the worst status across its components:

- ALARM! (red frame): any component is in an alarm status.
- NO DATA (yellow frame): no alarm present, and every component is either no-data or
  lockout + no-data.
- OK (green frame): otherwise.

Alarm id rule: each alarm has a stable id formed from machine + component + alarm time (the
`alarmTime` data role, which is **strongly recommended**). Audio fires once per distinct alarm id and never
re-fires for that same id, including after the audio has been dismissed. The first render after the
visual loads seeds the known alarm ids without firing audio, so pre-existing alarms do not beep on
load. Without `alarmTime` bound, the id falls back to machine + component + "" — audio still fires
the first time a component alarms, but if that component clears and re-alarms in the same session the
id is already cached and no further audio plays.

Dismissal rule: clicking anywhere on the visual dismisses current audio. Dismissing does not re-arm
the already-heard alarm id; only a genuinely new alarm id (a new machine/component alarm, or the same
component alarming again at a new alarm time) plays audio.

Audio gesture rule: browser autoplay policies require a user gesture, so audio is armed/resumed by a
user click inside the visual before it can play.

Audio pattern: WebAudio two-tone square-wave beep, 880 Hz then 660 Hz, approximately 0.24 seconds
each, repeating every 1.5 seconds, with auto-stop after 60 seconds (one minute).

## Interactions

- Selection/cross-filter: clicking a component selects it and cross-filters other visuals on the
  page (PR #11).
- Highlighting: alarm machine cards are highlighted and prioritized visually.
- Tooltips: component-level custom themed HTML tooltips (not the Power BI host tooltip service) with
  component metadata and user-added fields.
- Sorting: alarm priority overrides base order in fleet view (movement before proximity, then alarm
  count); ties keep source order.
- Drill: not used — the visual auto-renders the single-machine detail view when one machine is
  present and the fleet view otherwise.
- Context menu: right-click opens Power BI's default context menu (PR #11).
- Formatting pane: report authors configure minimum card width (Layout), wing side assignment and
  teeth/lip order (Ordering), and audio + alarm motion (Alarm). Status strings and colours are fixed
  and bucket geometry is adaptive — neither is author-configurable.
- Keyboard/focus: components are focusable; arrow keys move focus and Enter/Space selects (PR #11).

## Data Requirements

Link the detailed host contract in [VISUAL_CONTRACT.md](VISUAL_CONTRACT.md).

Known logical entities:

- Machine — name and unique identifier; one card per machine
- Machine Type (e.g., "Hydraulic Excavator") — optional label shown in card header
- GET component — name, unique within its machine
- GET component category: tooth, lip shroud, wing shroud
- Component order — integer position; wing shroud side is derived from this value by a visual setting
- Component status — one of six accepted strings
- Comp. Alarm Time — timestamp when alarm was raised; optional but strongly recommended for correct per-session re-alarm audio
- Last seen timestamp — optional; shown in tooltip
- Tooltip metadata fields — any extra columns bound by the report author

## Performance Requirements

- Target render/update time: TBD.
- Maximum machines: 20.
- Teeth per machine: 4 to 20.
- Lip shrouds per machine: `teeth - 1`.
- Wing shrouds per machine: 0 to 8 total, up to 4 per side.
- Resize behavior: reflow cards and rescale bucket geometry without overlap.
- Adaptive bucket behavior: recompute bucket body/edge/side geometry from component counts and card
  dimensions.
- Alarm responsiveness: alarm visual/audio should react on the next Power BI update cycle.
- Fleet layout behavior: uniform fixed-height cards flex-wrap to fill the available width, each card
  as wide as its bucket aspect ratio requires; scrolling appears when the wrapped cards overflow.
  There is no fixed column-count rule.

## Accessibility Requirements

- Status cannot rely on color alone; alarm animation, labels/tooltips, or icons must provide a
  secondary signal.
- Audio alarm must be dismissible.
- An in-visual **Alarm motion** setting controls flashing without ever hiding the alarm: *Always
  flash* (default) ignores the OS reduced-motion setting so a safety alarm is never silently
  suppressed; *Auto* flashes but renders a solid, still-prominent alarm when the OS requests reduced
  motion; *Never* is always solid. Audio is independent (governed by the audio toggle).
- Keyboard/focus: components are focusable; arrow keys move focus and Enter/Space selects (PR #11).
- Screen reader strategy: not yet implemented; tracked as a post-ship enhancement.

## Acceptance Criteria

- With one machine, the machine card fills the visual while preserving bucket layout proportions.
- With 2 to 20 machines, uniform fixed-height cards flex-wrap to fill the available width.
- Each card's width tracks its bucket aspect ratio (more teeth = wider); there is no fixed
  column-count rule, and wrapped cards scroll instead of paginating when they overflow.
- Teeth, lip shrouds, and wing shrouds render with dynamic counts and valid ordering.
- Bucket body and GET geometry expand/shrink based on component counts.
- Component shapes are integrated into the bucket shape and remain visually polished at supported
  card sizes.
- Component statuses map to the defined colors/animations.
- Component custom tooltips show required metadata and optional user-added fields.
- A new alarm id triggers audio for up to one minute.
- Clicking anywhere inside the visual dismisses current audio; the dismissed alarm id does not
  re-fire.
- A genuinely new alarm id (new component alarm, or the same component at a new alarm time) plays
  audio; an already-heard id never re-fires.
- Alarming machine cards are highlighted (flashing frame, ALARM! chip, center icon, top-left banner)
  and moved/prioritized to the top-left/front; there are no alarm ring circles.
- No data, invalid config, and error states do not crash the visual.

## Open Questions

### Business And Users

- What is the official name of this visual?
- Is the visual for internal reports only, or should it target AppSource/certification?
- Who is the primary user during an alarm: dispatcher, maintenance planner, operator, supervisor?
- What decision should the user make after seeing an alarm?

### Data Shape

- What are the real source column names for machine, component, category, order, status, and
  lastSeen?
- Confirm lip shroud rows are always supplied and equal to `teeth - 1`.
- Are missing component rows valid, or should the visual generate placeholders?
- What is the unique key for a machine?
- What is the unique key for a component?
- What exact field contains status?
- Are status values always these exact strings, or should status mapping be configurable?
- What timezone is `last seen` in, and should it be formatted locally or as provided?
- What optional tooltip fields should be supported, and how many?

### Layout And Geometry

- What minimum machine card width/height is still useful?
- Should the layout prefer rows first, columns first, or best-fit grid?
- Should report authors control fixed card width/height, min size, or automatic scaling only?
- Should scrollbars be inside the visual or should cards paginate/virtualize?
- What should happen if there are more than 20 machines?
- What exact bucket shape should be drawn: schematic, realistic side/front view, or stylized diagram?
- Does the approved front-on SVG design fully satisfy "masterclass" quality, or is another visual
  reference still required?
- Should different machine types have different bucket proportions?
- Do machine cards need machine name, type, current status summary, or other header metrics?

### Component Ordering

- Should tooth/lip order be based on numeric order field, physical left-to-right order, or tag ID?
- How should custom order changes be provided: data field, formatting setting, or calculated sort?
- For wing shrouds, which default is correct: odd left/even right, odd right/even left, first half
  left/second half right, or first half right/second half left?
- Within each wing side, does order run top-to-bottom, bottom-to-top, front-to-back, or back-to-front?
- Can a machine have asymmetric wing shroud counts?

### Status And Alarms — resolved

- Status precedence: movement > proximity > lockout+nodata > lockout > nodata > ok (see
  [VISUAL_CONTRACT.md › Status Model](VISUAL_CONTRACT.md#status-model)). Movement outranks proximity.
- A dismissed alarm stays visually highlighted; dismissing only stops the audio.
- Audio requires a user gesture (browser autoplay policy): it is armed on the first click inside the
  visual and gated by the **Enable audio alarm** setting.

### Power BI Behavior

- Should clicking a machine/component cross-filter other visuals?
- Should Power BI selection highlight selected components/machines?
- Should the visual support report page tooltips?
- Should it support drillthrough or hierarchy drill?
- Should the machine reorder caused by alarms persist across filter changes?
- Should sorting be controlled by Power BI sort fields or visual logic?
