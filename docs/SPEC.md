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
by status, support rich tooltips, and alarm states trigger visual prominence plus a dismissible
two-minute audio alarm when status changed to alarming statuses from any other statuses.

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
- Dynamically arrange multiple machine cards side by side or top to bottom based on visual dimensions.
- Show scrollbars once cards would otherwise become too small to be useful.
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
  - Wing shrouds default odd numbers on one side and even numbers on the other side, with the `side` data field (left/right) taking precedence if bound, and side direction configurable as a fallback.
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
- Expected visual response: machine cards dynamically reflow based on available width/height. More
  machines produce smaller cards until the configured minimum card size is reached, then scrolling is
  used. Each card keeps its adaptive bucket proportions even when scaled down.
- Success criteria: layout remains legible, cards do not overlap, and resizing does not break the
  bucket/component geometry.

### Inspect A Component

- Starting context: visual shows a machine bucket with component statuses.
- User action: report consumer hovers over a tooth, lip shroud, or wing shroud.
- Expected visual response: tooltip displays component name, tag ID, status, last seen, and any
  additional fields bound by the report author.
- Success criteria: tooltip content is correct for the hovered component and does not obscure
  critical alarm visibility more than necessary.

### Respond To An Alarm

- Starting context: one or more components transition from a non-alarm status to an alarm status.
- User action: report consumer sees/hears the alarm and clicks anywhere inside the visual to dismiss
  audio.
- Expected visual response: affected component flashes red/dark red, affected machine card is
  highlighted and moved to the top-left/front of the visual ordering, and audio plays for up to two
  minutes unless dismissed.
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

| Status | Visual Treatment | Audio Alarm |
| --- | --- | --- |
| OK | Green | No |
| No Data Last Hour | Yellow | No |
| Lockout | Blue | No |
| Lockout + No Data Last Hour | Dark blue | No |
| Proximity Alarm | Flashing red | Yes, on transition into alarm |
| Movement Alarm | Flashing dark red | Yes, on transition into alarm |

Alarm transition rule: audio starts only when a component moves from any non-alarm status into
`Proximity Alarm` or `Movement Alarm`. Audio should not restart continuously while the same alarm
remains active.

Dismissal rule: clicking anywhere on the visual dismisses current audio. Audio stays armed; a fresh
alarm transition should restart audio.

Audio pattern: WebAudio two-tone square-wave beep, 880 Hz then 660 Hz, approximately 0.24 seconds
each, repeating every 1.5 seconds, with auto-stop after 120 seconds.

## Interactions

- Selection/cross-filter: TBD.
- Highlighting: alarm machine cards are highlighted and prioritized visually.
- Tooltips: component-level Power BI/tooltips with component metadata and user-added fields.
- Sorting: machine/card order is affected by alarm priority; base ordering is TBD.
- Drill: TBD.
- Context menu: TBD.
- Formatting pane: report author should be able to configure layout, minimum card size, colors,
  status-string mapping, audio behavior, ordering rules, and alarm priority.
- Keyboard/focus: TBD.

## Data Requirements

Link the detailed host contract in [VISUAL_CONTRACT.md](VISUAL_CONTRACT.md).

Known logical entities:

- Machine
- Machine Type (e.g., "Hydraulic Excavator")
- GET component
- GET component category: tooth, lip shroud, wing shroud
- Component order/index
- Component side for wing shrouds
- Component status
- Last seen timestamp
- Tooltip metadata fields

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
- Fleet grid behavior: 1 machine = 1 column, 2 machines = 2 columns, 3-6 machines = 3 columns, 7-12
  machines = 4 columns, 13-20 machines = 5 columns, with vertical scrolling when needed.

## Accessibility Requirements

- Status cannot rely on color alone; alarm animation, labels/tooltips, or icons must provide a
  secondary signal.
- Audio alarm must be dismissible.
- Reduced motion behavior is required for flashing alarms.
- Keyboard/focus behavior is TBD.
- Screen reader strategy is TBD.

## Acceptance Criteria

- With one machine, the machine card fills the visual while preserving bucket layout proportions.
- With 2 to 20 machines, cards reflow responsively based on visual dimensions.
- Fleet layout follows the handoff column rules and vertically scrolls instead of paginating.
- Cards do not shrink below a defined minimum useful size; overflow scrollbars appear instead.
- Teeth, lip shrouds, and wing shrouds render with dynamic counts and valid ordering.
- Bucket body and GET geometry expand/shrink based on component counts.
- Component shapes are integrated into the bucket shape and remain visually polished at supported
  card sizes.
- Component statuses map to the defined colors/animations.
- Component tooltips show required metadata and optional user-added fields.
- Alarm transitions trigger audio for up to two minutes.
- Clicking anywhere inside the visual dismisses current audio while keeping alerts armed.
- A fresh alarm transition restarts audio while alerts are armed.
- Alarming machine cards are highlighted and moved/prioritized to the top-left/front.
- No data, invalid config, and error states do not crash the visual.

## Open Questions

### Business And Users

- What is the official name of this visual?
- Is the visual for internal reports only, or should it target AppSource/certification?
- Who is the primary user during an alarm: dispatcher, maintenance planner, operator, supervisor?
- What decision should the user make after seeing an alarm?

### Data Shape

- What are the real source column names for machine, component, category, order, side, status, and
  lastSeen?
- Will report authors supply lip shroud rows when explicit lip statuses are needed, or should lip
  statuses always be inferred/defaulted?
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
- For wing shrouds, which default is correct: odd right/even left, or odd left/even right?
- Within each wing side, does order run top-to-bottom, bottom-to-top, front-to-back, or back-to-front?
- Can a machine have asymmetric wing shroud counts?

### Status And Alarms

- Which status wins if multiple statuses are present for the same component?
- If a machine has both proximity and movement alarms, which alarm color/priority wins?
- Should movement alarm outrank proximity alarm?
- Should an acknowledged/dismissed alarm remain visually highlighted?
- Is audio allowed in Power BI service/Desktop without user gesture, or do we need a visual-level
  "enable audio" interaction/setting?

### Power BI Behavior

- Should clicking a machine/component cross-filter other visuals?
- Should Power BI selection highlight selected components/machines?
- Should the visual support report page tooltips?
- Should it support drillthrough or hierarchy drill?
- Should the machine reorder caused by alarms persist across filter changes?
- Should sorting be controlled by Power BI sort fields or visual logic?
