# Maintenance

Internal visual — not on AppSource, no certification.

**Developer / maintainer: Umut Demirhan** (demirhan.info@gmail.com)

## Distribution

- Deploy as an **organizational visual**: Power BI Admin portal → Organizational visuals →
  upload the `.pbiviz`. Report authors add it from **Insert → More visuals → My organization**.
- Updates are centralized: when the admin uploads a new version, every report using the visual —
  including reports rendered through Power BI Embedded — gets it automatically.
- Do **not** distribute by per-report file import ("Import a visual from a file"): those copies
  never update.

## Update rules

An admin update goes live in every report immediately, org-wide — no staged rollout, no rollback
beyond re-uploading the previous build. Therefore:

- Never change `guid` in `pbiviz.json` — Power BI would treat it as a different visual and break
  every report.
- Never rename, remove, or retype `capabilities.json` data roles — that breaks existing bindings
  everywhere at once.
- Test the new build in a non-production report before the admin updates the store.

## Versioning

`pbiviz.json` `version` is four-part `MAJOR.MINOR.PATCH.0`. Tag releases `vMAJOR.MINOR.PATCH.0`.

| Bump | When |
| --- | --- |
| MAJOR | capabilities or behavior change that requires report authors to act |
| MINOR | new feature or setting, non-breaking |
| PATCH | bug fix or polish |

## Release

1. Bump `pbiviz.json` (both `version` and `visual.version`), `package.json` `version`
   (first three parts, no trailing `.0`), and add a `CHANGELOG.md` entry.
2. `npm run check:version` — verifies the three files agree before you open the PR.
3. PR → merge.
4. `git tag vX.Y.Z.0 && git push origin vX.Y.Z.0`.
5. CI's `release` job runs automatically on the tag: it re-verifies the version against the
   tag, downloads the `.pbiviz` built and tested by the `test` job, and creates a GitHub
   Release (`vX.Y.Z.0`) with that file attached and the CHANGELOG section as release notes.
6. Tenant admin uploads the release asset: Admin portal → Organizational visuals →
   Bucket Health → Settings → Update. Manual step — there is no API for it.
7. Verify in a non-production report and inside the embedded product (re-check the audio-arming
   click in the host page).

### Azure Artifacts publish (optional)

The `release` job also publishes the `.pbiviz` to Azure Artifacts (Universal Packages,
versioned `X.Y.Z`), but only when `vars.AZURE_DEVOPS_ORG` is set — the GitHub Release step
always runs regardless. One-time setup:

| Item | Where |
| --- | --- |
| Universal Packages feed | Azure DevOps → Artifacts → Create feed |
| PAT scoped **Packaging: Read, write, & manage** | GitHub secret `AZURE_DEVOPS_PAT` |
| Org / project / feed name | GitHub repo variables `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_ARTIFACTS_FEED` |

Rotate `AZURE_DEVOPS_PAT` before it expires — an expired PAT only fails the Azure Artifacts
publish step; the GitHub Release still succeeds.

## Pre-release checks

```bash
npm ci && npm run check:version && npm test && npm run eslint && npm run lint && npm run package
pbiviz package --certification-audit   # security lint (flags eval/innerHTML/fetch)
```

Manual checklist: [TESTING.md § Manual testing](TESTING.md#manual-testing).

## Support

Bugs and feature requests → Azure DevOps work items.
