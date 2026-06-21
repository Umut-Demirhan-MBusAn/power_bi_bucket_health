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
npm run lint
npm run eslint
npx tsc --noEmit
npm run package
```

## Unit Test Plan

Add the narrowest useful automated tests around pure modules first:

- `data/normalizeStatus`: source strings map to canonical keys.
- `data/parseDataView`: table rows normalize to `ComponentRecord` values.
- `domain/components`: lip shroud rows are required and equal tooth count minus one.
- `domain/wingSideAssignment`: wing side is derived from order and the selected visual setting.
- `domain/alarms`: alarm transitions fire only on non-alarm to alarm changes.
- `domain/sorting`: alarm-first fleet order is deterministic.
- `layout/fleetGrid`: 1, 2, 3-6, 7-12, and 13-20 machine column rules.
- `geometry/bucketGeometry`: min/max teeth and wing counts produce non-overlapping geometry.
- `rendering/renderStates`: no-fields, loading, invalid-config, no-data, and error states suppress audio.

Manual validation remains required for Developer Visual behavior in Power BI Desktop/service,
especially audio arming, alarm dismissal, resize behavior, and tooltip wiring.
