# QA Test Cases

Release test cases for Bucket Health, against live SQL Server data. Every case has an ID, where it
runs, steps and the exact expected result. Unit tests: [TESTING.md](TESTING.md).

| Runs on | Meaning |
| --- | --- |
| **Page** | The local test page: the packaged visual in an iframe with a Power BI host double. Scriptable. |
| **Desktop** | Power BI Desktop over DirectQuery. Manual. |
| **Both** | The same case on either. |

## Setup

**Sample data (once, re-runnable):** SQL Server with Windows sign-in, then
```bash
sqlcmd -S localhost -E -C -i qa/bucket_health_qa.sql
```
It builds database `BucketHealthQA`, view `dbo.v_bucket_health` and the helper procedures listed at
the top of [`qa/bucket_health_qa.sql`](../qa/bucket_health_qa.sql). Run a SQL step with
```bash
sqlcmd -S localhost -E -C -d BucketHealthQA -Q "EXEC dbo.bh_reset"
```

**Baseline fleet** (`EXEC dbo.bh_reset;`, 134 rows, every status OK, alarm times empty):

| Machine | Type | Teeth | Lip shrouds | Wing shrouds | Rows |
| --- | --- | --- | --- | --- | --- |
| EX-101 | Hydraulic Excavator | 10 | 9 | 4 | 23 |
| EX-102 | Hydraulic Excavator | 12 | 11 | 6 | 29 |
| EX-103 | Hydraulic Excavator | 6 | 5 | 2 | 13 |
| LD-201 | Wheel Loader | 8 | 7 | 0 | 15 |
| LD-202 | Wheel Loader | 4 | 3 | 0 | 7 |
| SH-301 | Electric Rope Shovel | 20 | 19 | 8 | 47 |

Component keys are `<machine>-T01`… (teeth), `-L01`… (lip shrouds), `-W01`… (wing shrouds); Order is
the number. Tooltip fields: `tag_id` (`TAG-<key>`) and `wear_pct`. Hidden extras, switched on by the
cases that need them: **EX-190** (6 teeth, 3 lip shrouds, tooth 4 status `Broken`) and one row
with no machine (`ORPHAN-T01`).

**Test page:**
```bash
npm run package
node qa/test-page/server.cjs
```
Open http://127.0.0.1:8766/. It serves the newest `dist/*.pbiviz`, polls the view every 5 s, and has
controls for the fields bound, all five format settings, a machine filter, high contrast, allow
interactions and the frame size. It applies the host's 2,000-row cap. Its source order is machine,
then category, then order. From the top page's console:

```js
const h = document.getElementById("frame").contentWindow.harness;
await h.refreshNow();   // poll now instead of waiting up to 5 s
h.snapshot();           // edge state, or banners + cards (badge, meta, border, alarm lines, issues, components)
h.tooltip();            // { hidden, name, rows: [[label, value], ...] }
h.events();             // selection, context menu, "audio: alarm started", "audio: alarm stopped after N s", renderingFailed
h.audio();              // { starts, stops, beeps, playing }
h.selection();          // selected ids, '["EX-101","EX-101-T02"]'
h.clearEvents();
```

**Power BI Desktop:** Get data → SQL Server → `localhost`, `BucketHealthQA`, DirectQuery →
`dbo.v_bucket_health`. Bind Machine = `machine_key`, Machine Type = `machine_type`, Component =
`component_key`, Category = `component_category`, Order = `component_order` (Don't summarize:
a summed Order merges rows that share every other value), Component Status = `status`, Comp.
Alarm Time = `alarm_time`, Last Seen = `last_seen_utc` (the columns, not date hierarchies),
Tooltip Fields = `tag_id` (First), `wear_pct`. Tooltip field labels then follow Power BI's naming
(e.g. "First tag_id"); the exact labels in TT-01 are the test page's. Add a Table visual with
`machine_key`, `component_name`, `status`. Format page → Page refresh → every 5 seconds.

