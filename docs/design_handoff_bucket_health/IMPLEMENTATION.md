# Bucket Health Visual — Design → Implementation Handoff

This document maps the approved HTML design to the Power BI custom-visual build. It is the
source of truth for geometry, the data contract, the status model, and runtime behavior.

## Design files (open directly in a browser)

| File | What it is |
| --- | --- |
| `Bucket.dc.html` | Single-machine view. Adaptive bucket, hover tooltips, audio alarm, Tweaks (teeth/wings). The reference for geometry + interactions. |
| `Fleet.dc.html` | Multi-machine grid. Responsive reflow 1→20, alarm prioritization. Tweak: machine count. |
| `States.dc.html` | The five non-normal states: no-fields / loading / invalid-config / no-data / error. |

> The `.dc.html` files are design components. Treat their SVG geometry + the logic class
> (`renderVals`) as the spec; reimplement in the visual's renderer (D3/SVG) — do not ship the
> design files as the visual.

---

## 1. Data contract (capabilities.json data roles)

| Role | Kind | Required | Notes |
| --- | --- | --- | --- |
| `machine` | Grouping | yes | Unique machine key. One machine = one card. |
| `component` | Grouping | yes | Unique component key within a machine. |
| `category` | Grouping | yes | One of `tooth` \| `lipShroud` \| `wingShroud`. |
| `order` | Measure/Grouping | yes | Integer index. Tooth/lip left→right; wing per-side order. |
| `side` | Grouping | wing only | `left` \| `right` for wing shrouds. |
| `status` | Grouping/Measure | yes | Maps to the status model below. |
| `lastSeen` | Measure (datetime) | no | Shown in tooltip. |
| `tooltipFields` | Measure (multiple) | no | Extra user fields appended to the tooltip. |

**One row = one GET component status.** Counts are derived from the data, not settings:
- Teeth = count of `category = tooth` rows for the machine (clamp 4–20).
- Lip shrouds = `teeth − 1` (inferred; do not require lip rows unless the author binds them).
- Wing shrouds = count of `category = wingShroud` rows, ≤ 4 per side.

---

## 2. Status model

| Status | Fill | Alarm | Audio |
| --- | --- | --- | --- |
| OK | `#34D399` | — | no |
| No data (1h) | `#F4C04E` | — | no |
| Lockout | `#5BA8F5` | — | no |
| Lockout + No data | `#3B5BD9` | — | no |
| Proximity alarm | `#FF5A5A` | flash | yes (on transition) |
| Movement alarm | `#C42B4A` | flash | yes (on transition) |

- Component stroke = its fill mixed 42% toward black.
- Alarm components flash (hard on/off, 0.6 s) and emit an expanding ring.
- Secondary (non-color) signal required: flash + ring + tooltip label; honor `prefers-reduced-motion`
  (freeze flash to solid, keep ring static).
- Precedence when a component has multiple statuses: **movement > proximity > lockout+nodata >
  lockout > nodata > ok** (movement wins the card-level alarm graphic/label).

---

## 3. Bucket geometry (parametric, front-on)

All sizes are in SVG user units. **Component sizes are fixed; the bucket scales around them.**

```
SLOT       = 66      // tooth pitch (center-to-center)
TOOTH_W    = 36      // tooth top width (fixed)
TOOTH_H    = 62      // tooth height (fixed)
LIP_W      = 22      // lip plate width (fixed)
LIP_H      = 24      // lip plate height (fixed)
WING: half-len 24, inner 11, outer 14 (fixed); pitch 56 along the side edge
MARGIN     = 72      // horizontal padding inside the viewBox
```

Given `n` = teeth (4–20) and `w` = wings per side (0–4):

```
halfBot  = n * SLOT / 2            // cutting-edge half-width  → HORIZONTAL scale (teeth)
halfTop  = halfBot * 0.84          // top is narrower than the cutting edge
topY     = 86
bucketH  = 116 + w * 46            // VERTICAL scale (wings)
botY     = topY + bucketH
CX       = halfBot + MARGIN
viewBox  = `0 0 ${2*CX} ${botY + TOOTH_H + 40}`
```

