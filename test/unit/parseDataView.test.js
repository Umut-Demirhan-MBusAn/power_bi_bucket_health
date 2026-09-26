const test = require("node:test");
const assert = require("node:assert/strict");

const { parseDataView } = require("../../.tmp/test-build/src/data/parseDataView");
const { collectAlarmIds, buildAlarmId } = require("../../.tmp/test-build/src/audio/alarmController");
const { fixtureDataView: csvFixtureDataView, ROLE_BY_HEADER: roleByHeader } = require("../helpers/mockHost");

function componentRow(machine, component, category, order, status) {
    return [machine, "Hydraulic Excavator", component, category, order, status, "2026-06-21T11:00:00Z", `TAG-${component}`];
}

function dataViewFromRows(rows, includeRoles = roleByHeader, segment) {
    const headers = ["machine_key", "machine_type", "component_key", "component_category", "component_order", "status", "last_seen_utc", "tag_id"];

    const dataView = {
        table: {
            columns: headers.map((header) => ({
                displayName: header,
                roles: includeRoles[header] ? { [includeRoles[header]]: true } : {}
            })),
            rows
        }
    };

    if (segment !== undefined) {
        dataView.metadata = { segment };
    }

    return dataView;
}

test("parseDataView returns noFields when no table data exists", () => {
    const model = parseDataView(undefined);

    assert.equal(model.state, "noFields");
    assert.deepEqual(model.missingRoles, ["machine", "component", "category", "order", "status"]);
    assert.equal(model.truncated, false);
    assert.deepEqual(model.warnings, []);
});

test("parseDataView returns invalidConfig for missing required roles", () => {
    const roles = { ...roleByHeader };
    delete roles.status;

    const model = parseDataView(dataViewFromRows([], roles));

    assert.equal(model.state, "invalidConfig");
    assert.deepEqual(model.missingRoles, ["status"]);
});

test("parseDataView parses the mock CSV fixture into machine models", () => {
    const model = parseDataView(csvFixtureDataView());

    assert.equal(model.state, "ready");
    assert.equal(model.errors.length, 0);
    assert.deepEqual(model.warnings, []);
    assert.equal(model.truncated, false);
    assert.equal(model.machines.length, 4);
    assert.ok(model.machines.every((machine) => machine.issues.length === 0), "every fixture machine is valid");

    const machine = model.machines.find((item) => item.key === "EX-204");
    assert.ok(machine);
    assert.equal(machine.type, "Hydraulic Excavator");
    assert.equal(machine.teeth.length, 10);
    assert.equal(machine.lipShrouds.length, 9);
    assert.equal(machine.wingShroudsLeft.length, 4);
    assert.equal(machine.wingShroudsRight.length, 4);
    assert.equal(machine.alarmCount, 3);
    assert.equal(machine.hasAlarm, true);
    assert.equal(machine.dominantAlarm, "move");
    assert.equal(machine.incomplete, false);
    assert.equal(machine.teeth[4].status, "prox");
    assert.equal(machine.teeth[4].alarmTime, "2026-06-21T11:32:00Z");
    assert.equal(machine.teeth[0].alarmTime, "");
    assert.equal(machine.lipShrouds[4].status, "prox");
    assert.deepEqual(machine.wingShroudsLeft.map((component) => component.order), [1, 3, 5, 7]);
    assert.deepEqual(machine.wingShroudsRight.map((component) => component.order), [2, 4, 6, 8]);
});

test("parseDataView can derive wing sides with sequential split modes", () => {
    const model = parseDataView(csvFixtureDataView(), "FirstHalfRightSecondHalfLeft");
    const machine = model.machines.find((item) => item.key === "EX-204");

    assert.equal(model.state, "ready");
    assert.ok(machine);
    assert.deepEqual(machine.wingShroudsRight.map((component) => component.order), [1, 2, 3, 4]);
    assert.deepEqual(machine.wingShroudsLeft.map((component) => component.order), [5, 6, 7, 8]);
});

test("parseDataView lays teeth and lip shrouds right-to-left when requested", () => {
    const ltr = parseDataView(csvFixtureDataView(), undefined, "leftToRight").machines.find((item) => item.key === "EX-204");
    const rtl = parseDataView(csvFixtureDataView(), undefined, "rightToLeft").machines.find((item) => item.key === "EX-204");

    assert.deepEqual(rtl.teeth.map((t) => t.order), [...ltr.teeth.map((t) => t.order)].reverse());
    assert.deepEqual(rtl.lipShrouds.map((l) => l.order), [...ltr.lipShrouds.map((l) => l.order)].reverse());
});