**Every case starts from:** `EXEC dbo.bh_reset;`, the test page reloaded with default controls (or
the report reopened), then one refresh. "Refresh" below means `await h.refreshNow()` (Page) or
waiting for the page refresh (Desktop). "Click empty space" means a click inside the visual that
is not on a component. Audio cases click empty space once after the reload: browsers only allow
sound after a click in the visual.

Colours as the page reports them: OK `rgb(52, 211, 153)` / `#34D399`, No Data `rgb(244, 192, 78)` /
`#F4C04E`, Lockout `#5BA8F5`, Lockout + No Data `#3B5BD9`, Proximity `rgb(255, 90, 90)` / `#FF5A5A`,
Movement `rgb(196, 43, 74)` / `#C42B4A`, data-error grey `rgb(154, 164, 177)`.

## 1. Edge states

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| ES-01 | Both | Unbind every field (Page: untick all Fields). | Title "Add data to get started"; subtitle "Bind the required fields in the Fields pane to render machine bucket health."; field list Machine, Component, Category, Order, Component Status; tip starting "Tip: Also bind Comp. Alarm Time". |
| ES-02 | Both | Bind everything except Category and Order. | Title "Configuration incomplete"; subtitle "Bind the following required data roles to render the visual:"; list "Category", "Order", each marked "not bound". |
| ES-03 | Both | Filter the visual to a machine that does not exist (Page: Filter machines `NOPE`). | Title "No machines to show"; subtitle "No rows match the current filters or slicers. Adjust the page filters to see machines." |
| ES-04 | Both | `UPDATE dbo.bucket_health SET machine_key = NULL WHERE is_active = 1;` Refresh. | Title "Couldn’t render the visual"; subtitle "An unexpected data error occurred. New audio alarms are suppressed until valid data returns."; detail "ERR · 134 rows have no machine and are not shown." |
| ES-05 | Both | From ES-01..ES-04, restore the fields / filter / `EXEC dbo.bh_reset;`. Refresh. | The six baseline cards return. |

## 2. Layout

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| LY-01 | Both | Baseline, frame 1400×640 (Page: a browser window wider than 1,450 px). | Six cards in source order EX-101, EX-102, EX-103, LD-201, LD-202, SH-301 (Page). Every card is 340 px high. Cards wrap to fill each row; none overlaps another. SH-301 (20 teeth) is the widest card. |
| LY-02 | Both | Filter the visual to `EX-101`. | One card fills the visual (`snapshot().single === true`; the card is as tall as the visual less its padding). |
| LY-03 | Both | Format → Layout → Minimum card width = 600. | Every card is at least 600 px wide; the fleet scrolls vertically; no horizontal clipping of a card. Set back to 220. |
| LY-04 | Page | Size 360×420. | Cards stay at least 220 px wide and the fleet scrolls; bucket drawings keep their proportions. |
| LY-05 | Page | Mark cards: `h.element.querySelectorAll(".bucket-health-card").forEach(c => c.qa = 1)`. Change Size to 900×640 and back. | No card is rebuilt (every card still has `qa === 1`); layout reflows. |
| LY-06 | Both | Card header text on the baseline. | EX-101 meta "Hydraulic Excavator · 10 teeth · 9 lip shrouds · 4 wing shrouds"; LD-201 "Wheel Loader · 8 teeth · 7 lip shrouds" (no wing part). Badge "OK". |

## 3. Geometry and ordering

