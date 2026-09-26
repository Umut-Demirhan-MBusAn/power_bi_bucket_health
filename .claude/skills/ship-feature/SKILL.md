---
name: ship-feature
description: Use when making one bounded change in power_bi_bucket_health — a fix or a feature that fits one PR — from the owner's request to a merged PR.
---

# Ship a change (power_bi_bucket_health)

One change, one PR. An epic or a batch of issues is `implementation-pipeline`.

1. **Classify:** `plan-epic` §1. Spike: answer it, no branch. Architectural goes back to `plan-epic`.
   Bounded: a short design in chat, then stop until the owner says yes to it.
2. **Issue first.** The work has a GitHub issue (open one if not); the PR body carries `Closes #N`.
3. **Branch:** `git-workflow` §1–2 (a worktree off fresh `origin/main`, set up before the first
   commit).
4. **Build, tests first.** DataView → typed model in `src/data/` before rendering; DOM through
   `createElement` / `textContent`; `capabilities.json` `privileges` stays `[]`. Tests are
   `node:test` + jsdom with `test/helpers/mockHost.js`. A change to capabilities, data roles or
   formatting updates `docs/VISUAL_CONTRACT.md` and `docs/SPEC.md` in the same PR; any other
   behaviour change updates the doc that describes it.
5. **Review:** before the first push, one fresh `code-reviewer` pass (model `opus`) on
   `git diff origin/main...HEAD`, briefed with the issue's acceptance criteria and the design. Fix
   its must-fix findings, re-run the checks those fixes touch, and resume the same reviewer to
   verify them. There is no fresh second pass.
6. **Finish:** `pr-finish` — gate, push, PR, green CI, squash-merge once the review is approved.

Host behaviour the unit tests cannot reach (audio arming, selection, tooltips, resize, high
contrast) is checked in the Power BI Service Developer Visual (`docs/TESTING.md` "Manual testing");
the owner signs in and reports. A release is the owner's: tag, GitHub Release and the tenant upload
follow `docs/MAINTENANCE.md` only on the owner's word.
