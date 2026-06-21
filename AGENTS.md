# power_bi_bucket_health

This is a spec-driven repository for a complex Microsoft Power BI custom visual. Documentation is
the operating system for the project: keep the spec, host contract, architecture, decisions, and
backlog aligned with the work.

## Source Of Truth

- `BACKLOG.md` tracks tasks, deliverables, status, acceptance criteria, blockers, and milestones.
- `docs/SPEC.md` defines user-visible behavior and product requirements.
- `docs/VISUAL_CONTRACT.md` defines the Power BI host contract: data roles, mappings, formatting,
  privileges, and interactions.
- `docs/ARCHITECTURE.md` records implementation structure and technical strategy.
- `docs/DECISIONS.md` records durable decisions.
- `docs/RESEARCH.md` records researched facts and links.

Before non-trivial work, read `BACKLOG.md` and the relevant spec docs. Update `BACKLOG.md` whenever
work starts, completes, gets blocked, or changes scope.

## Workflow

- Work on a branch for non-trivial changes.
- Keep changes scoped to the requested task.
- Use Conventional Commits when creating commits.
- Stage files explicitly with `git add <path>`.
- Do not assume a frontend, backend, database, deployment target, or CI provider until project files
  define one.
- Do not scaffold or implement the visual until the related spec, visual contract, and acceptance
  criteria are clear enough to test.
- For new tasks, add or update a backlog item with status, deliverable, owner, and acceptance
  criteria before making broad changes.

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
- Do not let docs drift from implementation. If behavior changes, update the relevant spec or
  decision record in the same change.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
