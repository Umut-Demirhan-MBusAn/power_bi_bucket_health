"use strict";

const {
    installDom,
    installFakeAudioContext,
    createMockHost,
    fixtureDataView
} = require("../helpers/mockHost");

// installDom()/installFakeAudioContext() must run before requiring the compiled visual: the
// module constructs DOM nodes at class-construction time and its AlarmAudio dependency reaches
// for a global AudioContext the first time an alarm is armed/started.
installDom();
installFakeAudioContext();

const test = require("node:test");
const assert = require("node:assert/strict");

const { Visual } = require("../../.tmp/test-build/src/visual");

function makeVisual(host) {
    const element = document.createElement("div");
    // Attached to the live document so focus()/document.activeElement behave as they would for
    // the real host-mounted visual (a detached element cannot become document.activeElement).
    document.body.appendChild(element);
    const visual = new Visual({ element, host });
    return { visual, element };
}

test("constructor adds the bucket-health-root class to the target element", () => {
    const host = createMockHost();
    const { element } = makeVisual(host);

    assert.ok(element.classList.contains("bucket-health-root"));
});

test("update with no dataViews renders the edge state and fires start+finish exactly once", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);

    visual.update({ dataViews: [], type: 2 });

    assert.ok(element.querySelector(".bucket-health-state"), "edge/landing state container rendered");
    assert.equal(host.eventService.renderingStarted.mock.calls.length, 1);
    assert.equal(host.eventService.renderingFinished.mock.calls.length, 1);
    assert.equal(host.eventService.renderingFailed.mock.calls.length, 0);
});

test("update with the CSV fixture renders one card per distinct machine and fires renderingFinished", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    const dataView = fixtureDataView();

    visual.update({ dataViews: [dataView], type: 2 });

    const machineIdx = dataView.table.columns.map((c) => c.displayName).indexOf("machine_key");
    const distinctMachines = new Set(dataView.table.rows.map((row) => row[machineIdx]));

    const cards = element.querySelectorAll(".bucket-health-card");
    assert.equal(cards.length, distinctMachines.size);
    assert.equal(host.eventService.renderingFinished.mock.calls.length, 1);
});

test("a ready-path render that throws calls renderingFailed and does not throw out of update()", () => {
    // The getter throws only on its first access (the ready-path theme read). If it kept
    // throwing, the catch block's own fallback render (which also reads colorPalette) would
    // throw again and escape update() uncaught -- this models a one-shot render failure instead.
    let accessCount = 0;
    const host = createMockHost({
        get colorPalette() {
            accessCount += 1;
            if (accessCount === 1) {
                throw new Error("colorPalette unavailable");
            }
            return {
                isHighContrast: false,
                foreground: { value: "#ffffff" },
                background: { value: "#000000" },
                foregroundSelected: { value: "#ff0000" }
            };
        }
    });
    const { visual } = makeVisual(host);

    assert.doesNotThrow(() => visual.update({ dataViews: [fixtureDataView()], type: 2 }));
    assert.equal(host.eventService.renderingFailed.mock.calls.length, 1);
});

test("clicking a component element selects the selection id built for that row", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    const dataView = fixtureDataView();

    visual.update({ dataViews: [dataView], type: 2 });

    const headers = dataView.table.columns.map((c) => c.displayName);
    const machineIdx = headers.indexOf("machine_key");
    const componentIdx = headers.indexOf("component_key");

    const componentEl = element.querySelector("[data-component-key]");
    const componentKey = componentEl.getAttribute("data-component-key");
    const machineKey = componentEl.closest("[data-machine-key]").getAttribute("data-machine-key");

    const rowIndex = dataView.table.rows.findIndex(
        (row) => row[machineIdx] === machineKey && row[componentIdx] === componentKey
    );
    assert.ok(rowIndex >= 0, "the clicked component's CSV row was found");

    const expectedId = host
        .createSelectionIdBuilder()
        .withTable(dataView.table, rowIndex)
        .createSelectionId();

    componentEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    assert.equal(host.selectionManager.select.mock.calls.length, 1);
    // node:test's MockFunctionCall names this property "arguments" (the captured call's argument
    // list); it is not the legacy JS `arguments` object the rule below exists to ban.
    // eslint-disable-next-line powerbi-visuals/no-banned-terms -- see comment above
    assert.deepEqual(host.selectionManager.select.mock.calls[0].arguments[0], expectedId);
});

