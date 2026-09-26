const test = require("node:test");
const assert = require("node:assert/strict");

const { isAlarmStatus, normalizeStatus } = require("../../.tmp/test-build/src/data/normalizeStatus");

test("normalizeStatus maps approved source values to canonical keys", () => {
    assert.equal(normalizeStatus("OK"), "ok");
    assert.equal(normalizeStatus("No data (1h)"), "nodata");
    assert.equal(normalizeStatus("Lockout"), "lockout");
    assert.equal(normalizeStatus("Lockout + No data"), "lockoutnd");
    assert.equal(normalizeStatus("Proximity alarm"), "prox");
    assert.equal(normalizeStatus("Movement alarm"), "move");
});

test("normalizeStatus tolerates casing and surrounding spaces", () => {
    assert.equal(normalizeStatus("  proximity ALARM "), "prox");
    assert.equal(normalizeStatus("movement"), "move");
});

test("normalizeStatus tolerates missing/extra space around '+'", () => {
    assert.equal(normalizeStatus("Lockout +No Data"), "lockoutnd");
    assert.equal(normalizeStatus("Lockout+ No Data"), "lockoutnd");
    assert.equal(normalizeStatus("Lockout+No Data"), "lockoutnd");
});

test("normalizeStatus inserts a space before '(' when the source omits it", () => {
    assert.equal(normalizeStatus("No Data(1h)"), "nodata");
});

test("normalizeStatus collapses runs of internal whitespace", () => {
    assert.equal(normalizeStatus("  proximity   alarm "), "prox");
});

test("normalizeStatus rejects unknown or empty values", () => {
    assert.equal(normalizeStatus("offline"), undefined);
    assert.equal(normalizeStatus(""), undefined);
    assert.equal(normalizeStatus(null), undefined);
});

test("isAlarmStatus only treats proximity and movement as alarms", () => {
    assert.equal(isAlarmStatus("prox"), true);
    assert.equal(isAlarmStatus("move"), true);
    assert.equal(isAlarmStatus("ok"), false);
    assert.equal(isAlarmStatus("nodata"), false);
    assert.equal(isAlarmStatus("lockout"), false);
    assert.equal(isAlarmStatus("lockoutnd"), false);
});
