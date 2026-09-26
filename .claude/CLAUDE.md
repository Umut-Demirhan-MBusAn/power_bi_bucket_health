# power_bi_bucket_health — Claude Code memory

@../AGENTS.md

> **`AGENTS.md` (imported above) is the single source of truth.** Everything below is a Claude-only
> delta. Task status = GitHub Issues, never a doc.

## Claude project notes
- Dev server through `.claude/launch.json` (`pbiviz-start`, https://localhost:8080), never a
  foreground `pbiviz start`; it serves one visual at a time, machine-wide.
- Account plugins this repo does not use are switched off in `settings.json`; don't re-enable them
  here — they load skills into every session for nothing.

## Agents and hooks
- **Every subagent call names a model** (never the session model); never above high effort. One
  `code-reviewer` per change, resumed to verify a fix round, is the review ceiling
  (`implementation-pipeline` adds one per finished plan piece); the `adversarial-review` workflow
  runs only when the owner asks in this session.
- `.claude/hooks/git-guard.mjs` blocks only pushes to `main`/`master`, `git add -A`/`--all`/`.`, bare
  `git stash`/`pop`/`clear`/`save`, and `gh pr merge` without the opt-in, so autonomous runs never
  stall on a false positive; `test/unit/gitGuard.test.js` is the exact list. Once review is approved
  and CI is green, merge through the Bash tool as
  `BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch` (the PowerShell tool never
  honours the variable).
- The global `agentic-development` skill is the operating manual for subagents, workflows and hooks.

## superpowers in this repo
Where a superpowers skill and a repo skill cover the same step, the repo skill wins:

| superpowers | here |
| --- | --- |
| brainstorming, writing-plans | through `plan-epic`: specs and plans in `docs/specs/`, never `docs/superpowers/` |
| subagent-driven-development, executing-plans | `implementation-pipeline` (an epic) or `ship-feature` (one change) |
| using-git-worktrees | manual work: `git-workflow`'s `git worktree add ../<repo>-<slug>`; Agent-tool isolation worktrees under `.claude/worktrees/` keep their place and are removed after merge |
| finishing-a-development-branch | `pr-finish`; never a local merge |
| requesting-code-review | the `code-reviewer` agent, one pass |
| dispatching-parallel-agents | one worktree per agent, a named model |
| test-driven-development | red-green as written; the full `npm test` is cheap, so implementers run it |

verification-before-completion, systematic-debugging (inside `debugger`) and receiving-code-review
apply as written.
