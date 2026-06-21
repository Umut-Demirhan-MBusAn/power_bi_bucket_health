# Handoff: Bucket Health Visual (Power BI Custom Visual)

## Overview

A full-page Power BI custom visual for monitoring mining excavator bucket health in real time. The visual renders one responsive machine card per machine, showing an adaptive front-on schematic bucket with dynamic GET (Ground Engaging Tools) component counts for teeth, lip shrouds, and wing shrouds. Components are color-coded by status (OK, no-data, lockout, proximity alarm, movement alarm), support rich tooltips, and alarm states trigger bold visual prominence plus a dismissible audio alert when status transitions to an alarm state.

The design covers:
- **Single-machine detail view** with hover tooltips and dismissible audio alarm.
- **Multi-machine fleet grid** with responsive reflow (1→20 machines), alarm prioritization (alarming machines sort to front), and overflow scrolling.
- **Five edge states** (empty/setup, loading, invalid config, no-data, error) that don't crash the visual or restart stale audio.

## About the Design Files

The HTML files bundled here (`Bucket.dc.html`, `Fleet.dc.html`, `States.dc.html`) are **high-fidelity interactive prototypes** created in a design environment. They show the exact look, layout, color palette, typography, spacing, animations, and interaction flows you must implement.

**Your task:** Recreate these designs in the Power BI custom-visual codebase using D3/SVG or Canvas as appropriate. The visuals are written in TypeScript/JavaScript; you will implement:
1. The data-binding contract (capabilities.json data roles).
2. The parametric bucket geometry (SVG path generation from tooth/wing counts).
3. The status model and color mapping.
4. The responsive layout and reflow logic.
5. The alarm audio (WebAudio two-tone beep).
6. All five edge states.

**Read `IMPLEMENTATION.md` first** — it contains the data contract, the exact geometry math, the status model, and all the rules you need to implement the visual correctly.

## Fidelity

**High-fidelity (hifi).** The prototypes are pixel-perfect mockups with final colors, typography, spacing, and interactions. Recreate them exactly in the Power BI build using the design system's existing patterns and the codebase's established libraries (D3, etc.).

---

## Screens & Views

### 1. Single-Machine Detail (`Bucket.dc.html`)

**Purpose:** Show one machine's bucket and GET component statuses at full detail. Primary interaction surface for inspecting alarms, enabling audio, and viewing component tooltips.

