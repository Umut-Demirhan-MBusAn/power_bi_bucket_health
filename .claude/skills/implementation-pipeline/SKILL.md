---
name: implementation-pipeline
description: Use when asked to implement an epic, an execution plan's slices, or a batch of issues end-to-end, mostly autonomously, with sub-agents doing the implementation and review — not for a single scoped change.
---

# Implementation pipeline

The interactive session orchestrates; agents implement and review; GitHub holds the state; the owner
is interrupted only at the gates below. AGENTS.md is law throughout.

**Violating the letter of a gate is violating its spirit.** A gate here protects the host contract,
the owner's release authority, or another lane's work; none of them is a formality to reinterpret.

## Roles — every agent call names its model

| Role | Who | Model · effort |
|---|---|---|
| Orchestrator: plan, gates, push, PR, merge, status | this session | — |
| Readiness check per slice | `issue-verifier` agent | `sonnet` |
| Implementation + its tests | `implementer` agent | `opus` · high (`sonnet` only when the owner names it for the run) |
| Per-slice review, per-piece review | `code-reviewer` agent | `opus` · high |
| Second-opinion review | `adversarial-review` workflow | **owner-triggered only** — never a pipeline step |

`opus` resolves to the latest Opus. Never raise effort above high for a pipeline agent.

## Kickoff (once per run)

1. Read the execution plan (or the issue set). Turn its slice table into a dependency graph and
   lanes.
2. **Pre-flight scan**, before the first dispatch. List every pair of slices that touch one file,
   function, type, setting or data role — from the plan's Interfaces table, each slice's scope, and
   a `git grep` for every function or setting a slice names. One row per pair:

   | Slices | Shared | Contract | Finding | Ruling |
   | --- | --- | --- | --- | --- |

   Copy the plan's own rulings (`plan-epic` §5 asks it which slice rebases) and rule every pair it
   left open before any dispatch; the later slice's brief carries the ruling. A finding that changes
   the spec goes to the owner in one message and holds only the slices in its row. The table goes
   in the status comment.
3. **Merge authority** is standing for this repo (AGENTS.md "Git workflow"): each slice PR is
   squash-merged by the orchestrator once its review is approved and CI is green. A release tag, a
   GitHub Release or any publish still needs the owner's explicit word; no pipeline step makes one.
4. Post the **status comment** on the epic: a table `slice · issue · state · PR · note`, the
   pre-flight table, `Rulings:` and `Blocked on owner:`; each slice's note carries its implementer's
   and reviewer's agent ids. Keep its body in a scratchpad file (a `C:/…` path: `gh` does not
   translate `/c/…` after `@`) and edit this one comment in place on every state change
   (`gh api -X PATCH repos/{owner}/{repo}/issues/comments/<id> -F body=@<file>`). It is how any
   session resumes the run: first `gh api repos/{owner}/{repo}/issues/comments/<id> --jq .body >
   <file>`, then reconcile with `gh pr list` and `git worktree list`.

## Rulings

Every judgement you make alone — a pre-flight ruling, a scope call, a finding you waive, a default
taken on the owner's "your call" — is one line under `Rulings:` in the status comment, written when
you make it, and repeated in the final message: `Ruling: <what> — <why> — <cost if wrong>`.

## Modes

- **Slice train (default for a planned epic):** one branch and one PR to main per slice, in
  dependency order, independent lanes in parallel. Every slice gets real CI and its own review.
- **Batch (a few small cohesive issues, or when the owner asks):** one branch, per-issue
  implementers and reviews on it, one PR. Same gates.

## Per-slice loop

A slice is **ready** when every dependency's PR is merged, no other in-flight slice holds its
single-writer files (`capabilities.json` / `src/settings.ts`, `.github/workflows/*`), and
`issue-verifier` returns STILL-VALID. While any slice is ready, work on it; a blocked slice never
stalls another lane.

1. **Worktree** off fresh `origin/main`, set up before the first commit: `git-workflow` §1–2.
2. **Owner gate check.** An ask-first slice (new dependency, auth/secrets, `.github/workflows`, file
   deletion) without the owner's approval: post the exact ask on the issue, ping (below), mark it
   `waiting on owner`, and move to another lane.
