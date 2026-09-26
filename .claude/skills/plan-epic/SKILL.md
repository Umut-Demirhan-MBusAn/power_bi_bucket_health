---
name: plan-epic
description: Use when starting non-trivial work in power_bi_bucket_health — a new feature, epic, subsystem, host-contract change, or anything likely to span more than one PR — before any code, spec or issue exists; or when asked to plan, spec, scope or break work into issues.
---

# Plan an epic (power_bi_bucket_health)

superpowers:brainstorming and superpowers:writing-plans run the dialogue. This skill adds where the
files go, their shape ([templates.md](templates.md)), the repo checks and the handoff. Planning
writes no product code.

## 1. Classify out loud

**REQUIRED SUB-SKILL:** superpowers:brainstorming. Name the path before the first question, so the
owner can override it.

| Path | When | What follows |
| --- | --- | --- |
| Spike | "can we…", an answer not code | brainstorming's spike path |
| Bounded | one PR, no new or changed data role, no new subsystem | a design in chat, the owner's yes, then `ship-feature` |
| Architectural | a new or changed data role or formatting card, a new subsystem (e.g. a new renderer or host service), or more than one PR | steps 2–8 |

In doubt, take the heavier path. "I want code tonight" or "the spec is basically in the chat"
changes the timetable, not the path: approval in chat approves the design, and the written spec and
plan still reach the owner before any code. On either path, a design that departs from a rule
`docs/SPEC.md` or `docs/VISUAL_CONTRACT.md` records names it and asks which one gives way.

## 2. Design

Read first: the `docs/SPEC.md`, `docs/VISUAL_CONTRACT.md` and `docs/ARCHITECTURE.md` sections that
govern the area, the modules it touches, and the open issues around it. Number decisions D1…Dn as
the owner makes them.

## 3. Specs

One per independent piece: `docs/specs/<area>-<piece>.md` (never `docs/superpowers/`) from the spec
template, with a row in `docs/specs/README.md` (the first spec creates it), written in a
`docs/<slug>` worktree (`git-workflow`). **Stop** until the owner has reviewed the written specs;
"your call" or silence is not a review.

## 4. Execution plan

**REQUIRED SUB-SKILL:** superpowers:writing-plans, with slices instead of bite-sized tasks:
`docs/specs/<epic>-execution-plan.md` from the plan template. Skip its execution question; step 8
replaces it. **Stop** until the owner has reviewed the plan.

## 5. Repo checks while slicing

- **Ask-first:** a slice touching AGENTS.md's "Ask first" list says so in its column.
- **Host contract:** a slice that changes `capabilities.json` carries its `src/settings.ts`,
  `docs/VISUAL_CONTRACT.md` and `docs/SPEC.md` changes with it. Data roles are only ever added, never
  renamed, removed or retyped, and `privileges` stays `[]` (`docs/MAINTENANCE.md`).
- **Single writers:** slices that edit `capabilities.json` / `src/settings.ts` chain serially, and so
  do `.github/workflows/*` edits. When two slices redefine one function or type, the plan says which
  rebases.
- **Held elsewhere:** read the open epics' status comments and `gh pr list` before assigning lanes.
- **Owner work** (a tenant setting, the admin upload, a check in the Power BI Service) is its own
  issue, titled `owner: <what>`.

## 6. Issues

After the plan review: the epic issue (titled `epic: <name>`) if none exists, then one issue per
slice from the issue template, with the existing labels that fit (`gh label list`: bug,
enhancement, accessibility, ci, documentation, repo-hygiene); never invent a label. Fill the plan's
Issue column and the epic's "Children, in order" and D-list.

## 7. Docs PR

Specs, plan and index row go in one docs PR, finished by `pr-finish`. No slice starts before it
merges, so issue links resolve on `main`; until then, stop at a green PR and say what it waits for.

## 8. Handoff

Report the PR, the issues and the plan, and stop. When the owner says to build it,
`implementation-pipeline` Kickoff takes the plan.