test("parseDataView reports a lip-shroud-count issue on the machine instead of failing the whole visual", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", "1", "OK"),
        componentRow("EX-1", "T2", "tooth", "2", "OK"),
        componentRow("EX-1", "T3", "tooth", "3", "OK"),
        componentRow("EX-1", "T4", "tooth", "4", "OK")
    ];
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "ready");
    const machine = model.machines.find((item) => item.key === "EX-1");
    assert.deepEqual(machine.issues, ["0 lip shrouds; expected 3."]);
});

test("parseDataView reports per-row issues for unsupported statuses and categories instead of failing the whole visual", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", "1", "Offline"),
        componentRow("EX-1", "X1", "adapter", "1", "OK")
    ];
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "ready");
    const machine = model.machines.find((item) => item.key === "EX-1");
    // Both rows are rejected, so no count issue is added on top of their own issues.
    assert.deepEqual(machine.issues, [
        "Tooth 1 (T1): status 'Offline' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm.",
        "X1: category 'adapter' is not recognised. Use tooth, lip shroud or wing shroud."
    ]);
});

test("parseDataView sorts alarm machines before non-alarm machines", () => {
    const rows = [
        ["EX-1", "Hydraulic Excavator", "T1", "tooth", "1", "OK", "2026-06-21T11:00:00Z", "TAG-T1"],
        ["EX-1", "Hydraulic Excavator", "T2", "tooth", "2", "OK", "2026-06-21T11:00:00Z", "TAG-T2"],
        ["EX-1", "Hydraulic Excavator", "T3", "tooth", "3", "OK", "2026-06-21T11:00:00Z", "TAG-T3"],
        ["EX-1", "Hydraulic Excavator", "T4", "tooth", "4", "OK", "2026-06-21T11:00:00Z", "TAG-T4"],
        ["EX-1", "Hydraulic Excavator", "L1", "lipShroud", "1", "OK", "2026-06-21T11:00:00Z", "TAG-L1"],
        ["EX-1", "Hydraulic Excavator", "L2", "lipShroud", "2", "OK", "2026-06-21T11:00:00Z", "TAG-L2"],
        ["EX-1", "Hydraulic Excavator", "L3", "lipShroud", "3", "OK", "2026-06-21T11:00:00Z", "TAG-L3"],
        ["EX-2", "Hydraulic Excavator", "T1", "tooth", "1", "Proximity Alarm", "2026-06-21T11:00:00Z", "TAG-T1"],
        ["EX-2", "Hydraulic Excavator", "T2", "tooth", "2", "OK", "2026-06-21T11:00:00Z", "TAG-T2"],
        ["EX-2", "Hydraulic Excavator", "T3", "tooth", "3", "OK", "2026-06-21T11:00:00Z", "TAG-T3"],
        ["EX-2", "Hydraulic Excavator", "T4", "tooth", "4", "OK", "2026-06-21T11:00:00Z", "TAG-T4"],
        ["EX-2", "Hydraulic Excavator", "L1", "lipShroud", "1", "OK", "2026-06-21T11:00:00Z", "TAG-L1"],
        ["EX-2", "Hydraulic Excavator", "L2", "lipShroud", "2", "OK", "2026-06-21T11:00:00Z", "TAG-L2"],
        ["EX-2", "Hydraulic Excavator", "L3", "lipShroud", "3", "OK", "2026-06-21T11:00:00Z", "TAG-L3"]
    ];
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "ready");
    assert.equal(model.machines.length, 2);
    assert.equal(model.machines[0].key, "EX-2");
    assert.equal(model.machines[0].hasAlarm, true);
    assert.equal(model.machines[1].key, "EX-1");
    assert.equal(model.machines[1].hasAlarm, false);
});

