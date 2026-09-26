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