Positions come from `snapshot().cards[i].components[j].x` / `.y` (SVG units; x grows right, y down).

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| GE-01 | Both | Baseline. | Component counts per card: EX-101 23, EX-102 29, EX-103 13, LD-201 15, LD-202 7, SH-301 47. Each has `aria-label` like "Tooth 3: OK", "Lip shroud 2: OK", "Wing shroud 1: OK". |
| GE-02 | Both | Baseline, Teeth & lip order = Left to right. | EX-101 teeth x increases T01 → T10; lip shrouds x increases L01 → L09 and each lip sits between two teeth. |
| GE-03 | Both | Teeth & lip order = Right to left. | EX-101 T01 is the rightmost tooth and L01 the rightmost lip shroud. Set back. |
| GE-04 | Both | Wing side assignment = Odd Left / Even Right (default). | EX-101: W01, W03 left (`side` "left", x smaller than every tooth's); W02, W04 right. |
| GE-05 | Both | Odd Right / Even Left. | EX-101: W01, W03 right; W02, W04 left. |
| GE-06 | Both | First Half Left / Second Half Right. | EX-101: W01, W02 left; W03, W04 right. |
| GE-07 | Both | First Half Right / Second Half Left. | EX-101: W01, W02 right; W03, W04 left. |
| GE-08 | Both | `EXEC dbo.bh_add_machine 'QA-W3', 6, 5, 3;` First Half Left / Second Half Right. | QA-W3: W01, W02 left, W03 right (an odd count puts the extra wing on the first side). |
| GE-09 | Both | Baseline, default wing mode. | On each side the lowest Order is at the top: EX-101 W01 y < W03 y, W02 y < W04 y. |
| GE-10 | Both | Baseline. | SH-301 draws 20 teeth, 19 lip shrouds and 4 wing shrouds per side without overlaps; LD-202 draws 4 teeth, 3 lip shrouds, no wings. |

## 4. Status colours and card frame

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| ST-01 | Both | `EXEC dbo.bh_set 'EX-101','tooth',2,'Lockout'; EXEC dbo.bh_set 'EX-101','tooth',7,'No Data (1h)'; EXEC dbo.bh_set 'EX-101','lipShroud',4,'Lockout + No Data';` Refresh. | Fills: T02 `#5BA8F5`, T07 `#F4C04E`, L04 `#3B5BD9`, the rest `#34D399`. Labels "Tooth 2: Lockout", "Tooth 7: No Data (1h)", "Lip shroud 4: Lockout + No Data". EX-101 frame green, badge "OK", `aria-label` "EX-101: OK". |
| ST-02 | Both | `UPDATE dbo.bucket_health SET status = N'No Data (1h)' WHERE machine_key = N'LD-201'; EXEC dbo.bh_set 'LD-201','tooth',7,'Lockout + No Data';` Refresh. | LD-201 badge "NO DATA", border `rgb(244, 192, 78)`, `aria-label` "LD-201: No Data (1h)". |
| ST-03 | Both | Then `EXEC dbo.bh_set 'LD-201','tooth',1,'Lockout';` Refresh. | LD-201 back to badge "OK" and a green frame (one component is neither no-data kind). |
| ST-04 | Both | Accepted spellings: `EXEC dbo.bh_set 'EX-101','tooth',1,'no data'; EXEC dbo.bh_set 'EX-101','tooth',2,'NODATA'; EXEC dbo.bh_set 'EX-101','tooth',3,'No Data(1h)'; EXEC dbo.bh_set 'EX-101','tooth',4,'lockout+no data'; EXEC dbo.bh_set 'EX-101','tooth',5,'LockoutND'; EXEC dbo.bh_set 'EX-101','tooth',6,'  Lockout  '; EXEC dbo.bh_alarm 'EX-101','tooth',7,'prox'; EXEC dbo.bh_alarm 'EX-101','tooth',8,'MOVE';` Refresh. | EX-101 has no issues. `status` of T01–T08: nodata, nodata, nodata, lockoutnd, lockoutnd, lockout, prox, move. |

## 5. Alarms (visual)

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| AL-01 | Both | `EXEC dbo.bh_alarm 'EX-103','tooth',3;` Refresh. | EX-103 moves to the front; badge "ALARM!"; border `rgb(255, 90, 90)`; `aria-label` "EX-103: Proximity Alarm"; alarm line "Proximity Alarm - Tooth 3"; centre warning icon shown; T03 animation `bh-flash-prox`. Other cards keep their order. |
| AL-02 | Both | Then `EXEC dbo.bh_alarm 'EX-103','lipShroud',2,'Movement Alarm';` Refresh. | Alarm lines, in this order: "Movement Alarm - Lip 2", "Proximity Alarm - Tooth 3". Border `rgb(196, 43, 74)`; `aria-label` "EX-103: Movement Alarm"; L02 animation `bh-flash-move`. |
| AL-03 | Both | Baseline. `EXEC dbo.bh_alarm 'EX-103','tooth',3; EXEC dbo.bh_alarm 'SH-301','tooth',14; EXEC dbo.bh_alarm 'SH-301','tooth',15;` Refresh. | Order: SH-301 (2 alarms), EX-103 (1), then EX-101, EX-102, LD-201, LD-202. SH-301 line "Proximity Alarm - Tooth 14, Tooth 15". |
| AL-04 | Both | Then `EXEC dbo.bh_alarm 'LD-202','tooth',1,'Movement Alarm';` Refresh. | LD-202 first (movement outranks proximity), then SH-301, EX-103. |
| AL-05 | Both | Then `EXEC dbo.bh_clear_alarms;` Refresh. | All badges "OK"; source order restored; no alarm lines; no centre icons. |
| AL-06 | Both | One alarm on. Alarm motion = Never. | T03 animation `none`; card and ALARM! chip solid (no flashing); still red. |
| AL-07 | Both | Alarm motion = Auto, OS reduced motion off (Page: default). | Flashing (`bh-flash-prox`). |
| AL-08 | Page | Alarm motion = Auto with reduced motion emulated (DevTools / Playwright `emulateMedia({ reducedMotion: "reduce" })`). | Solid (`none`). With Always flash under the same emulation: flashing. |
| AL-09 | Both | Two machines alarming (AL-03). Watch 10 s. | Both cards flash in step (frames and chips pulse together). |

## 6. Audio

Page: read `h.audio()` and `h.events()`. Desktop: listen.

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| AU-01 | Both | `EXEC dbo.bh_alarm 'EX-102','tooth',6;` then reload the page (Desktop: save, close, reopen the report). Click empty space. Wait two refreshes. | EX-102 flashes; no "audio: alarm started" (pre-existing alarms do not beep). |
| AU-02 | Both | Click empty space. `EXEC dbo.bh_alarm 'EX-103','tooth',3;` Refresh. | "audio: alarm started"; `beeps` grows by one every ~1.5 s (two-tone 880 → 660 Hz). |
| AU-03 | Both | While AU-02 sounds, click empty space. | "audio: alarm stopped after N s" at once; EX-103 keeps flashing; selection cleared. |
| AU-04 | Both | Then `EXEC dbo.bh_touch;` Refresh twice. | No new start (same alarm id). Cards are not rebuilt. |
| AU-05 | Both | Then `EXEC dbo.bh_set 'EX-103','tooth',3,'OK';` Refresh. `EXEC dbo.bh_alarm 'EX-103','tooth',3,'Proximity Alarm',0;` Refresh. | T03 alarms again with its old alarm time: no start. |
| AU-06 | Both | Then `EXEC dbo.bh_set 'EX-103','tooth',3,'OK';` Refresh. `EXEC dbo.bh_alarm 'EX-103','tooth',3;` Refresh. | New alarm time: "audio: alarm started". Click to stop. |
| AU-07 | Both | Start a new alarm (AU-02). After ~20 s: `EXEC dbo.bh_alarm 'SH-301','tooth',4,'Movement Alarm';` Refresh. Do not click. | `starts` does not grow for the second alarm; the sound stops by itself with "alarm stopped after 60.0 s" (±1 s), counted from the first alarm. |
| AU-08 | Both | Start a new alarm. While it sounds: `EXEC dbo.bh_clear_alarms;` Refresh. | The sound continues (clearing does not stop it) until a click or 60 s. |
| AU-09 | Both | Start a new alarm. While it sounds, untick Enable audio alarm. | Stops at once. Then `EXEC dbo.bh_alarm 'LD-201','tooth',6;` Refresh: no start. Tick Enable audio alarm again, Refresh: still no start. |
| AU-10 | Both | Start a new alarm. While it sounds, filter the visual to `NOPE` (or unbind Category). | Stops at once (edge state). |
| AU-11 | Both | Baseline, no alarms. Unbind Comp. Alarm Time. Refresh. `EXEC dbo.bh_alarm 'EX-103','tooth',3;` Refresh. | Starts (first alarm on that component). Click to stop. `EXEC dbo.bh_set 'EX-103','tooth',3,'OK';` Refresh; `EXEC dbo.bh_alarm 'EX-103','tooth',3;` Refresh: **no** start (without alarm time the id never changes). |
| AU-12 | Page | Untick Allow interactions. Start a new alarm; click empty space. | The click does not stop it and logs no selection event. Tick it again; click stops it. |
| AU-13 | Desktop | Open the report, do not click the visual, raise a new alarm. | Browsers may block sound until the first click in the visual; after one click, new alarms are audible. |

## 7. Tooltip

Hover with the real mouse (Page: Playwright hover or `mouse.move` into the iframe; a synthetic
`mousemove` event on the element also works).

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| TT-01 | Both | `EXEC dbo.bh_set 'EX-101','tooth',2,'Lockout';` Refresh. Hover EX-101 tooth 2. | Heading "Tooth 2" with a status dot; rows in order: Status "Lockout" (in the status colour), Machine "EX-101", Type "Hydraulic Excavator", Component "EX-101-T02", Last seen (local date and time to the minute, e.g. "Sep 26, 2026, 09:14 AM"), tag_id "TAG-EX-101-T02", wear_pct (a number). Desktop: record the tooltip-field labels Power BI gives. |
| TT-02 | Both | Hover a lip shroud and a wing shroud. | Headings "Lip shroud N" and "Wing shroud N". |
| TT-03 | Both | Unbind Machine Type, Last Seen and Tooltip Fields. Hover a component. | Only Status, Machine, Component rows. |
| TT-04 | Both | Hover a tooth, then move onto empty card space. | Hides immediately. |
| TT-05 | Both | Hover a tooth and move the pointer out of the visual in one jump. | Hides immediately. |
| TT-06 | Both | Hover a tooth and keep still. | Still shown at 7 s; hidden at 8 s. |
| TT-07 | Both | After TT-06, move a little within the same tooth. | Stays hidden. Leave the tooth and come back: shown again. |
| TT-08 | Both | Hover a tooth, move within it every 5 s for 20 s. | Stays shown (each move restarts the 8 s). Keep still: hides 8 s after the last move. |
| TT-09 | Both | Hover tooth 2 for 6 s, then move to tooth 3. | Shows "Tooth 3"; hides 8 s after arriving on tooth 3. |
| TT-10 | Both | Hover EX-101 tooth 2; within 8 s run `EXEC dbo.bh_set 'EX-101','tooth',2,'No Data (1h)';` and Refresh. | The open tooltip's Status becomes "No Data (1h)"; it still hides 8 s after the last move (the refresh does not restart the count). |
| TT-11 | Page | Hover EX-101 tooth 2; filter the visual to `EX-102`. | The tooltip closes (its component is gone). |
| TT-12 | Both | Hover a component near the right and bottom edges of the visual. | The tooltip flips to the left of / above the pointer and stays inside the visual. |

## 8. Selection, context menu, keyboard

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| IN-01 | Both | Click EX-101 tooth 2. | Page: event `select ["EX-101","EX-101-T02"] -> 1 selected`; every other component `dimmed` (40 % opacity; alarming components stay fully visible). Desktop: the Table shows only that row. |
| IN-02 | Both | Ctrl+click EX-101 tooth 7. | Two selected; both undimmed. |
| IN-03 | Both | Click empty space. | "selection cleared"; nothing dimmed. |
| IN-04 | Page | Select a tooth, then `EXEC dbo.bh_touch;` and Refresh; then change another machine's status and Refresh. | Dimming stays on the same selection after both refreshes (the page's ids are machine + component). Desktop: observe and record; Power BI's row identity includes every bound grouping column, so a refresh that changes Last Seen may leave the selection matching no component. |
| IN-05 | Both | Right-click EX-101 tooth 2; right-click empty space. | Page: `context menu ["EX-101","EX-101-T02"] at x,y`, then `context menu (no selection id)`. Desktop: Power BI's context menu opens both times. |
| IN-06 | Both | Focus EX-101's first component (Tab into the visual). Press ArrowRight, ArrowDown, ArrowLeft, ArrowUp. | Focus moves next, next, previous, previous through the components (card by card: wing shrouds, lip shrouds, teeth), with a white focus ring; from the last component ArrowRight wraps to the first. |
| IN-07 | Both | Focus a component, press Enter; focus another, press Space; Ctrl+Enter on a third. | Each selects its component (Ctrl adds). |
| IN-08 | Page | Untick Allow interactions. Click, right-click, press Enter on a focused component. | No select, clear or context-menu event. |
| IN-09 | Desktop | Click a row in the Table visual. | Observe and record. Bucket Health does not support highlighting, so Power BI filters it to that row; its machine then has one component and shows count issues. Setting Format → Edit interactions → None on the Table avoids it. |

