/* =============================================================================================
   Bucket Health: screenshot + video script (SQL Server, DirectQuery)
   =============================================================================================

   HOW TO USE THIS FILE
   - Run qa/bucket_health_qa.sql once first: it builds the BucketHealthQA database and the helpers.
   - Open this file in SSMS (or Azure Data Studio) connected to localhost, database BucketHealthQA.
   - Run ONE step at a time: select the EXEC lines of that step and press F5. Wait for the page
     refresh (5 s), check the "EXPECT" line, take the screenshot if the step says SCREENSHOT.
   - Stuck or messed up? Run   EXEC dbo.bh_reset;   and everything is back to all-green.
   - The helpers are listed at the top of qa/bucket_health_qa.sql. Full test cases:
     docs/QA_TEST_CASES.md.

   HOW THE ALARM SOUND DECIDES (so the video steps make sense)
   - Every alarm has an id = machine + component + alarm time. Each id beeps ONCE, ever
     (per report session). The same id coming back never beeps again, even after it was cleared.
   - Alarms that already exist when the report opens do not beep.
   - One click anywhere inside the visual stops the sound. The first click also unlocks sound
     in the browser, so ALWAYS click the visual once after opening the report.
   - A new alarm while the beep is already playing does not restart it (the 60 s timer keeps
     running). Clearing an alarm does not stop a playing beep; a click, "Enable audio alarm" off,
     or 60 s does.
   - Turning "Enable audio alarm" off stops the beep at once; alarms that arrive while it is off
     never beep later.

   POWER BI DESKTOP SETUP (once)
   1. Get data -> SQL Server. Server: localhost   Database: BucketHealthQA   Mode: DirectQuery.
      Pick dbo.v_bucket_health. If asked about encryption, accept the unencrypted connection.
   2. Add the Bucket Health visual and bind (drag the column, not a date hierarchy):
        Machine = machine_key            Machine Type = machine_type
        Component = component_key        Category = component_category
        Order = component_order (Don't summarize)   Component Status = status
        Comp. Alarm Time = alarm_time    Last Seen = last_seen_utc
        Tooltip Fields = tag_id (First), wear_pct
   3. Add a Table visual next to it with machine_key, component_name, status, tag_id, wear_pct
      (used for the cross-filter screenshot).
   4. Format page -> Page refresh -> On -> Auto page refresh -> every 5 seconds.
   5. Screenshots: make the Bucket Health visual big (about 2/3 of the page), close the
      Filters/Format panes unless the step says otherwise. For a crisp still of a flashing alarm
      you can set Format -> Alarm -> Alarm motion = Never (solid red), then back to Always.
   ============================================================================================= */
USE BucketHealthQA;
GO

/* =============================================================================================
   PART A: STILL SCREENSHOTS (no sound needed)
   Suggested file names are in [brackets].
   ============================================================================================= */

-- A1. Landing page. No SQL.
--     Add a NEW, empty Bucket Health visual (click the icon, bind nothing) and open Format visual.
--     EXPECT: "Add data to get started" with the list of required fields.
--     SCREENSHOT [01_landing_page_and_format_pane.png]   Then delete that empty visual.

-- A2. Healthy fleet.
EXEC dbo.bh_reset;
--     EXPECT: 6 green cards, widths follow the teeth count (SH-301 widest, LD-202 narrowest).
--     SCREENSHOT [02_fleet_all_ok.png]

-- A3. One machine, full size. No SQL.
--     Filters pane -> Filters on this visual -> machine_key -> tick EX-101 only.
--     EXPECT: one large EX-101 card filling the visual.
--     SCREENSHOT [03_single_machine_ok.png]   Keep the filter on for A4.

-- A4. Every non-alarm status on one machine.
EXEC dbo.bh_set 'EX-101', 'tooth',      2, 'Lockout';
EXEC dbo.bh_set 'EX-101', 'tooth',      7, 'No Data (1h)';
EXEC dbo.bh_set 'EX-101', 'lipShroud',  4, 'Lockout + No Data';
EXEC dbo.bh_set 'EX-101', 'wingShroud', 1, 'No Data (1h)';
--     EXPECT: green frame (no alarm), blue tooth 2, yellow tooth 7, dark-blue lip 4, yellow wing.
--     SCREENSHOT [04_single_machine_all_statuses.png]
--     Then hover tooth 2: tooltip with Lockout, machine, Last seen, tag_id, wear_pct.
--     SCREENSHOT [05_tooltip.png]
--     Remove the machine_key filter.

