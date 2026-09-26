# Changelog

Four-part `MAJOR.MINOR.PATCH.0` versions — bump rules and release process:
[`docs/MAINTENANCE.md`](docs/MAINTENANCE.md).

## 1.0.0.0 — 2026-09-26

First release.

- Adaptive front-on bucket schematic: 4–20 teeth, lip shrouds = teeth − 1, up to 4 wing shrouds
  per side with configurable side assignment.
- Six-status colour model with alarm prioritisation (movement > proximity) and alarm-first fleet
  sorting.
- Fleet grid of uniform fixed-height, flex-wrapped cards sized by bucket aspect ratio. Updates go
  card by card, so focus, open tooltips and alarm flashing survive resizes and data refreshes.
- A machine with bad rows or counts shows its own error card listing the issues by component name
  and the accepted values; the rest of the fleet renders normally. Row-limit and skipped-row warnings appear above the fleet.
- Two-tone audio alarm (880/660 Hz, 60 s auto-stop) fired once per alarm identity (machine +
  component + alarm time), armed by a click inside the visual. A click dismisses it; turning audio
  off or losing valid data stops it.
- Custom themed component tooltips, cross-filter selection, context menu, keyboard navigation,
  high-contrast support, and a tri-state Alarm motion accessibility setting.
- Five guided edge states (landing page, loading, invalid configuration, no data, error).
