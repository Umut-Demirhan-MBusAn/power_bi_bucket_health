const test = require("node:test");
const assert = require("node:assert/strict");

const { AlarmController, buildAlarmId, collectAlarmIds } = require("../../.tmp/test-build/src/audio/alarmController");

function comp(componentKey, status, alarmTime) {
    return { machineKey: "M", componentKey, category: "tooth", order: 1, status, alarmTime, tooltipFields: [], sourceOrder: 1 };
}

function machine(key, components) {
    return { key, name: key, teeth: components, lipShrouds: [], wingShroudsLeft: [], wingShroudsRight: [], alarmCount: 0, hasAlarm: false, sourceOrder: 0 };
}

function model(machines) {
    return { state: "ready", machines, missingRoles: [], errors: [] };
}

function fakeAudio() {
    return { starts: 0, dismisses: 0, start() { this.starts++; }, dismiss() { this.dismisses++; }, destroy() {}, arm() {} };
}

test("buildAlarmId combines machine, component, and time", () => {
    assert.equal(buildAlarmId("M1", "C1", "2026-06-23T10:00:00Z"), "M1|#|C1|#|2026-06-23T10:00:00Z");
    assert.equal(buildAlarmId("M1", "C1", undefined), "M1|#|C1|#|");
});

test("collectAlarmIds only includes alarm-status components", () => {
    const ids = collectAlarmIds([machine("M", [comp("T1", "ok", "t"), comp("T2", "prox", "t1"), comp("T3", "move", "t2")])]);
    assert.equal(ids.size, 2);
    assert.ok(ids.has("M|#|T2|#|t1"));
    assert.ok(ids.has("M|#|T3|#|t2"));
});

test("first update seeds without firing audio", () => {
    const audio = fakeAudio();
    new AlarmController(audio).update(model([machine("M", [comp("T2", "prox", "t1")])]), true);
    assert.equal(audio.starts, 0);
});

test("same alarm id does not fire twice", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    assert.equal(audio.starts, 1);
});

test("a new alarm time fires again", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t2")])]), true);
    assert.equal(audio.starts, 2);
});

test("dismissed alarm does not re-fire", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.dismiss();
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    assert.equal(audio.starts, 1);
    assert.equal(audio.dismisses, 1);
});

test("audioEnabled false never fires", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), false);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), false);
    assert.equal(audio.starts, 0);
});
