# power_bi_bucket_health

This is a new repository. Keep project instructions lightweight until the actual stack and workflow
are established.

## Workflow

- Work on a branch for non-trivial changes.
- Keep changes scoped to the requested task.
- Use Conventional Commits when creating commits.
- Stage files explicitly with `git add <path>`.
- Do not assume a frontend, backend, database, deployment target, or CI provider until project files
  define one.

## Validation

- Run the narrowest relevant checks available in the repo.
- If no validation commands exist yet, state that clearly in the handoff.
- Do not keep copied CI/deploy workflows that do not match the current project.
- For Power BI custom visual work, prefer the official `pbiviz` commands:
  - `pbiviz lint`
  - `pbiviz start` for local Power BI Developer Visual testing
  - `pbiviz package` for distributable `.pbiviz` builds

## Guardrails

- Do not commit secrets or `.env` files.
- Ask before adding new dependencies, editing CI/deploy configuration, or making destructive data
  changes.
- Prefer existing project patterns over introducing new tooling.
- Do not add external network access, local storage, or export behavior to a Power BI visual without
  declaring the matching `capabilities.json` privileges and reviewing the security impact.
