const test = require("node:test");
const assert = require("node:assert/strict");

const { AlarmController, buildComponentId, collectComponentStatuses } = require("../../.tmp/test-build/src/audio/alarmController");

function comp(componentKey, status, alarmTime) {
    return { machineKey: "M", componentKey, category: "tooth", order: 1, status, alarmTime, tooltipFields: [], sourceOrder: 1 };
}

function machine(key, components) {
    return { key, name: key, teeth: components, lipShrouds: [], wingShroudsLeft: [], wingShroudsRight: [], alarmCount: 0, hasAlarm: false, sourceOrder: 0 };
}

function model(machines, state = "ready") {
    return { state, machines, missingRoles: [], errors: [] };
}

function playingController() {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    assert.equal(audio.isPlaying(), true);
    return { audio, c };
}

function fakeAudio() {
    return {
        starts: 0,
        dismisses: 0,
        playing: false,
        start() { this.starts++; this.playing = true; },
        dismiss() { this.dismisses++; this.playing = false; },
        isPlaying() { return this.playing; },
        destroy() {},
        arm() {}
    };
}

test("buildComponentId combines machine and component", () => {
    assert.equal(buildComponentId("M1", "C1"), JSON.stringify(["M1", "C1"]));
});

test("collectComponentStatuses records every component's status, alarm or not", () => {
    const statuses = collectComponentStatuses([machine("M", [comp("T1", "ok", "t"), comp("T2", "prox", "t1"), comp("T3", "move", "t2")])]);
    assert.equal(statuses.size, 3);
    assert.equal(statuses.get(buildComponentId("M", "T1")), "ok");
    assert.equal(statuses.get(buildComponentId("M", "T2")), "prox");
    assert.equal(statuses.get(buildComponentId("M", "T3")), "move");
});

test("first update seeds without firing audio", () => {
    const audio = fakeAudio();
    new AlarmController(audio).update(model([machine("M", [comp("T2", "prox", "t1")])]), true);
    assert.equal(audio.starts, 0);
});

test("the same alarm on an identical record does not fire twice", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    assert.equal(audio.starts, 1);
});

test("one alarm reported every 30 s for 3 minutes with a new alarm time on each record fires once", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    for (let i = 0; i < 6; i++) {
        const time = new Date(Date.UTC(2026, 10, 16, 10, 0, i * 30)).toISOString();
        c.update(model([machine("M", [comp("T1", "prox", time)])]), true);
    }
    assert.equal(audio.starts, 1);
});

test("a change from one alarm type to another fires again", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "move", "t2")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t3")])]), true);
    assert.equal(audio.starts, 3);
});

test("an alarm that clears and comes back fires again", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "move", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "move", "t1")])]), true);
    assert.equal(audio.starts, 2);
});

test("a change between non-alarm statuses never fires", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "lockout", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "nodata", undefined)])]), true);
    assert.equal(audio.starts, 0);
});

test("an alarm already present when the visual opens stays silent while it persists", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "move", "t1")])]), true);
    c.update(model([machine("M", [comp("T1", "move", "t2")])]), true);
    assert.equal(audio.starts, 0);
});

test("a component missing from a refresh keeps its last status, so its ongoing alarm does not re-fire", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined), comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1"), comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t3"), comp("T2", "ok", undefined)])]), true);
    assert.equal(audio.starts, 1);
});

test("a component first seen after the opening render fires when it is alarming", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "ok", undefined), comp("T2", "move", "t1")])]), true);
    assert.equal(audio.starts, 1);
});

test("an edge state between records does not reset the last statuses", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([], "noData"), true);
    c.update(model([machine("M", [comp("T1", "prox", "t2")])]), true);
    assert.equal(audio.starts, 1);
});

test("duplicate rows for one component resolve to the alarm status whatever their order", () => {
    const alarmLast = collectComponentStatuses([machine("M", [comp("T1", "ok", undefined), comp("T1", "prox", "t1")])]);
    const alarmFirst = collectComponentStatuses([machine("M", [comp("T1", "prox", "t1"), comp("T1", "ok", undefined)])]);
    assert.equal(alarmLast.get(buildComponentId("M", "T1")), "prox");
    assert.equal(alarmFirst.get(buildComponentId("M", "T1")), "prox");
});

test("an edge state before the first ready render does not seed, so the first ready render stays silent", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([], "noFields"), true);
    c.update(model([machine("M", [comp("T1", "move", "t1")])]), true);
    assert.equal(audio.starts, 0);
});

test("an error update with audio off does not reset the last statuses", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.update(model([], "error"), false);
    c.update(model([machine("M", [comp("T1", "prox", "t2")])]), true);
    assert.equal(audio.starts, 1);
});

test("a component that drops out and returns with the other alarm type fires", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined), comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1"), comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "move", "t2"), comp("T2", "ok", undefined)])]), true);
    assert.equal(audio.starts, 2);
});

test("several transitions in one update start the sound once", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", undefined), comp("T2", "ok", undefined)])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1"), comp("T2", "move", "t1")])]), true);
    assert.equal(audio.starts, 1);
});

test("dismissed alarm does not re-fire while it persists", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), true);
    c.dismiss();
    c.update(model([machine("M", [comp("T1", "prox", "t2")])]), true);
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

test("turning audio off while the alarm sounds stops it", () => {
    const { audio, c } = playingController();
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), false);
    assert.equal(audio.dismisses, 1);
    assert.equal(audio.isPlaying(), false);
});

["noData", "error", "invalidConfig", "noFields"].forEach((state) => {
    test(`an edge state (${state}) while the alarm sounds stops it`, () => {
        const { audio, c } = playingController();
        c.update(model([], state), true);
        assert.equal(audio.dismisses, 1);
    });
});

test("nothing is stopped while no alarm is sounding", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), false);
    c.update(model([], "noData"), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), false);
    assert.equal(audio.dismisses, 0);
});

test("an alarm that arrived while audio was off does not beep once audio is back on", () => {
    const audio = fakeAudio();
    const c = new AlarmController(audio);
    c.update(model([machine("M", [comp("T1", "ok", "t")])]), true);
    c.update(model([machine("M", [comp("T1", "prox", "t1")])]), false);
    c.update(model([machine("M", [comp("T1", "prox", "t2")])]), true);
    assert.equal(audio.starts, 0);
});
