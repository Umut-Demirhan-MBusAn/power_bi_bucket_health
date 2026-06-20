---
name: ship-feature
description: Ship a code change end-to-end: branch, implement, validate, commit, open a PR, and merge when checks are green.
---

# Ship A Feature

Canonical git rules live in [AGENTS.md](../../../AGENTS.md). Use this as a generic end-to-end runbook
unless the repository documents a more specific workflow.

1. **Branch.** Start from fresh main, then branch in your own worktree or checkout:
   - `git fetch origin && git switch main && git pull --rebase origin main`
   - `git worktree add ../power_bi_bucket_health-<slug> -b feat/<slug> origin/main`
   - Or `git switch -c feat/<slug>` for a single-agent session.
2. **Implement.** Follow existing project patterns. Keep changes scoped. Add or extend tests when the
   change has meaningful behavior.
3. **Gate.** Run the validation commands defined by the project. If no validation exists yet, state
   that explicitly in the PR.
4. **Commit.** Stage explicitly with `git add <path>`. Use Conventional Commits.
5. **PR.** `git fetch origin && git rebase origin/main`, resolve locally, re-run the gate, then
   `git push --force-with-lease origin HEAD` and `gh pr create --fill --base main`.
6. **Merge.** Merge only when CI is green. Prefer squash merge unless the repo documents a different
   policy.
7. **Clean up.** Remove any temporary worktree and update project tracking docs if they exist.
