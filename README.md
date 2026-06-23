# Bucket Health for Power BI

A Power BI custom visual for real-time monitoring of mining excavator bucket GET (Ground Engaging Tools) component health. Each machine is rendered as a responsive schematic bucket with live status colours, alarm prioritisation, audio alerts, and rich tooltips.

![Bucket Health fleet view](photos_for_launch/eight_machines.png)

---

## Features

- **Adaptive bucket geometry** — teeth, lip shrouds, and wing shrouds rendered from your actual component counts (4–20 teeth, 0–4 wings per side)
- **Status colour coding** — OK (green), No Data (amber), Lockout (blue), Lockout + No Data (dark blue), Proximity Alarm (red), Movement Alarm (dark red)
- **Fleet grid** — up to 20 machines in a responsive flex grid; alarm machines sort to the front with a pulsing red border
- **Audio alert** — opt-in two-tone beep triggered on fresh alarm transitions, with auto-stop at 60 s
- **Rich tooltips** — component name, status, machine, last-seen time, and any extra tooltip columns from your data
- **Cross-filter & selection** — click a component to cross-filter other visuals on the report page
- **Context menu** — right-click a component for Power BI's standard drill/filter context menu
- **Keyboard navigation** — Arrow keys move focus between components; Enter/Space selects
- **High-contrast mode** — automatically adapts fills, strokes, and outlines when Power BI's high-contrast theme is active
- **Accessible alarm motion** — choose *Always flash* / *Auto* (respects OS reduced-motion) / *Never* (solid) in the Formatting pane

---

## Screenshots

| Single machine | Fleet (no alarm) | Fleet (alarm active) |
|---|---|---|
| ![Single](photos_for_launch/no_data_one_machine.png) | ![Fleet](photos_for_launch/four_machines.png) | ![Alarm](photos_for_launch/prox_alarm.png) |

---

## Quick start

1. Download the latest `.pbiviz` from the [Releases](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/releases) page (or from AppSource once published).
2. In Power BI Desktop: **Insert → More visuals → Import a visual from a file** → select the `.pbiviz`.
3. Add the visual to your report page and bind the required fields (see below).

A sample `.pbix` demo report is included at [`bucket_health_example_dashboard.pbix`](bucket_health_example_dashboard.pbix).

---

## Data schema

Each row must represent **one component on one machine**. Bind these roles in the Fields pane:

| Role | Required | Description | Example values |
|---|---|---|---|
| **Machine** | ✓ | Unique excavator identifier | `EX-204`, `CAT-01` |
| **Component** | ✓ | Component key (unique per machine) | `T1`, `L3`, `W2R` |
| **Category** | ✓ | Component type | `tooth`, `lipShroud`, `wingShroud` |
| **Order** | ✓ | Integer position (left→right for teeth/lips; see Wing side assignment for wings) | `1`, `2`, … |
| **Status** | ✓ | Health status string | `OK`, `No Data`, `Lockout`, `Lockout + No Data`, `Proximity Alarm`, `Movement Alarm` |
| Machine Type | — | Human-readable machine label | `Hydraulic Excavator` |
| Last Seen | — | Timestamp of last data receipt | `2026-06-22T08:14:00Z` |
| Alarm Time | — | Timestamp when the alarm was raised (used for audio deduplication) | ISO 8601 string |
| Tooltip Fields | — | Any extra columns shown in the component tooltip (multi-column) | Tag IDs, sensor readings, … |

Full schema documentation: [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md)

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

## Support & links

- **Bugs / feature requests:** [GitHub Issues](https://github.com/Umut-Demirhan-MBusAn/power_bi_bucket_health/issues)
- **Support page:** [https://umut-demirhan-mbusan.github.io/power_bi_bucket_health/support.html](https://umut-demirhan-mbusan.github.io/power_bi_bucket_health/support.html)
- **Privacy policy:** [https://umut-demirhan-mbusan.github.io/power_bi_bucket_health/privacy-policy.html](https://umut-demirhan-mbusan.github.io/power_bi_bucket_health/privacy-policy.html)

---

## Development

```bash
# Install dependencies
npm install

# Start local developer visual (Power BI Developer Visual)
npm run start        # or: pbiviz start

# Run unit tests
npm test

# Lint
npm run eslint

# Package for distribution
npm run package      # produces dist/*.pbiviz
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
test/unit/     Node.js unit tests (no framework, no DOM)
docs/          Spec, architecture, visual contract, certification guide
assets/        icon.png
```

### Certification

This visual targets [Microsoft AppSource certification](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-certified). See [`docs/CERTIFICATION.md`](docs/CERTIFICATION.md) for the full submission checklist and status.
