---
name: git-workflow
description: Use a conservative git workflow: branch from fresh main, stage explicitly, write Conventional Commits, validate before PR, and avoid rewriting shared work.
---

# Git Workflow

Canonical source: [AGENTS.md](../../../AGENTS.md). Follow any repository-specific rules there first.

## 1. Start From Fresh Main

```bash
git fetch origin
git switch main
git pull --rebase origin main
```

## 2. Branch In Isolation

- Single-agent session: `git switch -c feat/<slug>` or `fix/<slug>`.
- Parallel agents: `git worktree add ../power_bi_bucket_health-<slug> -b feat/<slug> origin/main`.

Avoid running two agents in the same working directory. Keep feature work off `main`.

## 3. Commit

- Stage explicitly: `git add <path> ...`.
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, or `test:`.

## 4. Before The PR

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts locally, then run the validation commands defined by the project.

## 5. PR And Merge

- `git push --force-with-lease origin HEAD` for your own feature branch only; never rewrite a shared branch.
- `gh pr create --fill --base main`.
- All CI checks must pass.
- Prefer squash merge unless the repo documents a different policy.

## 6. Clean Up

```bash
git worktree remove ../power_bi_bucket_health-<slug>
```