test("ArrowRight moves focus to the next component and Enter selects the focused one", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);

    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    const elements = Array.from(element.querySelectorAll("[data-component-key]"));
    assert.ok(elements.length > 1, "fixture renders more than one focusable component");

    elements[0].focus();
    assert.equal(document.activeElement, elements[0]);

    elements[0].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })
    );
    assert.equal(document.activeElement, elements[1], "focus moved to the next component");

    document.activeElement.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    assert.equal(host.selectionManager.select.mock.calls.length, 1);
});

function editRows(dataView, edit) {
    const headers = dataView.table.columns.map((c) => c.displayName);
    const col = (name) => headers.indexOf(name);
    const rows = dataView.table.rows.map((row) => row.slice());
    edit(rows, col);
    return { ...dataView, table: { ...dataView.table, rows } };
}

function setStatus(dataView, componentKey, status) {
    return editRows(dataView, (rows, col) => {
        rows.filter((row) => row[col("component_key")] === componentKey)
            .forEach((row) => { row[col("status")] = status; });
    });
}

function cardsByKey(element) {
    return new Map(Array.from(element.querySelectorAll(".bucket-health-card"))
        .map((card) => [card.getAttribute("data-machine-key"), card]));
}

function componentEl(element, machineKey, componentKey) {
    const card = cardsByKey(element).get(machineKey);
    return Array.from(card.querySelectorAll("[data-component-key]"))
        .find((el) => el.getAttribute("data-component-key") === componentKey);
}

test("a resize-only update re-renders nothing", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const before = cardsByKey(element);

    // An empty dataViews array would render the landing page if this update were processed.
    visual.update({ dataViews: [], type: 4 | 32 });

    const after = cardsByKey(element);
    assert.equal(after.size, before.size);
    before.forEach((card, key) => assert.equal(after.get(key), card, `${key} card kept`));
    assert.equal(host.eventService.renderingStarted.mock.calls.length, 2);
    assert.equal(host.eventService.renderingFinished.mock.calls.length, 2);
});

test("the first update renders even when it is flagged resize-only", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);

    visual.update({ dataViews: [fixtureDataView()], type: 4 });

    assert.ok(element.querySelectorAll(".bucket-health-card").length > 0);
});

test("a data update with the same statuses keeps every card node, even when tooltip data changes", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const before = cardsByKey(element);

    const refreshed = editRows(fixtureDataView(), (rows, col) => {
        rows.forEach((row) => { row[col("last_seen_utc")] = "2026-06-21T12:00:00Z"; });
    });
    visual.update({ dataViews: [refreshed], type: 2 });

    const after = cardsByKey(element);
    before.forEach((card, key) => assert.equal(after.get(key), card, `${key} card kept`));
});

test("a status change rebuilds only that machine's card", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const before = cardsByKey(element);
    const order = Array.from(before.keys());

    visual.update({ dataViews: [setStatus(fixtureDataView(), "EX-041-T02", "Lockout")], type: 2 });

    const after = cardsByKey(element);
    assert.deepEqual(Array.from(after.keys()), order, "card order unchanged");
    before.forEach((card, key) => {
        if (key === "EX-041") {
            assert.notEqual(after.get(key), card, "changed card rebuilt");
        } else {
            assert.equal(after.get(key), card, `${key} card kept`);
        }
    });
    assert.equal(componentEl(element, "EX-041", "EX-041-T02").getAttribute("data-status"), "lockout");
});

test("a new alarm moves its card forward and removed machines lose their card", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const before = cardsByKey(element);

    const next = editRows(setStatus(fixtureDataView(), "EX-041-T02", "Movement alarm"), (rows, col) => {
        for (let index = rows.length - 1; index >= 0; index--) {
            if (rows[index][col("machine_key")] === "LD-031") rows.splice(index, 1);
        }
    });
    visual.update({ dataViews: [next], type: 2 });

    const after = cardsByKey(element);
    const position = (cards) => Array.from(cards.keys()).indexOf("EX-041");
    assert.ok(position(after) < position(before), "alarming card sorted ahead of its old place");
    assert.ok(cardsByKey(element).get("EX-041").classList.contains("bucket-health-card--alarm"));
    assert.equal(after.has("LD-031"), false);
    ["EX-204", "EX-988"].forEach((key) => assert.equal(after.get(key), before.get(key), `${key} card kept`));
});

