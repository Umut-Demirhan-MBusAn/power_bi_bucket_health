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

1. PR: bump `pbiviz.json` version + add a `CHANGELOG.md` entry.
2. After merge: `git tag vX.Y.Z.0 && git push origin vX.Y.Z.0`.
3. The CI `release` job builds the `.pbiviz` and publishes it to Azure Artifacts
   (Universal Packages, versioned `X.Y.Z`).
4. Tenant admin uploads it: Admin portal → Organizational visuals → Bucket Health → Settings →
   Update. Manual step — there is no API for it.
5. Verify in a non-production report and inside the embedded product (re-check the audio-arming
   click in the host page).

### One-time Azure DevOps setup (release job prerequisites)

- Universal Packages feed (Azure DevOps → Artifacts → Create feed).
- PAT scoped **Packaging: Read, write, & manage** → GitHub secret `AZURE_DEVOPS_PAT`.
- Repo variables: `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PROJECT`, `AZURE_ARTIFACTS_FEED`.

Until configured, only the tag-triggered `release` job fails; normal CI is unaffected.

## Pre-release checks

```bash
npm ci && npm test && npm run eslint && npm run lint && npm run package
pbiviz package --certification-audit   # security lint (flags eval/innerHTML/fetch)
```

Manual checklist: [TESTING.md § Manual testing](TESTING.md#manual-testing).

## Support

Bugs and feature requests → Azure DevOps work items.
