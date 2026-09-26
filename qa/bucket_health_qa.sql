/* Bucket Health QA data: SQL Server (DirectQuery source for Power BI Desktop and the local test page).
   Run the whole file once (re-runnable: it rebuilds everything). Times are UTC.
     sqlcmd -S localhost -E -C -i qa/bucket_health_qa.sql
   Test cases: docs/QA_TEST_CASES.md. Screenshot and video script: qa/showcase.sql.

   Helpers (all act on dbo.bucket_health; Power BI and the test page read dbo.v_bucket_health):
     EXEC dbo.bh_reset;                                  -- the 6-machine baseline fleet, all OK; extras hidden
     EXEC dbo.bh_alarm 'EX-101', 'tooth', 3;             -- NEW proximity alarm (alarm time = now)
     EXEC dbo.bh_alarm 'EX-101', 'tooth', 3, 'Movement Alarm';
     EXEC dbo.bh_alarm 'EX-101', 'tooth', 3, 'Proximity Alarm', 0;   -- SAME alarm: keeps the previous alarm time
     EXEC dbo.bh_set 'EX-101', 'tooth', 3, 'Lockout';    -- any status string; keeps the alarm time
     EXEC dbo.bh_clear_alarms;                           -- every alarm back to OK
     EXEC dbo.bh_touch;                                  -- a refresh where only Last Seen moves
     EXEC dbo.bh_add_machine 'QA-01', 6, 5, 2;           -- extra machine: teeth, lip shrouds, wing shrouds (all OK)
     EXEC dbo.bh_add_row 'QA-01', 'QA-01-X1', 'tooth', 7, 'OK';   -- one raw row (any category/status/order)
     EXEC dbo.bh_remove_machine 'QA-01';
     EXEC dbo.bh_bulk 40;                                -- 40 extra 20-tooth machines (BK-01..): over 2,000 rows
   Categories: 'tooth', 'lipShroud', 'wingShroud'. Order starts at 1 (1 = leftmost tooth). */

IF DB_ID(N'BucketHealthQA') IS NULL CREATE DATABASE BucketHealthQA;
GO
USE BucketHealthQA;
GO
DROP VIEW IF EXISTS dbo.v_bucket_health;
DROP TABLE IF EXISTS dbo.bucket_health;
DROP TABLE IF EXISTS dbo.bh_fleet;
GO
CREATE TABLE dbo.bucket_health (
    machine_key        nvarchar(50)  NULL,
    machine_type       nvarchar(100) NULL,
    component_key      nvarchar(50)  NOT NULL,
    component_name     nvarchar(100) NULL,
    component_category nvarchar(20)  NOT NULL,
    component_order    int           NOT NULL,
    status             nvarchar(40)  NOT NULL,
    last_seen_utc      datetime2(0)  NULL,
    alarm_time         datetime2(0)  NULL,
    tag_id             nvarchar(60)  NULL,
    wear_pct           int           NULL,
    is_active          bit           NOT NULL DEFAULT 1   -- 0 = hidden from Power BI
);
GO
-- Baseline fleet. Lip shrouds = teeth - 1; wings = total wing shrouds (split by Order into sides).
CREATE TABLE dbo.bh_fleet (
    machine_key  nvarchar(50)  NOT NULL,
    machine_type nvarchar(100) NOT NULL,
    teeth        int           NOT NULL,
    wings        int           NOT NULL
);
INSERT INTO dbo.bh_fleet VALUES
    (N'EX-101', N'Hydraulic Excavator',  10, 4),
    (N'EX-102', N'Hydraulic Excavator',  12, 6),
    (N'SH-301', N'Electric Rope Shovel', 20, 8),
    (N'EX-103', N'Hydraulic Excavator',   6, 2),
    (N'LD-201', N'Wheel Loader',          8, 0),
    (N'LD-202', N'Wheel Loader',          4, 0);
GO
-- machine_name and component_name are not bound to the visual; they help a Table visual beside it.
CREATE VIEW dbo.v_bucket_health AS
SELECT machine_key, machine_key AS machine_name, machine_type, component_key, component_name, component_category,
       component_order, status, last_seen_utc, tag_id, wear_pct, alarm_time
FROM dbo.bucket_health
WHERE is_active = 1;
GO
-- Inserts one machine's components, all OK. Keys: <machine>-T01.., -L01.., -W01..
CREATE OR ALTER PROCEDURE dbo.bh_add_machine
    @machine nvarchar(50), @teeth int, @lips int = NULL, @wings int = 0,
    @type nvarchar(100) = N'Hydraulic Excavator', @active bit = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @now datetime2(0) = SYSUTCDATETIME();
    SET @lips = ISNULL(@lips, @teeth - 1);
    WITH n AS (SELECT TOP (40) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS int) AS i FROM sys.all_objects),
    parts AS (
        SELECT N'tooth' AS cat, N'T' AS code, N'Tooth ' AS label, i FROM n WHERE i <= @teeth
        UNION ALL SELECT N'lipShroud', N'L', N'Lip shroud ', i FROM n WHERE i <= @lips
        UNION ALL SELECT N'wingShroud', N'W', N'Wing shroud ', i FROM n WHERE i <= @wings
    )
    INSERT INTO dbo.bucket_health (machine_key, machine_type, component_key, component_name, component_category,
                                   component_order, status, last_seen_utc, alarm_time, tag_id, wear_pct, is_active)
    SELECT @machine, @type, CONCAT(@machine, N'-', code, RIGHT(CONCAT(N'0', i), 2)), CONCAT(label, i), cat, i, N'OK',
           @now, NULL, CONCAT(N'TAG-', @machine, N'-', code, RIGHT(CONCAT(N'0', i), 2)),
           20 + ABS(CHECKSUM(@machine, code, i)) % 70, @active
    FROM parts;