3. **Implement** — background `implementer` agent. The brief is: worktree + branch + base SHA; the
   issue body verbatim; the spec sections it cites (paths + headings); a scope fence; the tests the
   issue names, to be written first; the pre-flight rulings that touch the slice; the report path
   inside its worktree.
4. **Gate** — the orchestrator, on the branch rebased onto fresh `origin/main`: `pr-finish` "Gate".
   An implementer's "green" is a claim; this gate is the evidence. Never rebase or edit a worktree
   while its gate runs.
5. **Review** — write the review package to a file, so the diff never enters your context:
   ```
   mkdir -p <scratchpad>/reviews
   git -C <worktree> log --oneline origin/main..HEAD   >  <scratchpad>/reviews/<slice>.diff
   git -C <worktree> diff --stat origin/main...HEAD   >> <scratchpad>/reviews/<slice>.diff
   git -C <worktree> diff -U10 origin/main...HEAD     >> <scratchpad>/reviews/<slice>.diff
   ```
   One `code-reviewer` per slice reads that file, briefed with the issue's acceptance criteria and
   the spec sections. Must-fixes, verbatim, with the branch's current HEAD sha:
   - **round 1** resumes the slice's implementer (`SendMessage` to its agent id, its context
     intact). If the id is not resumable, a fresh `implementer` gets the findings and the last
     report; it is still round 1;
   - **round 2** goes to a fresh `implementer`, with both rounds' findings;
   - after each, back to step 4, then resume the same reviewer with a new package to verify those
     must-fixes. A must-fix after round 2 parks the slice.
6. **Push + PR** — `git push --force-with-lease origin HEAD`, `gh pr create --base main` with
   `Closes #N` in the body, and watch CI as `pr-finish` step 6 says. Red → one CI fix round, its
   own budget, to the slice's implementer as in step 5; red twice → park.
7. **Merge** — review approved and CI green:
   `BUCKET_HEALTH_MERGE_OK=1 gh pr merge <n> --squash --delete-branch`.
8. **After every merge** — update the status comment; branches still in flight rebase onto the new
   `origin/main` before their next gate or push; remove the merged slice's worktree. A slice whose
   behaviour only the host shows goes on the owner's Developer Visual checklist in the final
   message.

**Parked** = the branch stays, the issue gets a comment with the blocker and the last findings, the
status comment says why, one ping. Never merge a parked slice, never start a third fix round.

## Per-piece review

A piece is a group the plan names (typically one spec each); a plan without groups is one piece.
When every slice of a piece has merged, one fresh `code-reviewer` reviews the piece as a whole: the
merged PRs (`gh pr diff <n>` each) against the piece's spec. Brief it ONLY on what per-slice reviews
cannot see: contracts between slices, coherence with the spec, and the host contract across
`capabilities.json`, `src/settings.ts` and the docs. Each must-fix becomes a new slice issue in the
train.

## Stops and pings

Ping = `PushNotification` with one line (slice, what is needed, where) plus the status comment's
`Blocked on owner` line. Ping for: an owner gate (step 2), a parked slice, a spec deviation the
implementer or reviewer found, a `NEEDS-DESIGN` verdict. Stop the run only when no slice is ready
and nothing is in flight. The final message lists every blocked slice and what unblocks it, the
Developer Visual checks the owner still owes, and every `Ruling:` line.

## Tools

Lanes run as background `Agent` calls; gates and CI watches as background Bash. The Workflow tool
is for two things only: an `issue-verifier` fan-out at kickoff, and the `adversarial-review` workflow
when the owner asks for it. After every agent batch, reconcile `gh pr list --state open` and
`git ls-remote --heads origin` against what you pushed.

## Red flags — stop

| Thought | Reality |
|---|---|
| "CI is green, so I can merge" | Green CI AND an approved review, both. |
| "The owner said build it, so I can tag a release" | Merge authority is not release authority. Tags and Releases wait for the owner's word. |
| "The implementer ran the gate, I can skip mine" | An implementer's green is a claim; the orchestrator's gate is the evidence. |
| "One more fix round will get it" | Two rounds, then park. |
| "The lane already serialises those two slices" | Serial is not compatible. A shared definition needs a ruling before the first dispatch. |
| "This epic is big, run adversarial-review at the end" | Per-piece `code-reviewer` is the pipeline's ceiling; adversarial-review is the owner's call. |
| "Slice X is blocked, so I'll wait" | Blocked slices park; ready slices in other lanes keep moving. |