Body corners: `TL=(CX-halfTop,topY) TR=(CX+halfTop,topY) BL=(CX-halfBot,botY) BR=(CX+halfBot,botY)`.
Cavity = body inset (≈38 top, 54 sides, 14 bottom).

**Teeth** distribute along the cutting edge: `cx_i = L + (i+0.5)*slot`, `slot = (R-L)/n`,
`L=BL+10, R=BR-10`. Each tooth is a tapered wedge (flat top `TOOTH_W`, blunt rounded tip).

**Lip shrouds** sit between teeth: `cx_i = L + (i+1)*slot`, flat rounded-rect plates, tops aligned
to the tooth tops (no vertical poke — keeps the row visually centered).

**Wing shrouds** ride each sloped side edge (`BL→TL`, `BR→TR`), centered on the edge midpoint with
fixed 56-unit pitch: `t_k = 0.5 + (k − (w−1)/2) * (56/edgeLen)`, clamped to `[0.1, 0.9]`.
Plates are quads oriented to the edge (outward normal points away from center).

**Top hitch bracket** (lugs + pivot pin) is a fixed-size cast shape centered on the top edge,
scaled by `clamp((2*halfTop)/320, 0.6, 1.05)` so it fits narrow buckets.

Display: the design renders the viewBox into the card at `width:100%` so the bucket fills the
machine card; component sizes stay constant relative to the viewBox.

---

## 4. Multi-machine layout (`Fleet.dc.html`)

- CSS grid columns by count: `1→1, 2→2, 3–6→3, 7–12→4, 13–20→5`. Cap 20 machines.
- One machine fills the available space. Beyond the column cap, the grid **scrolls vertically**
  (cards stop shrinking once compact).
- **Alarm prioritization:** machines with active alarms sort to the front (top-left), get a pulsing
  red border + the center warning graphic + a status chip. Sort key = `hasAlarm*1000 + alarmCount`,
  ties keep source order.
- Per-component tooltips live on the single-machine drill-in view, not the fleet overview.

---

## 5. Alarm audio

- WebAudio two-tone beep (880/660 Hz square, ~0.24 s each), repeating every 1.5 s.
- **Starts on transition** into Proximity/Movement from any non-alarm status — not continuously.
- **Dismiss:** a click anywhere in the visual stops current audio (visual highlight persists).
- **Auto-stop** after 120 s.
- Requires a user gesture to unlock audio (browser policy) → an "Enable alerts" control arms it.
  Suppress all new audio in loading/error states.
- Open question (carried from spec): should a *new* alarm after dismissal restart audio? Currently
  dismissal keeps the visual armed; a fresh transition would re-trigger.

---

## 6. States (`States.dc.html`)

No machine cards render in any of these; audio is suppressed:
- **No fields bound** → setup guidance listing required roles.
- **Loading** → skeleton bucket + spinner, no stale audio.
- **Invalid config** → names the unbound required roles.
- **No data** → empty outline, "no rows match filters".
- **Error** → non-crashing message; keep last good frame, suppress new audio.

---

## 7. Formatting pane settings to expose

- Layout: min card size, columns (auto/fixed), max machines behavior.
- Status: color overrides per status, status-string → model mapping.
- Ordering: tooth/lip order source; wing odd/even side assignment + within-side direction.
- Alarm: enable audio, restart-after-dismiss behavior, alarm priority.
- Motion: respect reduced-motion (default on).

---

## 8. Open questions still to confirm with the business

- Unique keys for machine + component; exact status field + whether strings are fixed.
- `lastSeen` timezone + formatting (local vs as-provided).
- Cross-filter / selection / drillthrough / report-page-tooltip support.
- Whether alarm reorder persists across filter changes.
- AppSource certification target (affects privileges + audio approach).
