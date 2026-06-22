const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const { parseDataView } = require("../../.tmp/test-build/src/data/parseDataView");

const roleByHeader = {
    machine_key: "machine",
    machine_type: "machineType",
    component_key: "component",
    component_category: "category",
    component_order: "order",
    status: "status",
    last_seen_utc: "lastSeen",
    tag_id: "tooltipFields"
};

function csvFixtureDataView() {
    const text = fs.readFileSync("test/fixtures/bucket_health_components.csv", "utf8").trim();
    const [headerLine, ...lines] = text.split(/\r?\n/);
    const headers = headerLine.split(",");
    const columns = headers.map((header) => ({
        displayName: header,
        roles: roleByHeader[header] ? { [roleByHeader[header]]: true } : {}
    }));
    const rows = lines.map((line) => line.split(","));

    return {
        table: {
            columns,
            rows
        }
    };
}

function componentRow(machine, component, category, order, status) {
    return [machine, "Hydraulic Excavator", component, category, order, status, "2026-06-21T11:00:00Z", `TAG-${component}`];
}

function dataViewFromRows(rows, includeRoles = roleByHeader) {
    const headers = ["machine_key", "machine_type", "component_key", "component_category", "component_order", "status", "last_seen_utc", "tag_id"];

    return {
        table: {
            columns: headers.map((header) => ({
                displayName: header,
                roles: includeRoles[header] ? { [includeRoles[header]]: true } : {}
            })),
            rows
        }
    };
}

test("parseDataView returns noFields when no table data exists", () => {
    const model = parseDataView(undefined);

    assert.equal(model.state, "noFields");
    assert.deepEqual(model.missingRoles, ["machine", "component", "category", "order", "status"]);
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
    assert.equal(model.machines.length, 4);

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
    assert.equal(machine.teeth[4].status, "prox");
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

test("parseDataView rejects missing lip shroud rows", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", "1", "OK"),
        componentRow("EX-1", "T2", "tooth", "2", "OK"),
        componentRow("EX-1", "T3", "tooth", "3", "OK"),
        componentRow("EX-1", "T4", "tooth", "4", "OK")
    ];
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "error");
    assert.match(model.errors.join("\n"), /has 0 lip shrouds; expected 3/);
});

test("parseDataView rejects unsupported statuses and categories", () => {
    const rows = [
        componentRow("EX-1", "T1", "tooth", "1", "Offline"),
        componentRow("EX-1", "X1", "adapter", "1", "OK")
    ];
    const model = parseDataView(dataViewFromRows(rows));

    assert.equal(model.state, "error");
    assert.match(model.errors.join("\n"), /status 'Offline' is not supported/);
    assert.match(model.errors.join("\n"), /category 'adapter' is not supported/);
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