## 9. Update behaviour

Mark nodes first: `h.element.querySelectorAll(".bucket-health-card").forEach(c => c.qa = 1)`.

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| UP-01 | Page | `EXEC dbo.bh_touch;` Refresh. | Every card keeps `qa === 1` (only Last Seen changed). |
| UP-02 | Page | `EXEC dbo.bh_set 'EX-102','tooth',1,'Lockout';` Refresh. | Only EX-102 lost `qa`; the others kept it. |
| UP-03 | Page | Focus EX-101 tooth 2 (Tab or `.focus()`). `EXEC dbo.bh_set 'EX-101','tooth',5,'Lockout';` Refresh. | EX-101 is rebuilt, and focus is on EX-101-T02 in the new card. |
| UP-04 | Page | Size 360×420, scroll the fleet halfway. `EXEC dbo.bh_set 'LD-202','tooth',1,'Lockout';` Refresh. | Scroll position unchanged. |
| UP-05 | Page | Send an update of every kind: settings change, High contrast on/off, resize. | No `renderingFailed` event. |

## 10. Data errors (per machine)

Each case adds its own machine to the baseline; the other six cards must stay normal throughout.
Issue text is exact.

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| VA-01 | Both | `UPDATE dbo.bucket_health SET is_active = 1 WHERE machine_key = N'EX-190';` Refresh. | EX-190 card: badge "DATA ERROR", border `rgb(154, 164, 177)`, `aria-label` "EX-190: Data error", meta "Hydraulic Excavator · 5 teeth · 3 lip shrouds", no bucket drawing, one issue: "Tooth 4 (EX-190-T04): status 'Broken' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm." |
| VA-02 | Both | Then `EXEC dbo.bh_set 'EX-190','tooth',4,'OK';` Refresh. | One issue: "3 lip shrouds; expected 5."; meta "… · 6 teeth · 3 lip shrouds". |
| VA-03 | Both | `EXEC dbo.bh_add_machine 'QA-CAT', 4; UPDATE dbo.bucket_health SET component_category = N'TEETH' WHERE component_key = N'QA-CAT-T01'; UPDATE dbo.bucket_health SET component_category = N'Lip Shroud' WHERE component_key = N'QA-CAT-L01'; UPDATE dbo.bucket_health SET component_category = N'lip_shroud' WHERE component_key = N'QA-CAT-L02'; EXEC dbo.bh_add_row 'QA-CAT','QA-CAT-W01','Wing-Shroud',1;` Refresh. | QA-CAT valid: badge "OK", meta "Hydraulic Excavator · 4 teeth · 3 lip shrouds · 1 wing shrouds". |
| VA-04 | Both | Then `EXEC dbo.bh_add_row 'QA-CAT','QA-CAT-X1','bucket',1;` Refresh. | One issue: "QA-CAT-X1: category 'bucket' is not recognised. Use tooth, lip shroud or wing shroud." |
| VA-05 | Both | `EXEC dbo.bh_add_machine 'QA-ROW', 4; EXEC dbo.bh_add_row 'QA-ROW','','tooth',5;` Refresh. | One issue: "A tooth row has no component name." |
| VA-06 | Both | `EXEC dbo.bh_add_machine 'QA-ROW', 4; EXEC dbo.bh_add_row 'QA-ROW','QA-ROW-T05','tooth',5,'';` Refresh. | One issue: "Tooth 5 (QA-ROW-T05): status is blank. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm." |
| VA-07 | Both | `EXEC dbo.bh_add_machine 'QA-ROW', 4; EXEC dbo.bh_add_row 'QA-ROW','QA-ROW-T00','tooth',0;` Refresh. | One issue: "QA-ROW-T00: order '0' must be a whole number, starting at 1." |
| VA-08 | Both | `EXEC dbo.bh_add_machine 'QA-ROW', 4; EXEC dbo.bh_add_row 'QA-ROW','','bucket',0,'Broken';` Refresh. | Four issues in this order: "A row has no component name."; "A row: category 'bucket' is not recognised. Use tooth, lip shroud or wing shroud."; "A row: status 'Broken' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm."; "A row: order '0' must be a whole number, starting at 1." |
| VA-09 | Both | `EXEC dbo.bh_add_machine 'QA-DUP', 4; EXEC dbo.bh_add_row 'QA-DUP','QA-DUP-T01','tooth',5;` Refresh. | Issues: "Duplicate component 'QA-DUP-T01'."; "3 lip shrouds; expected 4." |
| VA-10 | Both | `EXEC dbo.bh_add_machine 'QA-FEW', 3, 2;` Refresh. | One issue: "3 teeth; supported range is 4–20." |
| VA-11 | Both | `EXEC dbo.bh_add_machine 'QA-MANY', 21, 20;` Refresh. | One issue: "21 teeth; supported range is 4–20." |
| VA-12 | Both | Then `EXEC dbo.bh_add_row 'QA-MANY','QA-MANY-X','tooth',22,'Broken';` Refresh. | Issues: "21 teeth; supported range is 4–20."; "Tooth 22 (QA-MANY-X): status 'Broken' is not recognised. Use OK, …" (the upper limit still shows with a rejected row). |
| VA-13 | Both | `EXEC dbo.bh_add_machine 'QA-LIP', 6, 4;` Refresh. | One issue: "4 lip shrouds; expected 5." |
| VA-14 | Both | `EXEC dbo.bh_add_machine 'QA-WING', 6, 5, 9;` Refresh with each wing mode. | Odd Left / Even Right: "5 wing shrouds on the left side; maximum is 4 per side." Odd Right / Even Left: "5 wing shrouds on the right side; maximum is 4 per side." First Half Left: left. First Half Right: right. |
| VA-15 | Both | `DECLARE @i int = 1, @k nvarchar(50); WHILE @i <= 25 BEGIN SET @k = CONCAT(N'QA-CAP-T', @i); EXEC dbo.bh_add_row N'QA-CAP', @k, N'tooth', @i, N'Broken'; SET @i += 1; END;` Refresh. | 21 list items: 20 issues (Page: "Tooth 1 (QA-CAP-T1): status 'Broken' is not recognised. …" first) then "…and 5 more."; empty meta line (type and counts come from valid rows only); the list scrolls inside the card. |
| VA-16 | Both | Click empty space. VA-01, then `EXEC dbo.bh_alarm 'EX-190','tooth',1;` Refresh. | EX-190 first; badge "ALARM!"; border `rgb(255, 90, 90)`; alarm line "Proximity Alarm - Tooth 1" above the issue list; audio starts. |
| VA-17 | Both | `UPDATE dbo.bucket_health SET is_active = 1 WHERE machine_key IS NULL;` Refresh. | Banner "⚠ 1 row has no machine and is not shown." above the cards. Then `EXEC dbo.bh_add_row NULL,'ORPHAN-T02','tooth',2;` Refresh: "⚠ 2 rows have no machine and are not shown." |
| VA-18 | Both | `UPDATE dbo.bucket_health SET machine_type = NULL WHERE machine_key = N'EX-103';` Refresh; hover an EX-103 component. | Meta "6 teeth · 5 lip shrouds · 2 wing shrouds"; tooltip has no Type row. |
| VA-19 | Both | `EXEC dbo.bh_remove_machine 'QA-…';` for any machine added above. Refresh. | Its card disappears; the rest are unchanged. |

