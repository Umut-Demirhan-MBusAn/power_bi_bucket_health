# Maintenance

Bucket Health is an internal visual, not a commercial product: it is built for this organization,
distributed only within this organization, and not submitted to AppSource or Microsoft
certification. This file covers versioning, release, and distribution — how a change in this repo
reaches a report someone in the org is actually looking at.

## Distribution model

The visual is deployed as an **organizational visual** (Power BI/Fabric Admin portal →
Organizational visuals), not handed out as a loose `.pbiviz` file for report authors to import one
by one. This matters because of how updates propagate:

- **Organizational visuals are a tenant-level store.** A report author adds the visual to a report
  once, from the "My organization" tab in Desktop or Service. From then on, the report resolves the
  visual against the tenant's store at render time.
- **A version update is centralized.** When a tenant admin uploads a new `.pbiviz` version over the
  existing organizational visual (Settings → Update), every report using it gets the new version
  automatically — no report needs to be reopened, re-imported, or republished.
- **This includes reports rendered through Power BI Embedded** (the org's own product embeds Power
  BI content into itself). Embedded content is served by the same rendering surface as the regular
  Power BI service, just accessed with an embed token instead of a normal sign-in — it resolves
  organizational visuals the same way. (Microsoft does not document an explicit Embedded carve-out
  for this; it follows from Embedded sharing the same render pipeline. Licensed/paid-visual
  enforcement is documented as unsupported in embedded scenarios, but that's irrelevant here since
  nothing is licensed or sold.)
- **A visual still has to be placed on a report at least once** before it can render anywhere,
  including Embedded — there's no way to inject it at render/embed time. Swapping to a
  *different* visual (a different GUID) is a manual per-report action; only in-place *version*
  updates of the *same* visual are centralized.

**Do not distribute this visual by direct `.pbiviz` file import into individual reports.** That
path has no update mechanism — every report would need manual re-import and republishing on every
release. Keep the organizational-visual path as the only distribution channel.

## The blast radius this creates

Because an admin's "Update" click pushes the new version to every report using the visual
**immediately and without per-report review**, this visual has a bigger blast radius than a normal
app release: there's no staged rollout, no per-team opt-in, and no Microsoft certification review
gate in between. A breaking change ships to everyone in the org the moment it's uploaded.

**Before uploading a new version to the organizational visual store:**

- Never change `capabilities.json` data roles (add, remove, rename, or retype) without confirming
  every existing report still binds correctly — a role rename breaks every report using the old
  binding, all at once, org-wide.
- Never change the `guid` in `pbiviz.json`. It is the visual's identity; changing it makes Power BI
  treat it as an unrelated new visual, silently breaking every report that references the old one.
- Coordinate visually/behaviorally significant changes (new alarm behavior, layout changes, color
  changes) with the product team ahead of the upload — they'll ship to every live report the moment
  the admin clicks Update, with no warning to report viewers.
- Test in a non-production report/workspace connected to the *same* organizational visual before
  the admin updates it tenant-wide — there is no automatic rollback; reverting means re-uploading
  the previous `.pbiviz` build.

## Versioning

`pbiviz.json`'s `version` field is a mandatory four-part `MAJOR.MINOR.PATCH.0` (Power BI requires
four digits; the trailing segment is unused — always `0`). `guid` never changes.

| Segment | Bump when |
| --- | --- |
| MAJOR | A capabilities.json role changes, or behavior changes enough that report authors need to reconfigure or re-verify their reports |
| MINOR | New formatting-pane setting, new non-breaking feature |
| PATCH | Bug fix, visual polish, no behavior change for existing reports |

Tag the release commit `vMAJOR.MINOR.PATCH.0` to match `pbiviz.json` exactly (e.g. `v1.1.0.0`) —
this is the single source of truth the release pipeline reads from. Add a `CHANGELOG.md` entry in
the same PR that bumps the version.

## Release process

1. Bump `version` in `pbiviz.json` and add a `CHANGELOG.md` entry in the PR that ships the change.
2. After merge to `main`, tag the merge commit: `git tag vX.Y.Z.0 && git push origin vX.Y.Z.0`.
3. The tag push triggers the `release` job in `.github/workflows/ci.yml`, which builds the
   `.pbiviz` and publishes it to the Azure Artifacts Universal Packages feed configured in the repo
   secrets (see below).
4. A tenant admin downloads the artifact from Azure Artifacts and uploads it in the Power BI Admin
   portal → Organizational visuals → (Bucket Health) → Settings → Update. **This step is manual** —
   there is no Microsoft API to push directly into the organizational visual store from CI.
5. Confirm rendering in a non-production report before wider awareness, per the blast-radius notes
   above.

### One-time Azure DevOps setup (needed before the release job can succeed)

The release job needs these repository secrets/variables, none of which this repo can create on
its own — someone with Azure DevOps admin access needs to set them up once:

- An Azure Artifacts **Universal Packages feed** (Azure DevOps → Artifacts → Create feed).
- A PAT scoped to **Packaging: Read, write, & manage**, stored as the `AZURE_DEVOPS_PAT` GitHub
  Actions secret.
- Repo variables: `AZURE_DEVOPS_ORG` (e.g. `https://dev.azure.com/<org>`), `AZURE_DEVOPS_PROJECT`,
  `AZURE_ARTIFACTS_FEED`.

Until these are configured, the `build`/`test`/`lint`/`package` job on every push still runs and
gates merges as usual — only the tag-triggered `release` job needs the Azure DevOps secrets, and it
only runs on a version tag push, so its absence doesn't block normal development.

## Pre-release validation

Run before every tag:

```bash
npm ci
npm test              # 99 unit tests
npm run eslint
npm run lint           # pbiviz lint
npm run package         # produces dist/*.pbiviz
pbiviz package --certification-audit   # not for AppSource — a useful security lint (flags eval/innerHTML/fetch/XHR) even for internal-only visuals
```

All of these run in CI on every push; the `release` job additionally requires them to pass before
publishing.

## Manual verification

Beyond the automated suite (see [TESTING.md](TESTING.md)), verify manually before each release:

- The standard Developer Visual checklist in [TESTING.md § Manual testing](TESTING.md#manual-testing).
- **Smoke-test inside the org's actual embedded product**, not just Power BI Desktop/Service
  directly — iframe hosting and user-gesture/autoplay policy can behave subtly differently inside a
  third-party host page than inside `app.powerbi.com`. In particular, re-verify the audio-arming
  click still works on first load in the embedded context.

## Ownership & support

This visual is maintained by its original author for the organization's internal use. Report bugs
and feature requests as work items in Azure DevOps (where all other project work is tracked) rather
than GitHub issues. There is no external support commitment, SLA, or public-facing documentation —
this file and [TESTING.md](TESTING.md) are the operational reference.