test("focus stays on the same component when its card is rebuilt", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const focused = componentEl(element, "EX-041", "EX-041-T01");
    focused.focus();

    visual.update({ dataViews: [setStatus(fixtureDataView(), "EX-041-T02", "Movement alarm")], type: 2 });

    const replacement = componentEl(element, "EX-041", "EX-041-T01");
    assert.notEqual(replacement, focused, "card was rebuilt");
    assert.equal(document.activeElement, replacement);
});

test("an open tooltip stays open across an update and shows the new status", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    componentEl(element, "EX-041", "EX-041-T02")
        .dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }));
    const tooltip = element.querySelector(".bh-tooltip");
    assert.equal(tooltip.hidden, false);

    visual.update({ dataViews: [setStatus(fixtureDataView(), "EX-041-T02", "Lockout")], type: 2 });

    assert.equal(element.querySelector(".bh-tooltip"), tooltip, "same tooltip element");
    assert.equal(tooltip.hidden, false);
    assert.match(tooltip.textContent, /Lockout/);
});

test("an open tooltip closes when its component disappears", () => {
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    componentEl(element, "LD-031", "LD-031-T01")
        .dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }));

    const withoutLoader = editRows(fixtureDataView(), (rows, col) => {
        for (let index = rows.length - 1; index >= 0; index--) {
            if (rows[index][col("machine_key")] === "LD-031") rows.splice(index, 1);
        }
    });
    visual.update({ dataViews: [withoutLoader], type: 2 });

    assert.equal(element.querySelector(".bh-tooltip").hidden, true);
});

function switchableHost() {
    const state = { throwNext: false, highContrast: false };
    const host = createMockHost({
        get colorPalette() {
            if (state.throwNext) {
                state.throwNext = false;
                throw new Error("colorPalette unavailable");
            }
            return {
                isHighContrast: state.highContrast,
                foreground: { value: "#ffffff" },
                background: { value: "#000000" },
                foregroundSelected: { value: "#ff0000" }
            };
        }
    });
    return { host, state };
}

function withAlarmMotion(dataView, alarmMotion) {
    return { ...dataView, metadata: { ...dataView.metadata, objects: { alarm: { alarmMotion } } } };
}

test("an update that throws stops a sounding alarm", () => {
    const { host, state } = switchableHost();
    const { visual } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    visual.update({ dataViews: [setStatus(fixtureDataView(), "EX-041-T02", "Movement alarm")], type: 2 });
    assert.equal(visual.alarmController.audio.isPlaying(), true, "new alarm is sounding");

    state.throwNext = true;
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    assert.equal(host.eventService.renderingFailed.mock.calls.length, 1);
    assert.equal(visual.alarmController.audio.isPlaying(), false);
});

test("the first update after a failed one renders even when it is flagged resize-only", () => {
    const { host, state } = switchableHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    state.throwNext = true;
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.equal(element.querySelectorAll(".bucket-health-card").length, 0, "error state shown");

    visual.update({ dataViews: [fixtureDataView()], type: 4 });

    assert.ok(element.querySelectorAll(".bucket-health-card").length > 0);
});

test("a style-only update (high contrast on) rebuilds every card", () => {
    const { host, state } = switchableHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const before = cardsByKey(element);

    state.highContrast = true;
    visual.update({ dataViews: [fixtureDataView()], type: 16 });

    const after = cardsByKey(element);
    before.forEach((card, key) => assert.notEqual(after.get(key), card, `${key} card rebuilt`));
});

test("changing Alarm motion puts every card on the same flash phase", (t) => {
    let now = 100;
    t.mock.method(performance, "now", () => now);
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [withAlarmMotion(fixtureDataView(), "never")], type: 2 });
    now = 450;
    visual.update({ dataViews: [withAlarmMotion(setStatus(fixtureDataView(), "EX-041-T02", "Lockout"), "never")], type: 2 });
    const phases = () => new Set(Array.from(element.querySelectorAll(".bucket-health-card"))
        .map((card) => card.style.getPropertyValue("--bh-sync-700")));
    assert.equal(phases().size, 2, "the rebuilt card was synced at a later time");

    now = 1000;
    visual.update({ dataViews: [withAlarmMotion(setStatus(fixtureDataView(), "EX-041-T02", "Lockout"), "always")], type: 2 });

    assert.deepEqual(Array.from(phases()), ["-300ms"]);
    assert.ok(element.classList.contains("bucket-health-root--flash-always"));
});