test("EX-1 (valid, with a Movement Alarm) sorts before EX-2 (one bad-status row, otherwise valid)", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", 1, "OK"),
        componentRow("EX-1", "T2", "tooth", 2, "OK"),
        componentRow("EX-1", "T3", "tooth", 3, "OK"),
        componentRow("EX-1", "T4", "tooth", 4, "Movement Alarm"),
        componentRow("EX-1", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-1", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-1", "L3", "lipShroud", 3, "OK"),
        componentRow("EX-2", "T1", "tooth", 1, "OK"),
        componentRow("EX-2", "T2", "tooth", 2, "OK"),
        componentRow("EX-2", "T3", "tooth", 3, "OK"),
        componentRow("EX-2", "T4", "tooth", 4, "OK"),
        componentRow("EX-2", "T5", "tooth", 5, "Offline"),
        componentRow("EX-2", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-2", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-2", "L3", "lipShroud", 3, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "ready");
    assert.equal(model.machines.length, 2);

    const ex1 = model.machines.find((m) => m.key === "EX-1");
    const ex2 = model.machines.find((m) => m.key === "EX-2");

    assert.deepEqual(ex1.issues, []);
    assert.deepEqual(ex2.issues, ["Tooth 5 (T5): status 'Offline' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm."]);
    assert.equal(ex2.teeth.length, 4);
    assert.equal(ex2.lipShrouds.length, 3);

    assert.equal(model.machines[0].key, "EX-1", "the alarming (valid) machine sorts first");
});