END;
GO
CREATE OR ALTER PROCEDURE dbo.bh_reset AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.bucket_health;
    DECLARE @m nvarchar(50), @t nvarchar(100), @teeth int, @wings int;
    DECLARE fleet CURSOR LOCAL FAST_FORWARD FOR SELECT machine_key, machine_type, teeth, wings FROM dbo.bh_fleet;
    OPEN fleet;
    FETCH NEXT FROM fleet INTO @m, @t, @teeth, @wings;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.bh_add_machine @m, @teeth, NULL, @wings, @t;
        FETCH NEXT FROM fleet INTO @m, @t, @teeth, @wings;
    END;
    CLOSE fleet;
    DEALLOCATE fleet;

    -- Hidden extras (is_active = 0) that tests and the showcase switch on:
    -- EX-190: 6 teeth but only 3 lip shrouds, and tooth 4 has the unknown status 'Broken'.
    EXEC dbo.bh_add_machine N'EX-190', 6, 3, 0, N'Hydraulic Excavator', 0;
    UPDATE dbo.bucket_health SET status = N'Broken' WHERE component_key = N'EX-190-T04';
    -- A row with no machine at all.
    INSERT INTO dbo.bucket_health (machine_key, machine_type, component_key, component_name, component_category,
                                   component_order, status, last_seen_utc, alarm_time, tag_id, wear_pct, is_active)
    VALUES (NULL, NULL, N'ORPHAN-T01', N'Tooth 1', N'tooth', 1, N'OK', SYSUTCDATETIME(), NULL, N'TAG-ORPHAN-T01', 50, 0);
END;
GO
-- New alarm (@new_alarm = 1, default): alarm time = now, so it is a new alarm id and beeps.
-- Same alarm (@new_alarm = 0): keeps the component's previous alarm time, so it stays silent.
CREATE OR ALTER PROCEDURE dbo.bh_alarm
    @machine nvarchar(50), @category nvarchar(20), @order int,
    @status nvarchar(40) = N'Proximity Alarm', @new_alarm bit = 1
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.bucket_health
    SET status = @status,
        alarm_time = CASE WHEN @new_alarm = 1 OR alarm_time IS NULL THEN SYSUTCDATETIME() ELSE alarm_time END,
        last_seen_utc = SYSUTCDATETIME()
    WHERE machine_key = @machine AND component_category = @category AND component_order = @order;
    IF @@ROWCOUNT = 0 RAISERROR(N'No such component.', 16, 1);
END;
GO
-- Any status string. The alarm time is kept on purpose (bh_alarm ... 0 re-uses it).
CREATE OR ALTER PROCEDURE dbo.bh_set
    @machine nvarchar(50), @category nvarchar(20), @order int, @status nvarchar(40)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.bucket_health SET status = @status, last_seen_utc = SYSUTCDATETIME()
    WHERE machine_key = @machine AND component_category = @category AND component_order = @order;
    IF @@ROWCOUNT = 0 RAISERROR(N'No such component.', 16, 1);
END;
GO
CREATE OR ALTER PROCEDURE dbo.bh_clear_alarms AS
    UPDATE dbo.bucket_health SET status = N'OK', last_seen_utc = SYSUTCDATETIME()
    WHERE status IN (N'Proximity Alarm', N'Movement Alarm');
GO
CREATE OR ALTER PROCEDURE dbo.bh_touch AS
    UPDATE dbo.bucket_health SET last_seen_utc = SYSUTCDATETIME() WHERE is_active = 1;
GO
-- One raw row, for data-error cases (unknown category or status, blank component, order 0, duplicates).
CREATE OR ALTER PROCEDURE dbo.bh_add_row
    @machine nvarchar(50), @component nvarchar(50), @category nvarchar(20), @order int,
    @status nvarchar(40) = N'OK', @type nvarchar(100) = N'Hydraulic Excavator'
AS
    INSERT INTO dbo.bucket_health (machine_key, machine_type, component_key, component_name, component_category,
                                   component_order, status, last_seen_utc, alarm_time, tag_id, wear_pct, is_active)
    VALUES (@machine, @type, @component, @component, @category, @order, @status, SYSUTCDATETIME(), NULL, NULL, NULL, 1);
GO
CREATE OR ALTER PROCEDURE dbo.bh_remove_machine @machine nvarchar(50) AS
    DELETE FROM dbo.bucket_health WHERE machine_key = @machine;
GO
-- @count machines BK-01.. with 20 teeth, 19 lip shrouds and 8 wing shrouds (47 rows each).
CREATE OR ALTER PROCEDURE dbo.bh_bulk @count int AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @i int = 1, @m nvarchar(50);
    WHILE @i <= @count
    BEGIN
        SET @m = CONCAT(N'BK-', RIGHT(CONCAT(N'0', @i), 2));
        EXEC dbo.bh_add_machine @m, 20, 19, 8;
        SET @i += 1;
    END;
END;
GO
EXEC dbo.bh_reset;
GO