## 11. Row limit

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| RC-01 | Page | `EXEC dbo.bh_bulk 40;` (2,014 rows) Refresh. | Banner "⚠ Row limit reached (2,000 rows) — some machines or components are not shown."; 46 cards; SH-301 (its first row comes last) badge "INCOMPLETE", issue "Incomplete — the 2,000-row limit was reached.", meta "Electric Rope Shovel · 14 teeth · 19 lip shrouds"; the fleet scrolls. |
| RC-02 | Page | Then `EXEC dbo.bh_alarm 'SH-301','tooth',1;` Refresh (click empty space first). | SH-301 moves to the front with "ALARM!", its issue list still shown; audio starts. |
| RC-03 | Page | `EXEC dbo.bh_reset;` Refresh. | Banner gone; six cards. |
| RC-04 | Desktop | `EXEC dbo.bh_bulk 40;` | A truncation banner appears and one machine shows INCOMPLETE (which one depends on the host's row order). |

## 12. High contrast

| ID | Runs on | Steps | Expected |
| --- | --- | --- | --- |
| HC-01 | Page | One alarm on (AL-01). Tick High contrast. | Components: fill `#000000`, stroke `#ffffff` width 2; alarm components stroke `#1aebff` width 3. Card borders `rgb(255, 255, 255)`; EX-103 border `rgb(26, 235, 255)`. Every card is rebuilt once; untick restores the colours. |
| HC-02 | Desktop | Windows Settings → Accessibility → Contrast themes → a theme → Apply. | Fills, strokes and card borders follow the theme; the alarm stays distinct; the focus ring stays visible. Set back to None. |

## 13. Power BI Desktop only

| ID | Steps | Expected |
| --- | --- | --- |
| PD-01 | Format visual. | Cards Layout (Minimum card width (px), 220), Ordering (Wing side assignment, Odd Left / Even Right; Teeth & lip order, Left to right), Alarm (Enable audio alarm, on; Alarm motion, Always flash). Each setting applies at once and persists after save and reopen. |
| PD-02 | Bind Last Seen as a date hierarchy instead of the column. | The tooltip's Last seen shows a bare year such as "2026" (documented: bind the column). |
| PD-03 | Page refresh at 5 s for 5 minutes with no data change. | No flicker, no card jumps, flashing keeps its rhythm, an open tooltip does not reopen after hiding. |

## Reporting

Record each case as PASS, FAIL (actual versus expected, with the snapshot or a screenshot) or NOT RUN
(with the reason). A FAIL on a Both case is re-checked in Desktop before an issue is opened.
