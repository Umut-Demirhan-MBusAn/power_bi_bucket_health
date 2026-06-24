# Decisions

Record durable decisions here. Use short entries; link to spec/backlog items when useful.

## Template

### YYYY-MM-DD - Title

Status: Proposed / Accepted / Superseded

Decision:

Context:

Consequences:

## Accepted Decisions

### 2026-06-20 - Use spec-driven development

Status: Accepted

Decision: Maintain product requirements, host contract, architecture, and backlog documents before
implementation work.

Context: The project is a complex Power BI custom visual and needs clear behavior, data mapping,
interaction, and acceptance criteria before scaffolding and implementation.

Consequences: Agents must read and update `BACKLOG.md` and the relevant docs before making
substantive code changes.

### 2026-06-21 - Use Claude Design handoff as visual source of truth

Status: Accepted

Decision: Treat `docs/design_handoff_bucket_health` as the visual fidelity and behavior reference
for the first implementation.

Context: The handoff includes single-machine, fleet, and edge-state designs plus implementation
details for data roles, geometry math, status colors, audio behavior, and responsive layout.

Consequences: Implementation should port the handoff logic into typed Power BI visual modules rather
than shipping or depending on the `.dc.html` design files.

### 2026-06-21 - Use SVG-first adaptive bucket rendering

Status: Accepted

Decision: Implement the bucket and GET components as generated SVG using deterministic geometry
functions.

Context: The design handoff is SVG-based and gives exact constants for front-on adaptive bucket
geometry. The worst-case rendered element count is moderate enough for SVG-first implementation.

Consequences: Keep geometry generation as pure TypeScript, test it with min/max component counts, and
consider canvas/WebGL only if SVG fails measured performance or fidelity targets.

### 2026-06-21 - Use table DataView mapping

Status: Accepted

Decision: Use Power BI's `table` DataView mapping instead of `categorical` mapping.

Context: The visual requires reading multiple fields together per logical record (one row = one GET component status for one machine). Table mapping matches this contract perfectly and simplifies parsing of optional tooltip fields.

Consequences: The internal parser will normalize the flat table rows into the typed `MachineBucketModel` and `ComponentRecord` structures. Categorical mapping will only be considered if report author field well UX demands it.

### 2026-06-23 - Flex-wrap proportional layout supersedes fixed column rules

Status: Accepted

Decision: Lay out fleet cards as uniform fixed-height cards that flex-wrap to fill the available
width, with each card's width tracking its bucket aspect ratio (more teeth = wider). Remove the fixed
1/2/3-6/7-12/13-20 column-count rule and the associated `columnCount` helper.

Context: The fixed column rule forced unrelated buckets into equal-width cells, distorting bucket
proportions and wasting space. Sizing each card to its own bucket aspect ratio keeps every bucket
true to its GET counts while still filling the viewport.

Consequences: Supersedes the earlier handoff column rules in the spec and backlog. Layout legibility
is governed by wrapping and overflow scroll rather than a column count; dead `columnCount` logic and
its tests are removed.

### 2026-06-23 - Custom HTML tooltip instead of the host tooltip API

Status: Accepted

Decision: Render a custom themed HTML tooltip from within the visual instead of using the Power BI
host tooltip service / official tooltip API.

Context: The custom tooltip can be themed to match the visual and can present a human-readable status,
machine, full local Last seen date and time, and bound tooltip fields together. The official tooltip
API also does not support report-page tooltips for this use, and the host tooltip styling cannot match
the design handoff.

Consequences: The visual owns tooltip positioning, theming, and content. Adopting report-page
tooltips or the official tooltip API later would require revisiting this decision.

### 2026-06-23 - OS reduced-motion not honored for alarm flashing

Status: Superseded by 2026-06-24 (tri-state Alarm motion). The default still ignores the OS setting; the new "Auto" mode lets users opt into honoring it.

Decision: Do not honor the operating-system `prefers-reduced-motion` setting for safety-alarm
flashing. Provide an explicit in-visual `reducedMotion` toggle instead.

Context: This is a safety alarm. Letting a global OS accessibility setting silently disable the
flashing alarm could hide an active alarm from an operator who never intended to suppress it.

Consequences: The `prefers-reduced-motion` auto-disable is removed from the alarm animation path.
Users who want reduced motion must opt in explicitly through the in-visual toggle, which softens
flashing while keeping the alarm perceptible.

### 2026-06-23 - AppSource / accessibility posture deferred

Status: Superseded by 2026-06-24. AppSource certification is now the target, and the deferred features (keyboard navigation, high contrast, context menu, cross-visual selection) shipped in PR #11.

Decision: Defer keyboard navigation, high-contrast support, the context menu, cross-visual selection,
and the official tooltip API. None are implemented yet; they are gated on a certification decision.

Context: Whether the visual targets AppSource certification is still an open question. These
capabilities carry meaningful implementation and testing cost and are best scoped together once the
certification target is settled. The reduced-motion safety posture above is an intentional deviation
from typical a11y guidance that any certification review must account for.

Consequences: Tracked as backlog item PBH-018. Until the certification decision is made, the visual
ships without these host integrations, and docs note them as deferred rather than missing by
oversight.

### 2026-06-24 - Tri-state Alarm motion (Always / Auto / Never)

Status: Accepted

Decision: Replace the single reduced-motion toggle with a three-way **Alarm motion** setting:
`always` (default), `auto`, and `never`.

Context: A binary "honor OS reduced-motion or not" choice forced a trade-off between accessibility and
the safety requirement that an alarm must never be silently suppressed. A tri-state gives report
authors explicit control while keeping a safe default.

Consequences:

- `always` (default): flashes regardless of the OS `prefers-reduced-motion` setting, so a safety
  alarm is never silently suppressed by a global OS setting.
- `auto`: flashes, but renders a solid, still-prominent alarm when the OS requests reduced motion
  (a `@media (prefers-reduced-motion: reduce)` rule that excludes the `always` class).
- `never`: always solid.
- In every mode the alarm stays fully visible, and audio is independent (governed by `audioEnabled`).
  Supersedes the 2026-06-23 "OS reduced-motion not honored" decision.

### 2026-06-24 - Alarm Time is optional but strongly recommended

Status: Accepted

Decision: Keep the `alarmTime` data role optional (not a required role). Document it as strongly
recommended and explain the consequence of leaving it unbound.

Context: `alarmTime` is the only field not needed to render a bucket — the visual draws fully without
it. Making it a hard-required role would block rendering for datasets that have no alarm-timestamp
column, even though everything needed to draw is present. Its only effect is audio de-duplication.

Consequences: The visual always renders when the five required roles are bound. The alarm identity is
`machine + component + alarmTime`; without `alarmTime` the identity is `machine + component + ""`, so
a component that clears and re-alarms within one uninterrupted session will not replay audio (the
first alarm still fires; closing/reopening the report resets the cache). The visual alarm (flash or
solid) is unaffected. See [DATA_SCHEMA.md › Alarm audio logic](DATA_SCHEMA.md#alarm-audio-logic).
