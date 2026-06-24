# Research Notes

Use this file for researched facts, links, and comparisons that support decisions. Summarize findings
instead of pasting long source text.

## Power BI Custom Visual References

- Microsoft Learn: custom visual environment setup.
- Microsoft Learn: visual project structure.
- Microsoft Learn: capabilities and properties.
- Microsoft Learn: Power BI MCP server.
- npm package metadata for `powerbi-visuals-tools`.

## Design Handoff References

- `docs/design_handoff_bucket_health/README.md`: visual overview, views, design tokens, interactions.
- `docs/design_handoff_bucket_health/IMPLEMENTATION.md`: data roles, geometry math, status model,
  audio behavior, layout rules, and formatting settings.
- `docs/design_handoff_bucket_health/Bucket.dc.html`: single-machine detail reference.
- `docs/design_handoff_bucket_health/Fleet.dc.html`: fleet grid reference.
- `docs/design_handoff_bucket_health/States.dc.html`: edge-state reference.

## Key Technical Facts from Design Handoff

### Geometry Constants (SVG User Units)
- `SLOT = 66` (Tooth slot width)
- `TOOTH_W = 36` (Tooth width)
- `TOOTH_H = 62` (Tooth height)
- `LIP_W = 22` (Lip shroud width)
- `LIP_H = 24` (Lip shroud height)
- `WING_HL = 24` (Wing shroud horizontal length)
- `WING_IN = 11` (Wing shroud inner offset)
- `WING_OUT = 14` (Wing shroud outer offset)
- `WING_PITCH = 56` (Wing shroud vertical pitch)
- `MARGIN = 72` (Left/right margin)

### Status Hex Colors
- **OK**: `#34D399` (Green)
- **No Data Last Hour**: `#F4C04E` (Yellow)
- **Lockout**: `#5BA8F5` (Blue)
- **Lockout + No Data Last Hour**: `#3B5BD9` (Dark Blue)
- **Proximity Alarm**: `#FF5A5A` (Red)
- **Movement Alarm**: `#C42B4A` (Dark Red)

### Audio Parameters
- **Waveform**: Square wave
- **Two-tone pattern**: 880 Hz then 660 Hz
- **Tone duration**: 0.24 seconds each
- **Repeat interval**: 1.5 seconds
- **Auto-stop duration**: 120 seconds *(handoff value; the shipped visual auto-stops at 60 s — see [SPEC.md](SPEC.md))*

### Fleet Grid Column Rules *(superseded)*
The handoff originally specified fixed column counts (1→1, 2→2, 3–6→3, 7–12→4, 13–20→5). The shipped
visual replaced this with a flex-wrap proportional layout where each card's width tracks its bucket
aspect ratio and there is no fixed column-count rule — see
[DECISIONS.md (2026-06-23, flex-wrap proportional layout)](DECISIONS.md).

### Animation Timings *(handoff reference — shipped values differ)*
- **Alarm Flashing**: handoff 1.0 s cycle; shipped ~0.7–0.8 s (card frame 0.8 s; components and the
  ALARM! chip 0.7 s).
- ~~Alarm Ring Pulse~~: removed — the shipped visual has no alarm ring circles.

## Pending Research

- Certification requirements if AppSource is a target.
- Best rendering approach for the final visual design.
- Performance techniques for the expected data cardinality.
