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
- **Auto-stop duration**: 120 seconds

### Fleet Grid Column Rules
- **1 machine**: 1 column (fills visual)
- **2 machines**: 2 columns
- **3-6 machines**: 3 columns
- **7-12 machines**: 4 columns
- **13-20 machines**: 5 columns

### Animation Timings
- **Alarm Flashing**: 1.0 second cycle (0.5s on, 0.5s off)
- **Alarm Ring Pulse**: 2.0 second cycle (expanding and fading)

## Pending Research

- Certification requirements if AppSource is a target.
- Best rendering approach for the final visual design.
- Performance techniques for the expected data cardinality.