test("an invalid machine's alarm components still set hasAlarm and are collected for audio", () => {
    const rows = [
        componentRow("EX-9", "T1", "tooth", 1, "OK"),
        componentRow("EX-9", "T2", "tooth", 2, "OK"),
        componentRow("EX-9", "T3", "tooth", 3, "Proximity Alarm"),
        componentRow("EX-9", "T4", "tooth", 4, "OK"),
        componentRow("EX-9", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-9", "L2", "lipShroud", 2, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const machine = model.machines.find((m) => m.key === "EX-9");

    assert.ok(machine.issues.length > 0, "machine has a lip-count issue (2 lip shrouds; expected 3)");
    assert.equal(machine.hasAlarm, true);

    const ids = collectAlarmIds(model.machines);
    assert.ok(ids.has(buildAlarmId("EX-9", "T3", undefined)));
});

test("a machine with one invalid row and a Movement Alarm elsewhere still alarms and is collected for audio", () => {
    const rows = [
        componentRow("EX-MIX", "T1", "tooth", 1, "OK"),
        componentRow("EX-MIX", "T2", "tooth", 2, "OK"),
        componentRow("EX-MIX", "T3", "tooth", 3, "OK"),
        componentRow("EX-MIX", "T4", "tooth", 4, "Movement Alarm"),
        componentRow("EX-MIX", "T5", "tooth", 5, "Offline"),
        componentRow("EX-MIX", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-MIX", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-MIX", "L3", "lipShroud", 3, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const machine = model.machines.find((m) => m.key === "EX-MIX");

    assert.equal(machine.hasAlarm, true);
    assert.equal(machine.dominantAlarm, "move");
    assert.deepEqual(machine.issues, ["Tooth 5 (T5): status 'Offline' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm."]);

    const ids = collectAlarmIds(model.machines);
    assert.ok(ids.has(buildAlarmId("EX-MIX", "T4", undefined)));
});

test("wing side over-assignment: odd orders 1,3,5,7,9 overflow the left side; 1-8 do not", () => {
    const baseline = (machine) => [
        componentRow(machine, "T1", "tooth", 1, "OK"),
        componentRow(machine, "T2", "tooth", 2, "OK"),
        componentRow(machine, "T3", "tooth", 3, "OK"),
        componentRow(machine, "T4", "tooth", 4, "OK"),
        componentRow(machine, "L1", "lipShroud", 1, "OK"),
        componentRow(machine, "L2", "lipShroud", 2, "OK"),
        componentRow(machine, "L3", "lipShroud", 3, "OK")
    ];

    const rows = [
        ...baseline("EX-WING-BAD"),
        ...[1, 3, 5, 7, 9].map((order) => componentRow("EX-WING-BAD", `W${order}`, "wingShroud", order, "OK")),
        ...baseline("EX-WING-OK"),
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((order) => componentRow("EX-WING-OK", `W${order}`, "wingShroud", order, "OK"))
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const bad = model.machines.find((m) => m.key === "EX-WING-BAD");
    const ok = model.machines.find((m) => m.key === "EX-WING-OK");

    assert.deepEqual(bad.issues, ["5 wing shrouds on the left side; maximum is 4 per side."]);
    assert.deepEqual(ok.issues, []);
});

test("0 teeth reports only the teeth-count issue, never a nonsensical lip-count issue", () => {
    const rows = [
        componentRow("EX-Z", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-Z", "L2", "lipShroud", 2, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const machine = model.machines.find((m) => m.key === "EX-Z");

    assert.deepEqual(machine.issues, ["0 teeth; supported range is 4–20."]);
});

test("issues are capped at 20 with a summary line for the rest", () => {
    const baseline = [
        componentRow("EX-BAD", "T1", "tooth", 1, "OK"),
        componentRow("EX-BAD", "T2", "tooth", 2, "OK"),
        componentRow("EX-BAD", "T3", "tooth", 3, "OK"),
        componentRow("EX-BAD", "T4", "tooth", 4, "OK"),
        componentRow("EX-BAD", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-BAD", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-BAD", "L3", "lipShroud", 3, "OK")
    ];
    const badRows = Array.from({ length: 25 }, (_, i) => componentRow("EX-BAD", `X${i + 1}`, "adapter", i + 1, "OK"));

    const model = parseDataView(dataViewFromRows([...baseline, ...badRows]));
    const machine = model.machines.find((m) => m.key === "EX-BAD");

    assert.equal(machine.issues.length, 21);
    assert.equal(machine.issues[20], "…and 5 more.");
});

test("machine-level issues sort before row issues, so the cap never hides the Incomplete flag", () => {
    // A single machine with 25 bad rows and no segment cutoff would just be 25 row issues, capped
    // to 20 plus a summary. Adding a truncating segment makes this (the only) machine "incomplete"
    // too -- that machine-level issue must still land at issues[0], ahead of all 25 row issues,
    // proving machine-level issues are placed first before capping rather than appended at the end.
    const badRows = Array.from({ length: 25 }, (_, i) => componentRow("EX-BAD", `X${i + 1}`, "adapter", i + 1, "OK"));

    const model = parseDataView(dataViewFromRows(badRows, undefined, {}));
    const machine = model.machines.find((m) => m.key === "EX-BAD");

    assert.equal(model.truncated, true);
    assert.equal(machine.incomplete, true);
    assert.equal(machine.issues[0], "Incomplete — the 2,000-row limit was reached.");
    assert.equal(machine.issues.length, 21);
    assert.equal(machine.issues[20], "…and 6 more.");
});

test("truncated segment marks the last-first-seen machine incomplete; others stay valid", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", 1, "OK"),
        componentRow("EX-1", "T2", "tooth", 2, "OK"),
        componentRow("EX-1", "T3", "tooth", 3, "OK"),
        componentRow("EX-1", "T4", "tooth", 4, "OK"),
        componentRow("EX-1", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-1", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-1", "L3", "lipShroud", 3, "OK"),
        // EX-2 is actually cut short by the row cap: 2 teeth and 0 lip shrouds would normally raise
        // only the teeth-count issue ("2 teeth; supported range...") -- the lip-count check is
        // skipped when teeth are out of range -- so asserting only the Incomplete issue below
        // proves that check is replaced, not just silently absent because the count happened to be
        // fine.
        componentRow("EX-2", "T1", "tooth", 1, "OK"),
        componentRow("EX-2", "T2", "tooth", 2, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows, undefined, {}));

    assert.equal(model.truncated, true);
    const ex1 = model.machines.find((m) => m.key === "EX-1");
    const ex2 = model.machines.find((m) => m.key === "EX-2");

    assert.equal(ex1.incomplete, false);
    assert.deepEqual(ex1.issues, []);
    assert.equal(ex2.incomplete, true);
    assert.deepEqual(ex2.issues, ["Incomplete — the 2,000-row limit was reached."]);
});

test("no segment metadata means not truncated even at exactly 2000 rows", () => {
    const rows = Array.from({ length: 2000 }, (_, i) => componentRow("EX-BULK", `T${i}`, "tooth", 1, "OK"));
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.truncated, false);
});

test("category matching accepts spacing/case/synonym variants and rejects unknown values", () => {
    const rows = [
        componentRow("EX-CAT", "T1", "Tooth", 1, "OK"),
        componentRow("EX-CAT", "T2", "TEETH", 2, "OK"),
        componentRow("EX-CAT", "L1", " lip shroud ", 1, "OK"),
        componentRow("EX-CAT", "W1", "Wing_Shroud", 1, "OK"),
        componentRow("EX-CAT", "X1", "bucket", 1, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const machine = model.machines.find((m) => m.key === "EX-CAT");

    assert.equal(machine.teeth.length, 2);
    assert.equal(machine.lipShrouds.length, 1);
    assert.equal(machine.wingShroudsLeft.length + machine.wingShroudsRight.length, 1);

    const issueText = machine.issues.join("\n");
    assert.match(issueText, /^X1: category 'bucket' is not recognised\. Use tooth, lip shroud or wing shroud\.$/m);
    assert.doesNotMatch(issueText, /category 'Tooth'/);
    assert.doesNotMatch(issueText, /category 'TEETH'/);
    assert.doesNotMatch(issueText, /category ' lip shroud '/);
    assert.doesNotMatch(issueText, /category 'Wing_Shroud'/);
});

test("order accepts finite integers (numeric or numeric-string) >= 1 and rejects everything else", () => {
    const row = (component, orderValue) =>
        ["EX-ORDER", "Hydraulic Excavator", component, "tooth", orderValue, "OK", "2026-06-21T11:00:00Z", `TAG-${component}`];

    const rows = [
        row("T1", true),
        row("T2", new Date()),
        row("T3", "0x3"),
        row("T4", "1.5"),
        row("T5", 0),
        row("T6", -1),
        row("T7", " 3 ")
    ];

    const model = parseDataView(dataViewFromRows(rows));
    const machine = model.machines.find((m) => m.key === "EX-ORDER");

    assert.equal(machine.teeth.length, 1);
    assert.equal(machine.teeth[0].componentKey, "T7");
    assert.equal(machine.teeth[0].order, 3);

    const orderIssues = machine.issues.filter((issue) => issue.includes("must be a whole number"));
    assert.equal(orderIssues.length, 6);
    assert.ok(orderIssues.includes("T1: order 'true' must be a whole number, starting at 1."));
    assert.ok(orderIssues.includes("T3: order '0x3' must be a whole number, starting at 1."));
    assert.ok(orderIssues.includes("T4: order '1.5' must be a whole number, starting at 1."));
    assert.ok(orderIssues.includes("T5: order '0' must be a whole number, starting at 1."));
    assert.ok(orderIssues.includes("T6: order '-1' must be a whole number, starting at 1."));
});

test("rows with a blank machine are skipped and counted into one fleet warning; other machines still render", () => {
    const rows = [
        ["", "Hydraulic Excavator", "T1", "tooth", 1, "OK", "2026-06-21T11:00:00Z", "TAG-T1"],
        ["   ", "Hydraulic Excavator", "T2", "tooth", 2, "OK", "2026-06-21T11:00:00Z", "TAG-T2"],
        componentRow("EX-1", "T1", "tooth", 1, "OK"),
        componentRow("EX-1", "T2", "tooth", 2, "OK"),
        componentRow("EX-1", "T3", "tooth", 3, "OK"),
        componentRow("EX-1", "T4", "tooth", 4, "OK"),
        componentRow("EX-1", "L1", "lipShroud", 1, "OK"),
        componentRow("EX-1", "L2", "lipShroud", 2, "OK"),
        componentRow("EX-1", "L3", "lipShroud", 3, "OK")
    ];

    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "ready");
    assert.deepEqual(model.warnings, ["2 rows have no machine and are not shown."]);
    const ex1 = model.machines.find((m) => m.key === "EX-1");
    assert.ok(ex1);
    assert.deepEqual(ex1.issues, []);
});

test("when every row has a blank machine, the model errors using the fleet warning as the error", () => {
    const rows = [
        ["", "Hydraulic Excavator", "T1", "tooth", 1, "OK", "2026-06-21T11:00:00Z", "TAG-T1"],
        ["", "Hydraulic Excavator", "T2", "tooth", 2, "OK", "2026-06-21T11:00:00Z", "TAG-T2"]
    ];

    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "error");
    assert.deepEqual(model.errors, ["2 rows have no machine and are not shown."]);
    assert.deepEqual(model.machines, []);
});

test("one blank-machine row uses the singular warning", () => {
    const rows = [
        ["", "Hydraulic Excavator", "T1", "tooth", 1, "OK", "2026-06-21T11:00:00Z", "TAG-T1"],
        componentRow("EX-1", "T1", "tooth", 1, "OK")
    ];

    assert.deepEqual(parseDataView(dataViewFromRows(rows)).warnings, ["1 row has no machine and is not shown."]);
});

const BROKEN_T04 = "Tooth 4 (EX-107-T04): status 'Broken' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm.";

function ex107Rows(t04Status, lipCount = 4) {
    return [
        ...[1, 2, 3, 5].map((order) => componentRow("EX-107", `EX-107-T0${order}`, "tooth", order, "OK")),
        componentRow("EX-107", "EX-107-T04", "tooth", 4, t04Status),
        ...Array.from({ length: lipCount }, (_, i) => componentRow("EX-107", `EX-107-L0${i + 1}`, "lipShroud", i + 1, "OK"))
    ];
}

test("a rejected row is reported on its own, without a lip-count issue blaming valid lip shrouds", () => {
    const machine = parseDataView(dataViewFromRows(ex107Rows("Broken"))).machines.find((m) => m.key === "EX-107");

    assert.deepEqual(machine.issues, [BROKEN_T04]);
    assert.equal(machine.teeth.length, 4, "the header counts only the valid components");
});

test("without a rejected row the same machine still gets its lip-count issue", () => {
    const machine = parseDataView(dataViewFromRows(ex107Rows("OK", 3))).machines.find((m) => m.key === "EX-107");

    assert.deepEqual(machine.issues, ["3 lip shrouds; expected 4."]);
});

test("a rejected row does not hide the teeth or wing upper limits, which it can only lower", () => {
    const rows = [
        ...Array.from({ length: 21 }, (_, i) => componentRow("EX-BIG", `T${i + 1}`, "tooth", i + 1, "OK")),
        ...[1, 3, 5, 7, 9].map((order) => componentRow("EX-BIG", `W${order}`, "wingShroud", order, "OK")),
        componentRow("EX-BIG", "T22", "tooth", 22, "Broken")
    ];

    const machine = parseDataView(dataViewFromRows(rows)).machines.find((m) => m.key === "EX-BIG");

    assert.deepEqual(machine.issues, [
        "21 teeth; supported range is 4–20.",
        "5 wing shrouds on the left side; maximum is 4 per side.",
        "Tooth 22 (T22): status 'Broken' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm."
    ]);
});

test("an incomplete machine with a rejected row shows the Incomplete issue and the row issue only", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", 1, "OK"),
        componentRow("EX-2", "T1", "tooth", 1, "OK"),
        componentRow("EX-2", "T2", "tooth", 2, "Broken")
    ];

    const ex2 = parseDataView(dataViewFromRows(rows, undefined, {})).machines.find((m) => m.key === "EX-2");

    assert.deepEqual(ex2.issues, [
        "Incomplete — the 2,000-row limit was reached.",
        "Tooth 2 (T2): status 'Broken' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm."
    ]);
});

test("row issues name the component instead of a row position", () => {
    const rows = [
        componentRow("EX-N", "", "tooth", 1, "OK"),
        componentRow("EX-N", "", "adapter", 2, "OK"),
        componentRow("EX-N", "T2", "tooth", 2, ""),
        componentRow("EX-N", "T3", "tooth", "", "OK"),
        componentRow("EX-N", "", "lip shroud", "x", "Offline")
    ];

    const machine = parseDataView(dataViewFromRows(rows)).machines.find((m) => m.key === "EX-N");

    assert.deepEqual(machine.issues, [
        "A tooth row has no component name.",
        "A row has no component name.",
        "A row: category 'adapter' is not recognised. Use tooth, lip shroud or wing shroud.",
        "Tooth 2 (T2): status is blank. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm.",
        "T3: order is blank; it must be a whole number, starting at 1.",
        "A lip shroud row has no component name.",
        "A lip shroud row: status 'Offline' is not recognised. Use OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm.",
        "A lip shroud row: order 'x' must be a whole number, starting at 1."
    ]);
    assert.ok(machine.issues.every((issue) => !/\bRow \d/.test(issue)));
});
