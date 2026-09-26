# power_bi_bucket_health — GitHub Copilot instructions

**Single source of truth: [`CLAUDE.md`](../CLAUDE.md) at the repo root.** Read it first and follow
it — the git workflow, Pre-PR gate, boundaries and merge method (squash-only, enforced by the
"Protect main" ruleset) live there and are NOT restated here, so they can't drift.

Three invariants worth repeating because violating them is unrecoverable:
- **NEVER commit or push to `main`.** Branch off fresh `origin/main`; open a PR.
- Run the CLAUDE.md **Pre-PR gate** before opening a PR.
- **Ask first** before new dependencies, auth/secrets/env, file deletion, or CI/workflow edits; never
  add a `capabilities.json` privilege or `innerHTML`-style DOM injection.

## Copilot-specific
- The Copilot coding agent is PR-only; it does not commit to a protected branch — keep it that way.
- For Copilot-agent PRs a maintainer approves the workflow run before the required `test` check runs.
