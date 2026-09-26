---
name: git-workflow
description: Use at the start of any power_bi_bucket_health task that will commit, when creating or cleaning up a branch or worktree, before a push or a PR, or when unsure how to branch, commit or merge.
---

# Git workflow (power_bi_bucket_health)

CLAUDE.md "Git workflow" is the rule; these are its commands. Windows, port and certificate detail:
[worktree-setup.md](worktree-setup.md).

## 1. Branch from fresh `origin/main`, in a worktree

```
git -C C:/Working/Git/power_bi_bucket_health fetch origin
git -C C:/Working/Git/power_bi_bucket_health worktree add ../power_bi_bucket_health-<slug> -b feat/<slug> origin/main   # or fix/, chore/, docs/
```

`-C` pins the canonical clone, so the worktree lands beside it (`../<repo>-<slug>`) whatever the
current directory is. Never `git switch main`: in a worktree `main` is checked out elsewhere, and
nothing is built on a local `main`. One agent per working directory. A worktree the desktop app or
the Agent tool made under `.claude/worktrees/` keeps its place; rename its branch to this convention
with `git branch -m`.

## 2. Before the first commit in a new worktree

- `git status --short` is empty. A desktop-app worktree can start with every `.claude/**` file staged
  as deleted: `git restore --staged -- .claude && git restore -- .claude`.
- `npm ci`, and `pbiviz --version` prints 7.1.0 (a global install; worktree-setup.md).

## 3. Commit

- Stage by path: `git add <path> …` — never `git add -A` or `git add .`.
- Conventional Commits; the trailer per CLAUDE.md "Code style". A multi-line message goes through
  `git commit -F <file>`.
- A fix-up is a new commit; the squash merge folds it. Never `--amend` a commit someone else made.

## 4. Before the PR

`git fetch origin && git rebase origin/main`, conflicts resolved locally, then `pr-finish` "Gate".

## 5. PR and merge

- `git push --force-with-lease origin HEAD` — your own feature branch only.
- `gh pr create --base main --title "<conventional title>" --body-file <file>`, the body file (outside
  the worktree) carrying `Closes #N`; `--fill` takes the body from the commits and cannot carry it.
- `gh pr edit --base <branch>` does not re-run checks against the new base: push a new commit.
- Squash-and-merge only, once the PR's review is approved and CI is green:
  `BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch`. `pr-finish` runs 4–5.
- A release tag (`vX.Y.Z.0`), a GitHub Release or any publish waits for the owner's explicit word;
  the procedure is `docs/MAINTENANCE.md` "Release".

## 6. Clean up

After the merge, from outside that worktree:
`git -C C:/Working/Git/power_bi_bucket_health worktree remove C:/Working/Git/power_bi_bucket_health-<slug>`
(or the `.claude/worktrees/<name>` path). After a batch: `housekeeping`.
