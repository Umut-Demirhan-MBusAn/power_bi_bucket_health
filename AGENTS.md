# power_bi_bucket_health — Agent Instructions

Bucket Health, a Power BI custom visual (TypeScript, powerbi-visuals-api ~5.11, formattingmodel 7,
MIT; developer Umut Demirhan). **This file is the single source of truth for all coding agents**
(Claude Code, Codex, GitHub Copilot); `.claude/CLAUDE.md` and `.github/copilot-instructions.md` add
only tool-specific deltas. Product and host docs: `docs/`.

## Commands  (npm · Node ≥ 22.13, `.nvmrc` 22 · repo root)
- Install `npm ci`. `pbiviz` is a GLOBAL install, never a dependency:
  `npm i -g powerbi-visuals-tools@7.1.0`.
- Test `npm test` (~10 s: `build:test` compiles to `.tmp/test-build/`, then `node --test`) · one file
  `npm run build:test && node --test test/unit/<name>.test.js` · coverage `npm run test:coverage`
- Lint `npm run eslint` · `npm run lint` (pbiviz lint) · Versions agree `npm run check:version`
- Fixture schema `npm run validate:fixtures` (needs `pwsh`) · Package `npm run package` → `dist/*.pbiviz`
- Dev server `pbiviz start` → https://localhost:8080, loaded by the Power BI Service Developer Visual
  (the owner signs in); trust the cert once with `pbiviz install-cert`.

## Git workflow  (non-negotiable — commands: `.claude/skills/git-workflow`)
- **Never commit or push to `main`.** Branch `feat/` `fix/` `chore/` `docs/<slug>` off FRESH
  `origin/main`; rebase on it again before the PR and resolve conflicts locally. Parallel agents: one
  worktree each, never two agents in one working directory.
- Conventional Commits; stage by path — **never `git add -A` / `git add .`**.
- PR: `gh pr create --base main --title "<conventional title>" --body-file <file>`; the body carries
  `Closes #N` (`--fill` cannot). Ruleset "Protect main": squash only, required check `test`, no
  force-push, no deletion.
- **Squash-merge only.** The agent squash-merges a PR once its review is approved and CI is green.
  Release tags, GitHub Releases and any publish need the owner's explicit word. Never force-push a
  shared branch; `--force-with-lease` only on your own feature branch.

## Pre-PR gate  (all CI-blocking — the `test` job in `.github/workflows/ci.yml`; never open or merge red)
`npm ci` → `npm run check:version` → `npm test` → `npm run eslint` → `npm run validate:fixtures` →
`npm audit --audit-level=moderate` → `npm run package`. No suite lock: any agent may run the full gate.

| Diff touches | Also check |
|---|---|
| `capabilities.json` / `src/settings.ts` | `docs/VISUAL_CONTRACT.md` + `docs/SPEC.md` updated in the same PR; the `capabilitiesContract` test passes |
| `package.json` / lockfile | `npm audit --audit-level=moderate` clean |
| `.github/workflows/**` | ask first |

## Boundaries
**Always:**
- Non-trivial work starts with `.claude/skills/plan-epic`'s classification. Architectural work (a new
  subsystem, a host-contract change, more than one PR) gets owner-reviewed specs and a plan in
  `docs/specs/` before any code; a bounded change gets an owner-approved design in chat.
- Tests for every changed behaviour (`node:test` + jsdom; host double `test/helpers/mockHost.js`).
- A PR that changes behaviour updates the doc that describes it (`docs/SPEC.md`, `docs/ARCHITECTURE.md`,
  `docs/VISUAL_CONTRACT.md`, `docs/TESTING.md`) in the SAME PR — never a follow-up.
**Ask first (stop and get owner approval):**
- New dependencies · anything touching auth, secrets or env · file deletion · CI/workflow changes.
  Schema migrations: n/a (no database).
**Never:**
- Commit secrets or any `.env*`. Hand-edit generated files (`assets/icon.png` comes from
  `node scripts/gen-icon.js`).
- Put anything but `[]` in `capabilities.json` `privileges`, or add network, storage or export
  behaviour.
- Use `innerHTML` / `outerHTML` / `insertAdjacentHTML`: build DOM with `createElement` / `textContent`.
- Change `pbiviz.json` `guid`, or rename, remove or retype a data role: an admin upload reaches every
  report at once (`docs/MAINTENANCE.md`).
- Push a release tag, create a GitHub Release or publish without the owner's explicit word.

## Permissions & autonomy
- Claude Code enforces the lists above in `.claude/settings.json` and `.claude/hooks/git-guard.mjs`
  (logic `scripts/git-guard.lib.mjs`, contract `test/unit/gitGuard.test.js`); those files are the
  source of truth, not prose.
- Full permission-skip ONLY inside a sandboxed worktree or container with no publish credentials.

## Project structure
- `src/visual.ts` IVisual entry (host services, selection, keyboard, tooltip) · `src/settings.ts`
  formatting model · `src/data/` parseDataView, keys, normalizeStatus · `src/domain/` statusMeta,
  settingsGuards, wingSideAssignment · `src/geometry/` · `src/rendering/` · `src/audio/`
- `capabilities.json` host contract · `pbiviz.json` identity and version · `style/visual.less`
- `test/unit/*.test.js` (CommonJS over `.tmp/test-build/src/...`) · `test/fixtures/` · `scripts/`
- Releases: tag `vX.Y.Z.0` → the CI `release` job publishes the tested `.pbiviz` as a GitHub Release
  (`docs/MAINTENANCE.md`).

## Code style  (deltas from language defaults only)
- TypeScript strict; no `any`. A DataView becomes a typed model in `src/data/` before rendering;
  renderers never read raw host objects.
- **Comments state a constraint or a non-obvious *why* the code cannot express — nothing else.**
  Never narrate what the next line visibly does, restate a name in prose, or record change history
  ("was X, now Y", "previously", "replaces PR #N"). Never cite an issue/PR number as the reason
  something is true — state the rule on its own merits; git blame is the provenance trail.
- LF line endings. Commit trailer: your tool's default `Co-Authored-By`.

## graphify
- When `graphify-out/graph.json` exists, orient with `graphify query "<question>" --graph
  graphify-out/graph.json` (or `path` / `explain`) before grepping raw files.
- After changing code run `graphify update .`; `graphify-out/` is gitignored. No CLI: say so.
