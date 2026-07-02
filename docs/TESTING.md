# Testing

## Running tests

```bash
npm test
```

This compiles the TypeScript source to CommonJS (`tsconfig.test.json` → `.tmp/test-build/`) and
runs all test files with Node's built-in test runner:

```
npm run build:test && node --test test/unit/*.test.js
```

`npm run test:coverage` runs the same suite with Node's built-in coverage reporter
(`--experimental-test-coverage`).

**Current count: 99 tests, 0 failures.**

---

## Infrastructure

| Concern | Tool |
|---|---|
| Test runner | Node.js built-in (`node --test`, no external framework) |
| Language | Test files are plain `.js` (CommonJS); source is TypeScript compiled before each run |
| DOM environment | [`jsdom`](https://github.com/jsdom/jsdom) — patches `globalThis.document` and `globalThis.DOMParser` for rendering tests only |
| Assertions | `node:assert/strict` |
| Fixtures | `test/fixtures/bucket_health_components.csv` — canonical mock data used by `parseDataView` tests |

No test framework (Jest, Vitest, Mocha, etc.) is used. The Node built-in runner keeps the
dependency surface minimal and matches the project's certification constraints.

---

## Test files

### Pure-logic tests (no DOM)

These tests import compiled source directly and have no setup beyond `require`.

| File | Module under test | What is covered |
|---|---|---|
| `normalizeStatus.test.js` | `src/data/normalizeStatus` | Source strings → canonical status keys; case/whitespace tolerance; rejection of unknown values |
| `parseDataView.test.js` | `src/data/parseDataView` | DataView → `MachineBucketModel`; missing roles; CSV fixture round-trip; wing-side modes; component-order direction; alarm sorting; error cases |
| `keys.test.js` | `src/data/keys` | `COMPOSITE_KEY_SEPARATOR` value; `buildCompositeKey` with 1, 2, 3 parts and empty-string parts |
| `normalizeStatus.test.js` | `src/data/normalizeStatus` | `isAlarmStatus` only treats prox/move as alarms |
| `bucketGeometry.test.js` | `src/geometry/bucketGeometry` | Handoff constants; min/max viewBox dimensions; fixed component sizes; asymmetric wing counts; wing ordering; dominant alarm label |
| `statusMeta.test.js` | `src/domain/statusMeta` | `machineStatusKey` — alarm priority, all-nodata, ok paths |
| `settingsGuards.test.js` | `src/domain/settingsGuards` | `asWingSideAssignment`, `asComponentOrderDirection`, `asAlarmMotion` — valid values pass through; unknown values return defaults |
| `wingSideAssignment.test.js` | `src/domain/wingSideAssignment` | All four assignment modes; order-sort before assignment |
| `alarmController.test.js` | `src/audio/alarmController` | Alarm-id dedup: seeds on first render without firing; same id never re-fires; new alarm time fires again; dismissed alarm does not re-fire; `audioEnabled: false` suppresses all |
| `alarmAudio.test.js` | `src/audio/alarmAudio` | Gesture arm/resume; two-tone oscillator scheduling; idempotent `start()`; `dismiss()` and `destroy()` close the context |

### DOM tests (jsdom)

Each of these files sets `globalThis.document` (and `globalThis.DOMParser` where needed) from a
jsdom instance at the top of the file, before any rendering module is imported. No source code
changes were needed — the rendering modules call the global `document` directly.

| File | Module under test | What is covered |
|---|---|---|
| `renderEdgeStates.test.js` | `src/rendering/renderEdgeStates` | All 5 non-ready states (`noFields`, `loading`, `invalidConfig`, `noData`, `error`); missing-role display-name mapping; unknown-role raw-string fallback; `invalidConfig` with empty roles, detail-only, and neither; error code `ERR ·` prefix; error-without-detail path; alarm-time tip; field-list item count |
| `renderMachineCard.test.js` | `src/rendering/renderMachineCard` | OK / alarm / no-data card classes and badges; alarm banner move-only, prox-only, and both; `Lip` and `Wing` component label prefixes; tooth/lip/wing meta text counts; no-data `aria-label` (`"No Data (1h)"`); min-width style; high-contrast foreground vs foregroundSelected border color (exact `rgb()` values) |
| `renderFleet.test.js` | `src/rendering/renderFleet` | Truncation banner present/absent; single-machine `--single` grid modifier; multi-machine plain grid class; card count; empty machines array |
| `renderBucketSvg.test.js` | `src/rendering/renderBucketSvg` | SVG root viewBox/role/aria-label; per-status component fills; component data attributes and keyboard/a11y attributes; center alarm shown for alarm machines and hidden otherwise; high-contrast fills/strokes for decorative shell and components (alarm vs non-alarm stroke); gradient ids sanitized from the machine key |

---

## Fixtures

`test/fixtures/bucket_health_components.csv` is the canonical mock dataset. It contains 4
machines with a realistic mix of component types and statuses, including alarm states. The
`parseDataView` tests use it as a round-trip integration fixture.

The fixture can be schema-validated with `scripts/validate-mock-data.ps1` (PowerShell; its default
`-Path` is the fixture — also exposed as `npm run validate:fixtures`). It enforces the exact
expected column set: `machine_key`, `machine_name`, `machine_type`, `component_key`,
`component_name`, `component_category`, `component_order`, `status`, `last_seen_utc`, `tag_id`,
`alarm_time` — and errors on missing or unexpected columns.

---

## What is not unit-tested

| Module | Reason |
|---|---|
| `src/visual.ts` | Power BI host entry point — tightly coupled to the `IVisual` host interface; no practical way to unit-test without a full PBI host |
| `src/settings.ts` | Purely declarative Power BI formatting-model configuration; no logic to exercise |

---

## Manual testing

Unit tests verify logic and DOM structure. These behaviors require manual verification in Power BI
Desktop using `pbiviz start` (Developer Visual mode).

Setup notes for `pbiviz start`:

- Developer mode must be enabled first. In Power BI Desktop it must be re-enabled for each session
  where the local Developer Visual is used; in the Power BI service the custom-visual developer
  mode setting must be enabled before the Developer Visual appears.
- pbiviz serves the Developer Visual over a self-signed localhost certificate. If Power BI shows a
  localhost connection error, open `https://localhost:8080/assets` in the same browser and
  accept/trust the certificate (on Windows the cert can be trusted in `Cert:\CurrentUser\Root`).

Behaviors to verify manually:

- Audio alarm arm, fire, and auto-stop at 60 s
- Alarm dismissal and re-alarm within a session
- Cross-filter selection and context menu
- Tooltip content and positioning
- Resize / responsive layout behavior
- High-contrast theme rendering
- Alarm motion setting (Always / Auto / Never)

See [`docs/SPEC.md`](SPEC.md) for the full acceptance criteria.
