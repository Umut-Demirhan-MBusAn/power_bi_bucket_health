# GitHub Copilot Instructions

Read [`AGENTS.md`](../AGENTS.md) first. It is the shared source of truth for project workflow,
commands, and guardrails.

## Copilot Guidance

- Keep changes scoped to the requested task and the existing project structure.
- Read `BACKLOG.md` and relevant docs before non-trivial changes.
- Update `BACKLOG.md` when task status, deliverables, blockers, or acceptance criteria change.
- Do not assume a technology stack until project files define it.
- Prefer branches and pull requests for non-trivial work.
- Use Conventional Commits when creating commits.
- Run the relevant validation commands listed in `AGENTS.md` or in project scripts before proposing
  a merge.
- Do not implement behavior that is not represented in `docs/SPEC.md`, `docs/VISUAL_CONTRACT.md`,
  or an explicit backlog item.
- Ask before adding new dependencies, changing secrets or environment handling, editing CI/deploy
  workflows, or making destructive data changes.
