---
name: housekeeping
description: Use when a batch of power_bi_bucket_health PRs has merged, or when asked to clean up or tidy branches, worktrees or issues.
---

# Housekeeping (power_bi_bucket_health)

Run after a batch of PRs is merged. Everything here is reversible except issue closure and worktree
removal — those two are where the damage lives, so they come last and gated.

## 0. Sync

```
R=Umut-Demirhan-MBusAn/power_bi_bucket_health
git fetch -p origin
```

`-p` prunes remote-tracking refs for branches GitHub already deleted, so the inventory below
doesn't chase ghosts.

## 1. Branch inventory — PR state is the ONLY reliable signal

**Squash-merge destroys both of the obvious checks.** `git branch --merged` reports nothing (the
squash is a new commit, so the branch tip is never an ancestor of `main`), and diffing trees against
`main` is worse than useless — a large unrelated merge makes every old branch show thousands of
changed lines whether or not its own work landed. Ask GitHub instead:

```
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ refs/remotes/origin/ \
           | grep -vE '(^|/)main$|origin/HEAD|^origin$'); do
  printf '%-45s %s\n' "$b" \
    "$(gh -R "$R" pr list --head "${b#origin/}" --state all \
        --json number,state --jq '.[0] | select(.) | "#\(.number) \(.state)"' 2>/dev/null)"
done
```

Read the result as:

| PR state | Action |
| --- | --- |
| `MERGED` | Delete. The commits are on `main`. |
| `CLOSED` | Do **not** delete on this alone — confirm the work landed some other way (a superseding PR), or it is genuinely abandoned. |
| empty | No PR was ever opened. Fall back to `git rev-list --count origin/main..<branch>`; `0` means nothing unique to lose. Anything else is unreviewed work — leave it and report it. |

Then delete, locals first:

```
git branch -D <branch>...                 # -d refuses squash-merged branches; -D is correct here
git push origin --delete <branch>...
```

**You cannot delete a branch that is checked out in any worktree**, including your own. Detach
first: `git switch --detach origin/main`.

## 2. Worktrees — one rule, whoever created them

```
git worktree prune -v            # clears entries whose directory was deleted by hand
git worktree list --porcelain | awk '/^worktree /{p=$2} /^HEAD /{h=$2} /^branch /{print p, $2} /^detached/{print p, h}' |
while read -r p ref; do
  printf '%-55s %-45s %s dirty\n' "$p" "$ref" "$(git -C "$p" status --short | wc -l)"
done
```

Remove a worktree only when all three hold, whoever created it (sibling `../<repo>-<slug>` or
`.claude/worktrees/<name>`):
- it is clean;
- its branch came back `MERGED` above, or it is detached at a commit already on `origin/main`
  (`git merge-base --is-ancestor <sha> origin/main`, the sha the listing prints);
- no session is using it.

Anything else — dirty, an unmerged branch, a detached commit not on `main`, or a doubt about who is
using it — leave it and report it.

```
git worktree remove <path>
```

You can never remove the worktree you are running in.

## 3. Issues — verify acceptance, don't pattern-match titles

A squash commit closes an issue only if the **PR body** carried `Closes #N`; the squash subject
GitHub generates does not. So shipped work routinely leaves its issue open. Find the gap:

```
gh -R "$R" pr view <n> --json title,closingIssuesReferences
```

Classify each candidate with the `issue-verifier` agent (model `sonnet`), several in parallel. Only
a `LIKELY-SHIPPED` verdict goes on to the acceptance check below; the rest stay open, with a comment
when the verdict adds evidence the thread lacks.

**A PR that obviously implemented an issue is not proof the issue is done.** Read the issue's
acceptance section and check each bullet against what actually merged. Acceptance frequently
depends on verification the PR could not perform — a check in the Power BI Service Developer
Visual, the tenant admin upload, an owner decision.

Close only what you can evidence. When closing, comment first, and **correct any earlier comment
that is now wrong** — a stale plan in the thread outlives the issue and misleads whoever reads it
next. Then:

```
gh -R "$R" issue close <n> --reason completed
```

Partially-done or blocked: comment with the current state and leave it open.

## 4. Docs that the merge just falsified

Grep for claims the shipped work invalidated — pending-owner checkboxes, "not yet", "until X
exists", test counts and inventories in `docs/TESTING.md`. These are the sentences that send the
next reader down a path that no longer exists. Fix them in the same PR as the change, or a small
follow-up.

## Never

- Delete a branch whose PR is `CLOSED` (not merged) without confirming the work landed elsewhere.
- Remove a worktree that fails §2's rule, whoever created it.
- Close an issue because a PR *looks* related — check its acceptance criteria.
- `git push origin --delete main`, or any branch another session is actively pushing to.
