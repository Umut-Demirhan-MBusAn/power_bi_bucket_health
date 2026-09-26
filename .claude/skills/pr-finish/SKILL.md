---
name: pr-finish
description: Use when a power_bi_bucket_health feature branch is ready for a PR, or an open PR needs finishing.
---

Finish the current feature branch. **Do not go past a failing step: stop and report it.**

1. **Branch check:** `git branch --show-current` is not `main`. If it is, stop.
2. **Sync:** `git fetch origin && git rebase origin/main`. Resolve conflicts locally (ask the owner
   if non-trivial).
3. **Gate:** the section below, on the rebased branch. Any failure: stop and report it.
4. **Push:** `git push --force-with-lease origin HEAD` (your own feature branch only).
5. **PR:** if none exists, write the body to a file outside the worktree, carrying `Closes #N` for
   every issue it closes, and run
   `gh pr create --base main --title "<conventional title>" --body-file <file>`; else reuse the
   open one. `--fill` takes the body from the commits, so it cannot carry `Closes #N`.
6. **Wait for CI:** `gh pr checks <n> --watch` in the background. Never merge while a check is red
   or pending; a watch that errors or times out is not green — watch again.
7. **Merge — once the PR's review is approved and CI is green:**
   `BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch`, with a conventional-commit
   message summarising the whole PR. Approved means the `code-reviewer` verdict is `ship`, or the
   same reviewer, resumed, verified its must-fixes; changes the owner requested on the PR come first.
   Not approved yet: stop after step 6 and report the PR as ready. Inside a worktree the local
   branch cleanup can fail with "main is already checked out" after the remote merge succeeded:
   confirm with `gh pr view <n> --json state` and delete the remote branch by hand if needed.
8. **Clean up:** `git-workflow` §6; close or update the linked issue.

A release (tag `vX.Y.Z.0` → the CI `release` job → GitHub Release) is not part of finishing a PR: it
waits for the owner's explicit word (`docs/MAINTENANCE.md` "Release").

## Gate

AGENTS.md "Pre-PR gate" is the rule; these are its commands, from the worktree root. The whole set
takes about a minute; run all of it.

```
npm ci
npm run check:version
npm test
npm run eslint
npm run validate:fixtures
npm audit --audit-level=moderate
npm run package
```

Then the rows of AGENTS.md "Pre-PR gate" for what the diff touches
(`git diff --name-only origin/main...HEAD`): a `capabilities.json` or `src/settings.ts` change
carries its `docs/VISUAL_CONTRACT.md` and `docs/SPEC.md` update; a `.github/workflows/**` change has
the owner's approval.
