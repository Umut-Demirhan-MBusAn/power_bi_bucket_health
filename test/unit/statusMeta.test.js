const test = require("node:test");
const assert = require("node:assert/strict");

const { machineStatusKey } = require("../../.tmp/test-build/src/domain/statusMeta");

test("machineStatusKey returns alarm when any component alarms", () => {
    assert.equal(machineStatusKey(["ok", "nodata", "prox"]), "prox");
    assert.equal(machineStatusKey(["ok", "move", "prox"]), "move");
    // movement outranks proximity regardless of order
    assert.equal(machineStatusKey(["prox", "move"]), "move");
    // an alarm wins even if every other component is no-data
    assert.equal(machineStatusKey(["nodata", "nodata", "prox"]), "prox");
});

test("machineStatusKey returns nodata only when every component is no-data or lockout+no-data", () => {
    assert.equal(machineStatusKey(["nodata", "nodata"]), "nodata");
    assert.equal(machineStatusKey(["lockoutnd", "lockoutnd"]), "nodata");
    assert.equal(machineStatusKey(["nodata", "lockoutnd"]), "nodata");
});

test("machineStatusKey returns ok otherwise", () => {
    assert.equal(machineStatusKey(["ok", "ok"]), "ok");
    // a single ok among no-data breaks the all-no-data rule
    assert.equal(machineStatusKey(["nodata", "ok"]), "ok");
    // plain lockout (without no-data) is not a no-data machine
    assert.equal(machineStatusKey(["lockout", "lockout"]), "ok");
    assert.equal(machineStatusKey(["lockout", "nodata"]), "ok");
    // no components at all
    assert.equal(machineStatusKey([]), "ok");
});
