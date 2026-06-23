# Testing

Testing is split between current project validation commands and planned focused unit tests for pure
modules as implementation proceeds.

## Current Commands

Validate the mock CSV fixture:

```powershell
npm run validate:fixtures
```

Validate a different CSV with the same schema:

```powershell
pwsh -File scripts/validate-mock-data.ps1 -Path path\to\data.csv
```

## Pre-Scaffold Checks

- CSV headers match [DATA_SCHEMA.md](DATA_SCHEMA.md).
- Required fields are populated.
- Enum values are accepted and normalize to the visual status model.
- Component keys are stable and unique per machine.
- Machine counts and component counts stay inside supported visual limits.

Run Power BI visual checks:

```powershell
npm test
npm run lint
npm run eslint
npx tsc --noEmit
npm run package
```

## Unit Test Plan

Current unit coverage:

- `data/normalizeStatus`: source strings map to canonical keys.
- `data/parseDataView`: table rows normalize to `ComponentRecord` and `MachineBucketModel` values.
- `domain/components`: lip shroud rows are required and equal tooth count minus one.
- `domain/wingSideAssignment`: wing side is derived from order and the selected visual setting.
- `geometry/bucketGeometry`: handoff constants, min/max viewBox dimensions, fixed component sizes,
  asymmetric wings, and the dominant alarm label.
- `domain/statusMeta`: machine status (alarm / no-data / ok) derives the frame color.
- `audio/alarmController`: alarm-id dedup seeds on first render and never re-fires the same id.
- `audio/alarmAudio`: gesture arm/resume and two-tone scheduling using an injected audio context.

Planned coverage:

- `rendering/renderStates`: no-fields, loading, invalid-config, no-data, and error states suppress audio.
- Fleet layout: flex-wrap with uniform card height and width proportional to bucket aspect ratio
  (no fixed column rule; driven by inline styles/CSS and verified via the geometry aspect-ratio tests
  and manual Developer Visual checks).

Manual validation remains required for Developer Visual behavior in Power BI Desktop/service,
especially audio arming, alarm dismissal, resize behavior, and tooltip wiring.
