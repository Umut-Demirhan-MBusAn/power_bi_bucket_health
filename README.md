# Bucket Health for Power BI

An open-source (MIT) Power BI custom visual for real-time monitoring of mining excavator bucket GET (Ground Engaging Tools) component health. Each machine is rendered as a responsive schematic bucket with live status colours, alarm prioritisation, audio alerts, and rich tooltips.

Developed by **Umut Demirhan**. Not on AppSource: download the `.pbiviz` from
[GitHub Releases](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/releases). Versioning and releases:
[`docs/MAINTENANCE.md`](docs/MAINTENANCE.md).

![Bucket Health fleet view](photos_for_launch/multiple_machine_alarming.png)

▶ [Demo video: an alarm arriving](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/releases/download/v1.0.0.0/alarm_demo_video.mp4) (MP4, 15 MB)

---

## Features

- **Adaptive bucket geometry** — teeth, lip shrouds, and wing shrouds rendered from your actual component counts (4–20 teeth, 0–4 wings per side)
- **Status colour coding** — six component health states, each with a distinct colour and alarm/no-alarm behaviour (table under [Data schema](#data-schema))
- **Fleet grid** — up to 20 machines in a responsive flex grid; alarm machines sort to the front with a pulsing red border
- **Audio alert** — two-tone beep triggered on fresh alarm transitions (enabled by default; toggle in the Formatting pane), with auto-stop at 60 s. **Requires DirectQuery or Live Connection** — Import mode data is a static snapshot and does not push updates to the visual automatically, so audio alarms will not fire until a manual refresh.
- **Rich tooltips** — component, status, machine, machine type, last-seen time, and any extra tooltip columns from your data; they close when the pointer leaves the component or rests on it for 8 s
- **Cross-filter & selection** — click a component to cross-filter other visuals on the report page; Ctrl+click selects several
- **Context menu** — right-click a component for Power BI's standard drill/filter context menu
- **Keyboard navigation** — Arrow keys move focus between components; Enter/Space selects
- **High-contrast mode** — automatically adapts fills, strokes, and outlines when Power BI's high-contrast theme is active
- **Accessible alarm motion** — choose *Always flash* / *Auto* (respects OS reduced-motion) / *Never* (solid) in the Formatting pane

---

## Screenshots

| Single machine (OK) | Fleet — no alarm | Fleet — alarm active |
|---|---|---|
| ![Single machine OK](photos_for_launch/on_machine_with_ok_status.png) | ![Fleet no alarm](photos_for_launch/no_alarm.png) | ![Fleet alarm](photos_for_launch/fleet_with_one_machine_alarming.png) |

| Component tooltip | Cross-filter selection | Edge state + formatting setup |
|---|---|---|
| ![Tooltip](photos_for_launch/tooltips.png) | ![Cross-filter](photos_for_launch/select_component_to_cross_filter.png) | ![Setup](photos_for_launch/no_machines_to_show_and_format_visual_setup.png) |

| Proximity alarm on one tooth | Movement and proximity alarms, mixed statuses | Fleet with a no-data machine and a lockout tooth |
|---|---|---|
| ![Proximity alarm](photos_for_launch/prox_alarm.png) | ![Movement and proximity alarms](photos_for_launch/one_alarming_machine.png) | ![No-data machine and lockout tooth](photos_for_launch/fleet_with_offline_machine_and_lockout_comp.png) |

| No data, single machine | No data, compact card |
|---|---|
| ![No data, single machine](photos_for_launch/one_offline_machine.png) | ![No data, compact card](photos_for_launch/no_data_one_machine.png) |

---

## Quick start

Download the `.pbiviz` file from the latest [release](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/releases), then in
Power BI choose **Visualizations → … → Import a visual from a file**. If your Power BI admin has
added it as an organizational visual, use **More visuals → My organization** instead. Then bind
the required fields (see below).

A sample `.pbix` demo report is included at [`example_bucket_health_dashboard.pbix`](example_bucket_health_dashboard.pbix).

> **Import mode and audio alarms:** The example dashboard uses Import mode, which loads a static snapshot of the data. Audio alarms fire when the visual receives a live data update — this happens automatically with **DirectQuery** or **Live Connection** but only on manual refresh with Import mode. For real-time alarm monitoring in production, connect your report with DirectQuery or a live/streaming dataset.

---

## Data schema

Each row must represent **one component on one machine**. Bind these roles in the Fields pane:

| Role | Required | Description | Example values |
|---|---|---|---|
| **Machine** | ✓ | The machine's name and its unique identifier. Every row must belong to a machine. Each unique value becomes one card in the fleet view and is shown as the card header. | `EX-204`, `CAT-01` |
| Machine Type | — | Human-readable label for the machine class or model. Shown in the card header below the machine name. If omitted, only the machine name is shown. | `Hydraulic Excavator` |
| **Component** | ✓ | The component's name, unique within its machine. Identifies a single tooth, lip shroud, or wing shroud on that machine. Used for rendering, tooltips, selection, and alarm detection. | `T1`, `L3`, `W2R` |
| **Category** | ✓ | The component type. Determines where on the bucket schematic the component is drawn. Matched ignoring case, spaces, underscores and hyphens (`Lip Shroud`, `teeth` work). | `tooth`, `lipShroud`, `wingShroud` |
| **Order** | ✓ | Integer position of the component within its category (1 = leftmost for teeth and lip shrouds). For wing shrouds, left/right side is inferred from this value by the **Wing side assignment** Formatting pane setting — there is no left/right column in the data. | `1`, `2`, `3`, … |
| **Component Status** | ✓ | The current health status of this component. Matched case-insensitively against the accepted status strings (see table below). Non-alarm statuses leave the Alarm Time cell blank. | `OK`, `No Data (1h)`, `Lockout`, `Lockout + No Data`, `Proximity Alarm`, `Movement Alarm` |
| Comp. Alarm Time | Recommended | Timestamp when this component entered its current alarm state. The visual builds an alarm identity from machine + component + alarm time; audio fires exactly once per unique identity. **If left unbound the visual still renders, but a component that clears and then re-alarms in the same session won't beep the second time** (see [Alarm audio logic](docs/DATA_SCHEMA.md#alarm-audio-logic)). Leave the cell blank (null) for non-alarm rows. | `2026-06-22T08:14:00Z` |
| Last Seen | — | Timestamp of the last data receipt for this component. Shown in the component tooltip. | `2026-06-22T08:14:00Z` |
| Tooltip Fields | — | Any additional columns to include in the component tooltip. You can bind multiple columns here. They appear after the standard fields. | Tag IDs, sensor readings, … |

### Status values

Statuses as the visual displays them. Matching is case-insensitive and also accepts short forms
such as `No Data`, `prox` or `movement`:

| Status | Colour | Alarm audio |
|---|---|---|
| `OK` | Green | No |
| `No Data (1h)` | Yellow | No |
| `Lockout` | Blue | No |
| `Lockout + No Data` | Dark blue | No |
| `Proximity Alarm` | Flashing red | Yes — on transition |
| `Movement Alarm` | Flashing dark red | Yes — on transition |

### Component counts & layout

Each machine's bucket geometry adapts to the rows you supply: **4–20 teeth**, **lip shrouds = teeth − 1**, and **0–4 wing shrouds per side** (0–8 total). Wing shrouds have no left/right column — the side is derived from **Order** via the **Wing side assignment** setting. A machine outside these counts still renders — as its own invalid card listing the problem — without affecting any other machine.

See **[`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md)** for the full schema: exact count rules, all four wing-assignment modes, accepted status spellings, and the alarm-audio logic.

---

## Formatting pane

| Card | Setting | Description |
|---|---|---|
| Layout | Minimum card width (px) | Cards never shrink below this width; scrollbars appear instead. Default 220 px. |
| Ordering | Wing side assignment | How wing shroud order values map to left/right sides. Four modes covering odd/even and first/second-half splits. |
| Ordering | Teeth & lip order | Render teeth and lip shrouds left-to-right (default) or right-to-left. |
| Alarm | Enable audio alarm | Toggle the two-tone beep triggered on alarm transitions. |
| Alarm | Alarm motion | *Always flash* (default) · *Auto* (respects OS reduced-motion) · *Never* (solid). |

---

## Support

Bugs and feature requests → [GitHub Issues](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/issues). Security vulnerabilities →
[`SECURITY.md`](SECURITY.md) (private report, not a public issue). Developer/maintainer:
**Umut Demirhan**.

---

## Development

Requires Node.js ≥ 22.13 (see `.nvmrc`) and the `pbiviz` CLI:
`npm install -g powerbi-visuals-tools@7.1.0` (kept global, not a devDependency — its dependency
tree fails `npm audit`).

```bash
# Install dependencies
npm install

# Start local developer visual (Power BI Developer Visual)
npm run start

# Run unit tests (add coverage with npm run test:coverage)
npm test

# Lint
npm run eslint       # ESLint with the powerbi-visuals config
npm run lint         # pbiviz lint

# Package for distribution
npm run package      # produces dist/*.pbiviz

# QA against live SQL Server data (docs/QA_TEST_CASES.md)
sqlcmd -S localhost -E -C -i qa/bucket_health_qa.sql
node qa/test-page/server.cjs   # http://127.0.0.1:8766/
```

### Repository structure

```
src/           TypeScript source
  audio/       AlarmAudio + AlarmController
  data/        DataView parser + type definitions
  domain/      Status model, colour mapping, wing-side assignment
  geometry/    Parametric bucket SVG geometry engine
  rendering/   Fleet, card, bucket SVG, and edge-state renderers
  settings.ts  Formatting pane model
  visual.ts    IVisual host contract entry point
style/         LESS stylesheet
test/unit/     Node.js unit tests (built-in runner; jsdom for rendering tests)
docs/          Product spec, architecture, visual contract, data schema, testing, QA test cases, maintenance
qa/            QA sample data (SQL Server), showcase script, local test page
scripts/       check-version.js, gen-icon.js (regenerates assets/icon.png), git-guard.lib.mjs, validate-mock-data.ps1
assets/        icon.png (generated — run `node scripts/gen-icon.js`, don't hand-edit),
               icon.svg (hand-maintained vector, not an input to the script)
```

Versioning, releases, and deployment: [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md).

## License

[MIT](LICENSE) © Umut Demirhan. Version history is in the [CHANGELOG](CHANGELOG.md).