-- A5. Cross-filter. No SQL.
--     Click EX-101 tooth 2. EXPECT: the other components dim, the Table shows only that row.
--     Ctrl+click tooth 7 to add it. SCREENSHOT [06_select_component_cross_filter.png]
--     Click empty space in the visual to clear the selection.

-- A6. A whole machine offline + lockouts elsewhere (fleet view).
UPDATE dbo.bucket_health SET status = N'No Data (1h)' WHERE machine_key = N'LD-201';
EXEC dbo.bh_set 'LD-201', 'tooth', 7, 'Lockout + No Data';
EXEC dbo.bh_set 'SH-301', 'tooth', 11, 'Lockout';
--     EXPECT: LD-201 has a yellow frame and NO DATA badge; EX-101 still shows its mixed statuses;
--     SH-301 tooth 11 blue. No card is red.
--     SCREENSHOT [07_fleet_offline_machine_and_lockouts.png]

-- A7. One proximity alarm (fleet). Start clean first.
EXEC dbo.bh_reset;
--     wait one refresh, then:
EXEC dbo.bh_alarm 'EX-103', 'tooth', 3;
--     EXPECT: EX-103 jumps to the front, red flashing frame, ALARM! chip, flashing warning icon,
--     banner "Proximity Alarm - Tooth 3". Other cards stay where they were.
--     SCREENSHOT [08_fleet_one_proximity_alarm.png]

-- A8. Movement + proximity on one machine, and alarms on two machines.
EXEC dbo.bh_alarm 'EX-103', 'lipShroud', 2, 'Movement Alarm';
EXEC dbo.bh_alarm 'SH-301', 'tooth', 14;
EXEC dbo.bh_alarm 'SH-301', 'tooth', 15;
--     EXPECT: EX-103 first (movement beats proximity), banner has two lines:
--     "Movement Alarm - Lip 2" and "Proximity Alarm - Tooth 3". SH-301 second with
--     "Proximity Alarm - Tooth 14, Tooth 15". The rest follow, green.
--     SCREENSHOT [09_fleet_multiple_alarms.png]
--     Filter the visual to EX-103 only (Filters pane) for a close-up:
--     SCREENSHOT [10_single_machine_movement_and_proximity.png]   Remove the filter.

-- A9. A machine with bad data renders its own error card; the rest keep working.
EXEC dbo.bh_clear_alarms;
UPDATE dbo.bucket_health SET is_active = 1 WHERE machine_key = N'EX-190';
--     EXPECT: EX-190 card with DATA ERROR badge and one line:
--     "Tooth 4 (EX-190-T04): status 'Broken' is not recognised. Use OK, ..."; all other cards normal.
--     SCREENSHOT [11_fleet_with_data_error_card.png]

-- A10. Rows without a machine: warning banner above the fleet.
UPDATE dbo.bucket_health SET is_active = 1 WHERE machine_key IS NULL;
--     EXPECT: banner "1 row has no machine and is not shown." above the cards; cards unchanged.
--     SCREENSHOT [12_warning_banner_blank_machine.png]

-- A11. No rows at all: "No machines to show."
UPDATE dbo.bucket_health SET is_active = 0;
--     EXPECT: the No data screen with its icon and guidance text.
--     SCREENSHOT [13_no_machines_to_show.png]

-- A12. Every row's machine is blank: the Error screen.
EXEC dbo.bh_reset;
UPDATE dbo.bucket_health SET machine_key = NULL WHERE is_active = 1;
--     EXPECT: "Couldn't render the visual" error screen with
--     "ERR · 134 rows have no machine and are not shown."
--     SCREENSHOT [14_error_state.png]
EXEC dbo.bh_reset;   -- back to the healthy fleet

-- A13. Formatting pane. No SQL.
--     Format visual -> expand Layout, Ordering and Alarm.
--     SCREENSHOT [15_format_pane_settings.png]
--     Optional: Ordering -> Teeth & lip order = Right to left, or change Wing side assignment,
--     with one machine filtered: SCREENSHOT [16_ordering_options.png]. Set them back.

-- A14. Optional: Windows high contrast.
--     Windows Settings -> Accessibility -> Contrast themes -> e.g. "Night sky" -> Apply.
--     Put a couple of statuses and one alarm on (re-run A4 lines + EXEC dbo.bh_alarm 'EX-103','tooth',3;).
--     SCREENSHOT [17_high_contrast.png]   Contrast themes -> None.   EXEC dbo.bh_reset;


