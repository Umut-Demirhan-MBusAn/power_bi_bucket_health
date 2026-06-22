# power_bi_bucket_health - Claude Code Memory

@../AGENTS.md

Use `AGENTS.md` as the shared source of truth for project workflow, commands, and guardrails. Keep
this file limited to Claude-specific notes that do not belong in general project documentation.

## Claude Notes

- Start non-trivial tasks by reading `BACKLOG.md`, then only the relevant spec docs.
- Keep `BACKLOG.md` current as task status, blockers, scope, or acceptance criteria change.
- Treat `docs/SPEC.md`, `docs/VISUAL_CONTRACT.md`, and `docs/ARCHITECTURE.md` as implementation
  inputs, not after-the-fact documentation.
- Do not scaffold or implement the Power BI visual until the host contract and acceptance criteria
  are clear enough to verify.
- Use the repo-wide Graphify graph at `graphify-out/graph.json` before broad source exploration when
  it exists. The shared rules live in `AGENTS.md`; `.claude/settings.json` also has hooks that remind
  Claude to query Graphify before grep/read-heavy exploration.
