---
description: Rebase the current feature branch on origin/main, run local validation, and prepare or merge the PR when green.
---

Finish the current feature branch. Do not proceed past any failing step; stop and report.

1. **Branch check:** `git branch --show-current` - must not be `main`. If it is, stop.
2. **Sync:** `git fetch origin && git rebase origin/main`. If conflicts arise, resolve them locally
   and ask the owner if the resolution is non-trivial.
3. **Gate:** run the validation commands defined by the project (`AGENTS.md`, package scripts, CI
   config, or task-specific docs). If no commands are defined yet, state that clearly.
4. **Push:** `git push --force-with-lease origin HEAD` for your own feature branch only.
5. **PR:** if none exists, `gh pr create --fill --base main`; otherwise reuse the open PR.
6. **Wait for CI:** `gh pr checks --watch`. Do not merge while red.
7. **Merge only when green:** prefer squash merge unless the repo has documented a different policy.
   The final commit message should summarize the PR clearly.
8. **Clean up** the worktree if one was used.