/* =============================================================================================
   PART B: ALARM VIDEO (sound on, screen recorder running)
   Before recording: EXEC dbo.bh_reset; wait one refresh; click EMPTY space inside the visual
   once (unlocks sound). Keep the Format pane closed except in B10/B11.
   Pause ~6-8 s after every step so the viewer sees the refresh.
   To retake the video: EXEC dbo.bh_reset; and start again - every new alarm gets a new time,
   so the steps beep again without reopening the report.
   ============================================================================================= */

-- B1. All good. Show the green fleet for a few seconds.
EXEC dbo.bh_reset;

-- B2. First alarm.
EXEC dbo.bh_alarm 'EX-103', 'tooth', 3;
--     EXPECT: BEEP starts (two-tone, repeating); EX-103 jumps to the front and flashes.

-- B3. Acknowledge: click anywhere inside the visual (not on a component, or it cross-filters).
--     EXPECT: sound stops; EX-103 keeps flashing (the alarm is still active).

-- B4. The same alarm is sent again by the source system (normal refresh, only timestamps move).
EXEC dbo.bh_touch;
--     EXPECT: NO beep, nothing jumps or restarts; the flashing keeps its rhythm.

-- B5. A second alarm on another machine.
EXEC dbo.bh_alarm 'SH-301', 'lipShroud', 9, 'Movement Alarm';
--     EXPECT: BEEP; SH-301 jumps to the front (movement outranks proximity), EX-103 second;
--     both flash in step.

-- B6. Same machine, new alarm while it is still alarming and beeping (do NOT click first).
EXEC dbo.bh_alarm 'SH-301', 'tooth', 4, 'Movement Alarm';
--     EXPECT: the beep simply continues; SH-301 banner now "Movement Alarm - Tooth 4, Lip 9".

-- B7. Click to acknowledge. Then a new alarm on the same machine after the acknowledgement.
EXEC dbo.bh_alarm 'EX-103', 'tooth', 5;
--     EXPECT: BEEP again (a new alarm id); EX-103 banner "Proximity Alarm - Tooth 3, Tooth 5".
--     Click to acknowledge.

-- B8. Escalation: the proximity alarm on EX-103 tooth 3 becomes movement (new alarm time).
EXEC dbo.bh_alarm 'EX-103', 'tooth', 3, 'Movement Alarm';
--     EXPECT: BEEP; EX-103 banner now "Movement Alarm - Tooth 3" and "Proximity Alarm - Tooth 5".
--     Both alarm cards stay at the front (both movement, 2 alarms each). Click to acknowledge.

-- B9. Clear an alarm, then the SAME alarm comes back (source re-sends the old alarm time).
EXEC dbo.bh_set 'EX-103', 'tooth', 5, 'OK';
--     EXPECT: tooth 5 turns green, banner drops it. Wait one refresh, then:
EXEC dbo.bh_alarm 'EX-103', 'tooth', 5, 'Proximity Alarm', 0;
--     EXPECT: tooth 5 red again, NO beep (that alarm was already heard).

-- B10. Clear it, then a genuinely NEW alarm on the same tooth.
EXEC dbo.bh_set 'EX-103', 'tooth', 5, 'OK';
--     wait one refresh, then:
EXEC dbo.bh_alarm 'EX-103', 'tooth', 5;
--     EXPECT: BEEP (new alarm time = new alarm).
--     While it beeps: Format -> Alarm -> Enable audio alarm OFF.  EXPECT: silence at once.

-- B11. An alarm that arrives while audio is off never beeps later.
EXEC dbo.bh_alarm 'LD-201', 'tooth', 6;
--     EXPECT: LD-201 flashes, no sound. Turn Enable audio alarm back ON: still no sound.
--     Optional: Alarm motion = Never -> the alarms go solid red (no flashing); back to Always.

-- B12. All clear.
EXEC dbo.bh_clear_alarms;
--     EXPECT: every card green again and back in its normal order. End of video.


/* =============================================================================================
   PART C: OPTIONAL EXTRA CHECKS
   ============================================================================================= */

-- C1. Alarms that exist when the report opens do not beep.
EXEC dbo.bh_alarm 'EX-102', 'tooth', 6;
--     Save the report, close Power BI Desktop, reopen the report, click the visual.
--     EXPECT: EX-102 flashes, NO beep. A new alarm after that beeps normally.

-- C2. Row limit: more than 2,000 rows -> truncation banner and an INCOMPLETE card.
EXEC dbo.bh_reset;
EXEC dbo.bh_bulk 40;
--     EXPECT: "Row limit reached (2,000 rows)" banner, the last machine shows INCOMPLETE,
--     cards scroll. SCREENSHOT [18_row_limit_banner.png] (optional)
--     Undo:
EXEC dbo.bh_reset;
