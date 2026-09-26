# plan-epic templates

Fill every section; write "none" rather than dropping one. An epic's specs are deleted when it
closes, so link to them pinned to a commit once that happens.

## Spec — `docs/specs/<area>-<piece>.md`

```markdown
# <Area> — <piece>: <the outcome in a phrase>

Piece <N> of <M> under epic [#E](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/issues/E).
Siblings: <links>. Order and issue map: [<epic>-execution-plan](<epic>-execution-plan.md).
Delete this file when piece <N>'s issues close.

## Why
<the problem, who has it (report author, viewer, tenant admin), what success looks like>

## Decisions (owner, <YYYY-MM-DD>)
- **D1** <decision> — <one-line reason>
<a decision the owner delegated says so: "D2 (delegated; agent's default) …">

## 1. <design section>
<numbered sections, one per part of the design; each new data role, formatting card or property is
headed with its name and "(new …)", and gives its kind, type, default and the doc rows it adds>

## <n>. When things fail
<each failure: the edge state the viewer sees, what reaches `renderingFailed`, what recovers on the
next update>

## <n>. Accessibility
<keyboard path, ARIA, contrast, reduced motion, high contrast>

## <n>. Testing and acceptance
<named tests per section; the manual Developer Visual checks; the acceptance bullets the issues copy>

## <n>. Docs moved in the same PRs
<SPEC.md, VISUAL_CONTRACT.md, ARCHITECTURE.md, TESTING.md lines that change>

## Flagged, out of scope
<each with its issue number, or "none">
```

## Plan — `docs/specs/<epic>-execution-plan.md`

```markdown
# <Epic> — execution plan

Epic [#E](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/issues/E). Spec(s): <links>.

**Goal:** <one sentence>
**Architecture:** <two or three sentences: which layers (data, domain, geometry, rendering, audio,
visual.ts) change and how the host contract moves>

## Slice order

| # | Slice | Issue | Depends on | Ask-first |
| --- | --- | --- | --- | --- |
| 1 | <what, spec §x> | #n | — | <dependency / CI / deletion / —> |

**Lanes.** <which slices run in parallel, and why they cannot collide; the capabilities.json lane>

## Global constraints
<verbatim, numbered; every implementer brief copies them>

## Review focus
<numbered; each names the test in the slice that owns it>

## Acceptance bar
<what "the epic is done" means, checkable>

## Interfaces

| Slice | Produces | Used by |
| --- | --- | --- |
```

## Issue body — one per slice

```markdown
Part of #E · piece <N> · spec: [<spec>](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/blob/main/docs/specs/<spec>.md) §x · plan: [execution plan](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/blob/main/docs/specs/<epic>-execution-plan.md) (slice <n>)
**Depends on:** #a, #b · **Ask-first:** <what, or —>

## Why
<two or three sentences>

## Scope
<bullets naming files and behaviours; what is out>

## Interfaces produced
<types, functions, settings, data roles other slices use>

## Tests
<named, written first; each says what it proves>

## Done when
<checkable; "merged" is the last line>
```

Title: `<area>: <what>`. Labels: the existing ones that fit (`gh label list`); never invent one.

## Epic body — "Children, in order"

```markdown
## Epic

**Spec:** <links> · **Plan:** <link> (order, constraints, review focus)

### Children, in order

| Slice | Issue | Depends on |
| --- | --- | --- |
| 1 <what> | #n | — |

### Decisions (owner, <YYYY-MM-DD>)
- **D1** <decision> (<slice>)

Flagged, out of scope: <issues, or none>.
```