**Layout:**
- Full-width container, dark background (#080b0f).
- Centered card with rounded corners (18px) and subtle radial gradient background.
- Header row: machine name (EX-204) + type label (Hydraulic Excavator) + alarm badge (red, if alarms active).
- Audio control button (top-right): "Enable alerts" (default) → "Alerts on" (armed) → "SILENCE ALARM" (playing).
- Large centered SVG bucket visualization (responsive width, aspect ratio preserved).
- Machine name watermarked faintly in the bucket cavity.

**SVG Bucket (parametric, front-on schematic):**
- Body: trapezoidal, cutting edge (bottom) wider than the top. Cavity (interior) is inset for depth.
- Spill guard: thin horizontal bars across the top edge.
- Top hitch bracket: fixed-size cast saddle with pivot pin, scaled by top-width to fit buckets 4–20 teeth.
- Teeth: tapered wedges, distributed evenly along the cutting edge. Status-colored, each with a lit top facet. Fixed size (TOOTH_W=36, TOOTH_H=62).
- Lip shrouds: flat rectangular plates between teeth, tops aligned to tooth tops. Status-colored. Fixed size (LIP_W=22, LIP_H=24).
- Wing shrouds: flat quadrilateral plates climbing each sloped side edge. Status-colored. Four per side max, centered near the middle of each side with fixed 56-unit pitch.
- Alarm indicator: large flashing red warning triangle (center) + pulsing red halo, visible only when any component is in alarm. Label: "PROXIMITY ALARM" or "MOVEMENT ALARM".
- Alarm rings: expanding circles around alarming components (red for proximity, dark red for movement).

**Colors (status):**
- OK: #34D399 (green)
- No data (1h): #F4C04E (yellow)
- Lockout: #5BA8F5 (light blue)
- Lockout + No data: #3B5BD9 (dark blue)
- Proximity alarm: #FF5A5A (bright red)
- Movement alarm: #C42B4A (dark red)

**Typography:**
- Machine name: Barlow Semi Condensed, 24px, weight 700, #F2F6FB.
- Type label: Inter, 11px, weight 600, #cdd8e4 (pill-style background).
- Alarm badge: IBM Plex Mono, 12px, weight 600, letter-spacing 0.04em, #f6cba6 on #221310.
- Audio button: IBM Plex Mono, 11.5px, weight 600, letter-spacing 0.04em.

**Interactions:**
- **Audio control button:** Click to arm/disarm audio. Armed state: beeps on alarm transitions. Disarm suppresses audio.
- **Card background click:** Dismiss current audio (if playing) — visual remains armed and highlighting persists.
- **Component hover** (future): Show tooltip with component name, tag ID, status, last-seen, and user-defined fields.
- **Tweaks panel (optional):** Sliders for teeth count (4–20) and wings per side (0–4) to preview adaptive bucket geometry.

**Animations:**
- Alarming components: hard on/off flash every 0.6s (opacity 1 → 0.28 → 1).
- Alarm rings: expanding pulse (opacity 0.8 → 0, scale 0.5 → 1.5) every 1.15s.
- Center alarm graphic (if active): flashing warning triangle + pulsing halo.
- All animations: honored `prefers-reduced-motion` — freeze flash to solid, hold rings static.

---

### 2. Multi-Machine Fleet Grid (`Fleet.dc.html`)

**Purpose:** Glanceable fleet overview. See all machines at once, alarm machines jump to the front and are highlighted.

**Layout:**
- Full-width, dark background (#080b0f).
- Header: "Fleet bucket health · Live monitoring · N machines". Fleet alarm summary badge (right): "N machines in alarm".
- Status legend (compact): six status colors + labels.
- **Responsive grid of machine cards:**
  - 1 machine: 1 column, fills available width/height.
  - 2 machines: 2 columns.
  - 3–6 machines: 3 columns.
  - 7–12 machines: 4 columns.
  - 13–20 machines: 5 columns.
  - Vertical scroll when cards exceed viewport height (scrollbar styling: semi-transparent gray on transparent).
  - Cards do not shrink below compact size; overflow is scrolled, not paginated.
- **Machine cards (in grid):**
  - Smaller versions of the single-machine bucket (same geometry, scaled down).
  - Header: machine name (e.g., EX-204) + type label + status chip (OK/alarm).
  - Bucket SVG (compact, aspect ratio preserved).
  - No audio controls on fleet cards (drill into single-machine view to enable audio).
- **Alarm highlighting:**
  - Alarming machines: pulsing red border (1.5px, #FF4D4D), background tint, and a center warning triangle.
  - Non-alarm machines: subtle border (#222d39).
  - Sort order: alarms to front (sort key = `hasAlarm*1000 + alarmCount`), ties keep source order.

**Colors & Styling:**
- Card background: radial gradient (darker at edges).
- Alarming card border: #FF4D4D, pulsing box-shadow (red glow).
- Regular card border: #222d39 (muted).
- Status chip background: OK = #13241c, alarm = #2a1212.
- Status chip text: OK = #7fd9b0, alarm = #ff9a9a.

**Interactions:**
- **Click a card** → navigate/drill into single-machine detail view (Bucket.dc.html).
- **Tweak: Machine count** → slider 1–20, reflows grid in real time.

---

### 3. Edge States (`States.dc.html`)

Five non-normal states, displayed as full-page fallbacks. No machine cards render; audio is suppressed.

#### 3a. No Fields Bound (Setup Guidance)
- Icon: blue grid/table.
- Title: "Add data to get started".
- Subtitle: "Bind the required fields in the Fields pane to render machine buckets."
- Required fields list (with blue dots + field names + roles):
  - Machine (required)
  - Component (required)
  - Category (required)
  - Status (required)

#### 3b. Loading
- Icon: skeleton bucket outline (dashed strokes) + animated spinner.
- Message: "Loading machine data…"
- No stale audio.

#### 3c. Invalid Configuration
- Icon: yellow warning triangle.
- Title: "Configuration incomplete".
- Subtitle: "The visual can't render until these required roles are bound:"
- Missing roles list (with X icons + role names + detail "not bound"):
  - Status (not bound)
  - Category (not bound)

#### 3d. No Data
- Icon: dashed bucket outline.
- Title: "No machines to show".
- Subtitle: "No rows match the current filters or slicers. Adjust the page filters to see machines."

#### 3e. Error
- Icon: red error circle with exclamation.
- Title: "Couldn't render the visual".
- Subtitle: "An unexpected data error occurred. The last good state is kept and new audio alarms are suppressed until valid data returns."
- Error detail (monospace, red-tinted box): "ERR · [error message]".

---

## Interactions & Behavior

### Audio Alarm

- **Arm:** Click "Enable alerts" button (only visible in single-machine view). State changes to "Alerts on" (green) + WebAudio context is created.
- **Trigger:** When a component transitions from any non-alarm status into Proximity Alarm or Movement Alarm, the beep starts.
- **Beep pattern:** Two-tone square-wave (880 Hz + 660 Hz), 0.24s each, repeating every 1.5s.
- **Dismiss:** Click anywhere on the bucket card → audio stops, but visual is still armed (stays "Alerts on"). A new alarm transition will restart the beep.
- **Disarm:** Click "Alerts on" / "SILENCE ALARM" button → audio stops, state reverts to "Enable alerts".
- **Auto-stop:** After 120s (2 minutes), audio stops automatically.
- **Suppression:** Audio is never started in loading/error states. In error, the visual retains the last good frame.
- **Reduced motion:** Respect `prefers-reduced-motion` — suppress audio entirely (user preference).

### Responsive Layout

- **Single machine:** Card scales to fill available width (min 460px); bucket SVG is `width:100%` with aspect ratio preserved.
- **Multi-machine:** CSS grid reflows by column count (see **Fleet Grid** section). Cards shrink proportionally until compact; then vertical scroll.
- **Resize:** Reflow is instant (no animated transitions).

### Alarm Prioritization

- Machines with active alarms sort to the front (top-left) of the grid.
- Alarming machines get a pulsing red border + center warning triangle.
- Non-alarm machines appear below, in source order.
- Sort key: `hasAlarm*1000 + alarmCount` (highest first).

---

## State Management

### Single-Machine View

**Local state needed:**
- `tooltip`: { component, x, y } — for hover tooltips (future).
- `audioArmed`: boolean — audio enabled/disabled toggle.
- `audioPlaying`: boolean — audio is currently sounding.

**Lifecycle:**
1. Component mounts: check if machine has alarms; if armed and alarm detected, start audio.
2. Data updates: check for alarm transitions (non-alarm → alarm). If armed, start beep.
3. Component unmounts: stop audio, close WebAudio context.

### Multi-Machine Grid

**Local state needed:**
- `machineCount`: integer 1–20 — for the Tweaks slider.
- None for alarm prioritization — derived from data.

---

## Design Tokens

### Colors
| Name | Hex | Usage |
| --- | --- | --- |
| OK | #34D399 | Tooth/lip/wing fills (good status) |
| No Data | #F4C04E | Tooth/lip/wing fills (no data) |
| Lockout | #5BA8F5 | Tooth/lip/wing fills (lockout) |
| Lockout+ND | #3B5BD9 | Tooth/lip/wing fills (lockout + no data) |
| Proximity Alarm | #FF5A5A | Tooth/lip/wing fills (proximity alarm), alarm border, rings |
| Movement Alarm | #C42B4A | Tooth/lip/wing fills (movement alarm), alarm rings |
| Background | #080b0f | Page background |
| Card BG | radial #1d2733 → #0b1015 | Machine card background |
| Card border | #222d39 | Non-alarm card border |
| Alarm border | #FF4D4D | Alarming card border |
| Text primary | #EAF0F7 | Headings, machine names |
| Text secondary | #9aa8b7 | Labels, legends |
| Text muted | #5d6b7b | Small text, helpers |
| Bucket body | #3d4651 (top) → #1a212a (bottom) | Gradient fill |
| Bucket cavity | radial #0b1016 → #1b232c | Interior shading |

### Typography
| Use | Font | Size | Weight | Letter-spacing |
| --- | --- | --- | --- | --- |
| Page title | Barlow Semi Condensed | 30–32px | 700 | −0.01em |
| Machine name | Barlow Semi Condensed | 18–24px | 700 | +0.01em |
| Label pill | Inter | 11px | 600 | — |
| Status badge | IBM Plex Mono | 12px | 600 | +0.04em |
| Button text | IBM Plex Mono | 11.5px | 600 | +0.04em |
| Legend | Inter | 12px | 400 | — |
| Tooltip | Inter | 12px | 400 | — |

### Spacing & Sizing
| Element | Size/Scale |
| --- | --- |
| Page padding | 30–48px |
| Card gap | 16–24px |
| Card border-radius | 14–18px |
| Button padding | 7–13px |
| Status chip padding | 3–9px |
| SVG tooth width | 36 units |
| SVG tooth height | 62 units |
| SVG lip width | 22 units |
| SVG lip height | 24 units |
| SVG tooth pitch | 66 units |
| SVG wing pitch | 56 units |

### Animations
| Element | Duration | Effect | Reduced Motion |
| --- | --- | --- | --- |
| Component flash | 0.6s | opacity 1→0.28→1, steps | freeze to solid |
| Alarm ring pulse | 1.15s | scale 0.5→1.5, opacity fade | static at 0.3 opacity |
| Center alarm graphic | 0.66s | flash + halo pulse | freeze to static triangle |
| Card pulse (alarm) | 1.1s | border + shadow glow | static border, reduced glow |

---

## Assets

All graphics are generated SVG (no image files). The design uses:
- **SVG paths** for bucket body, teeth, lip shrouds, wing shrouds (parametric, generated from tooth/wing counts).
- **Gradients** (linear/radial) for depth shading.
- **Filters** (shadows) for soft drop-shadow and ambient occlusion on components.
- **Keyframe animations** (CSS) for flashing and pulsing.

No external images or icons except inline SVG for UI buttons (play/speaker icons).

---

## Files in This Bundle

- **Bucket.dc.html** — Single-machine detail view. Open in a browser to see the full interaction: bucket geometry, tooltips, audio control, animations.
- **Fleet.dc.html** — Multi-machine fleet grid. Drag the "Machine count" slider to see responsive reflow.
- **States.dc.html** — The five edge states. Shows all fallback UI for setup, loading, invalid config, no-data, and error.
- **IMPLEMENTATION.md** — The complete technical spec: data contract, bucket geometry math, status model, layout rules, alarm behavior, formatting-pane settings, and open questions.

---

## How to Implement

1. **Start with the data contract** (IMPLEMENTATION.md, section 1). Define capabilities.json data roles and ensure your data binding matches.

2. **Build the bucket geometry function** (section 3). This is the core of the visual — a parametric SVG generator that takes tooth count + wing count and outputs the correct bucket body, component positions, and sizes.

3. **Implement the status model and color mapping** (section 2). Map your status strings/codes to the six states and their hex colors.

4. **Build the single-machine view:**
   - Render the bucket SVG from your geometry function.
   - Add hover tooltips (optional but recommended for UX).
   - Integrate WebAudio alarm (arm button + beep logic).
   - Implement alarm transitions and dismissal.

5. **Build the multi-machine fleet grid:**
   - CSS grid layout with responsive column counts.
   - Sort by alarm priority.
   - Drill-through to single-machine view.

6. **Implement all five edge states.** Each must be a fallback that doesn't crash the visual and suppresses audio.

7. **Test across all states, machine counts (1–20), and responsive sizes.**

---

## Questions for the Business

Before final implementation, confirm:
- **Status mapping:** How are status values provided (exact strings, numeric codes)? Should status-string mapping be configurable?
- **Unique keys:** What fields are the unique keys for machine and component?
- **Timezone:** What timezone is `lastSeen` in? Format (local vs. as-provided)?
- **Cross-filter:** Should clicking a machine/component cross-filter other visuals? Should Power BI selection highlight components?
- **Drill:** Should report page tooltips or drillthrough be supported?
- **Alarm reorder persistence:** Should the alarm-triggered reorder persist across filter changes?
- **AppSource certification:** Is this visual for internal use only, or targeting the marketplace? (Affects audio approach + privilege review.)
