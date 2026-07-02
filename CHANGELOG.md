# Changelog

Versions follow Power BI's mandatory four-part `pbiviz.json` scheme (`MAJOR.MINOR.PATCH.0`). See
[`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) for what triggers each segment and the release
process.

## 1.0.0.0 — 2026-07-02

Initial release.

- Adaptive front-on bucket schematic: 4–20 teeth, lip shrouds = teeth − 1, up to 8 wing shrouds
  with configurable side assignment.
- Six-status colour model with alarm prioritisation (movement > proximity) and alarm-first fleet
  sorting.
- Fleet grid of uniform fixed-height, flex-wrapped cards sized by bucket aspect ratio.
- Dismissible two-tone audio alarm (880/660 Hz, 60 s auto-stop) fired once per alarm identity
  (machine + component + alarm time), armed by user gesture.
- Custom themed component tooltips, cross-filter selection, context menu, keyboard navigation,
  high-contrast support, and a tri-state Alarm motion accessibility setting.
- Five guided edge states (landing page, loading, invalid configuration, no data, error).