test("switching Alarm motion between Auto and Always leaves running flash phases alone", (t) => {
    let now = 100;
    t.mock.method(performance, "now", () => now);
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [withAlarmMotion(fixtureDataView(), "auto")], type: 2 });
    now = 450;
    visual.update({ dataViews: [withAlarmMotion(setStatus(fixtureDataView(), "EX-041-T02", "Lockout"), "auto")], type: 2 });
    const phases = () => Array.from(element.querySelectorAll(".bucket-health-card"))
        .map((card) => card.style.getPropertyValue("--bh-sync-700"));
    const before = phases();

    now = 1000;
    visual.update({ dataViews: [withAlarmMotion(setStatus(fixtureDataView(), "EX-041-T02", "Lockout"), "always")], type: 2 });

    assert.deepEqual(phases(), before);
    assert.equal(new Set(before).size, 2);
});

// Tooltip timing: hides as soon as the pointer leaves the component; while the pointer stays on
// it, hides after 8 s without movement and stays hidden until the pointer leaves and returns.
function hoverSetup(t) {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const host = createMockHost();
    const { visual, element } = makeVisual(host);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const move = (el, x = 10) => el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: 10 }));
    const tooltip = () => element.querySelector(".bh-tooltip");
    return { visual, element, move, tooltip };
}

test("tooltip hides immediately when the pointer moves off the component onto the card", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    move(componentEl(element, "EX-041", "EX-041-T02"));
    assert.equal(tooltip().hidden, false);

    move(cardsByKey(element).get("EX-041"));

    assert.equal(tooltip().hidden, true);
});

test("tooltip hides immediately when the pointer leaves the component without another move", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    const tooth = componentEl(element, "EX-041", "EX-041-T02");
    move(tooth);

    tooth.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: null }));

    assert.equal(tooltip().hidden, true);
});

test("tooltip hides immediately when the pointer leaves the visual", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    move(componentEl(element, "EX-041", "EX-041-T02"));

    element.dispatchEvent(new MouseEvent("mouseleave"));

    assert.equal(tooltip().hidden, true);
});

test("tooltip hides after the pointer rests on the component for 8 s", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    move(componentEl(element, "EX-041", "EX-041-T02"));

    t.mock.timers.tick(7999);
    assert.equal(tooltip().hidden, false);
    t.mock.timers.tick(1);
    assert.equal(tooltip().hidden, true);
});

test("moving within the component restarts the 8 s count", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    const tooth = componentEl(element, "EX-041", "EX-041-T02");
    move(tooth, 10);
    t.mock.timers.tick(5000);
    move(tooth, 12);

    t.mock.timers.tick(7999);
    assert.equal(tooltip().hidden, false);
    t.mock.timers.tick(1);
    assert.equal(tooltip().hidden, true);
});

test("after the 8 s hide, moving on the same component keeps it hidden until the pointer leaves and returns", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    const tooth = componentEl(element, "EX-041", "EX-041-T02");
    move(tooth);
    t.mock.timers.tick(8000);

    move(tooth, 14);
    assert.equal(tooltip().hidden, true, "a small move does not bring it back");

    move(cardsByKey(element).get("EX-041"));
    move(tooth);
    assert.equal(tooltip().hidden, false, "leaving and returning shows it again");
});

test("moving to another component shows that component with a fresh 8 s", (t) => {
    const { element, move, tooltip } = hoverSetup(t);
    move(componentEl(element, "EX-041", "EX-041-T02"));
    t.mock.timers.tick(6000);

    move(componentEl(element, "EX-041", "EX-041-T03"));
    assert.match(tooltip().textContent, /EX-041-T03/);
    t.mock.timers.tick(7999);
    assert.equal(tooltip().hidden, false);
    t.mock.timers.tick(1);
    assert.equal(tooltip().hidden, true);
});

test("a data refresh neither restarts the 8 s count nor reopens a hidden tooltip", (t) => {
    const { visual, element, move, tooltip } = hoverSetup(t);
    move(componentEl(element, "EX-041", "EX-041-T02"));
    t.mock.timers.tick(5000);

    visual.update({ dataViews: [setStatus(fixtureDataView(), "EX-041-T02", "Lockout")], type: 2 });
    assert.equal(tooltip().hidden, false);
    assert.match(tooltip().textContent, /Lockout/);
    t.mock.timers.tick(3000);
    assert.equal(tooltip().hidden, true);

    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.equal(tooltip().hidden, true);
});
