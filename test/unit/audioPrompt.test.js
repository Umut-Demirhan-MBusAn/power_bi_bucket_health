"use strict";

const { installDom, createMockHost, fixtureDataView } = require("../helpers/mockHost");

installDom();

// A browser's autoplay lock: resume() unlocks only when called inside a user gesture, and, as in a
// real AudioContext, the state changes later (a microtask here) and fires onstatechange.
// `startsUnlocked` models Power BI Desktop; `unavailable` a host with no Web Audio.
const audio = { gesture: false, startsUnlocked: false, unavailable: false, last: null, blockedResumes: 0 };
class LockedAudioContext {
    constructor() {
        if (audio.unavailable) throw new Error("no Web Audio");
        this.currentTime = 0;
        this.state = audio.startsUnlocked ? "running" : "suspended";
        this.destination = {};
        this.onstatechange = null;
        audio.last = this;
    }
    setState(state) {
        this.state = state;
        if (this.onstatechange) this.onstatechange();
    }
    createOscillator() {
        return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
    }
    createGain() {
        return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
    resume() {
        if (!audio.gesture) {
            audio.blockedResumes++;
            return new Promise(() => {});
        }
        return Promise.resolve().then(() => this.setState("running"));
    }
    close() {
        this.setState("closed");
        return Promise.resolve();
    }
}
globalThis.AudioContext = LockedAudioContext;

const test = require("node:test");
const assert = require("node:assert/strict");

const { Visual } = require("../../.tmp/test-build/src/visual");

const LOCKED_TEXT = "Click to turn on alarm sound";
const UNLOCKED_TEXT = "Alarm sound on";
const STRIP_CLASS = "bucket-health-root--audio-prompt";

function setup(t, { host = createMockHost(), startsUnlocked = false, unavailable = false } = {}) {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
    Object.assign(audio, { gesture: false, startsUnlocked, unavailable, last: null, blockedResumes: 0 });
    const element = document.createElement("div");
    document.body.appendChild(element);
    const visual = new Visual({ element, host });
    t.after(() => {
        visual.destroy();
        element.remove();
    });
    return { visual, element, host };
}

function prompt(element) {
    return element.querySelector(".bh-audio-prompt");
}

const settle = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
};

function userClick(el) {
    audio.gesture = true;
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    audio.gesture = false;
}

function withObjects(dataView, objects) {
    return { ...dataView, metadata: { ...dataView.metadata, objects } };
}

test("while the browser keeps audio locked, a button asks for the unlocking click", (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    const pill = prompt(element);
    assert.ok(pill, "prompt shown");
    assert.equal(pill.tagName, "BUTTON");
    assert.equal(pill.type, "button");
    assert.match(pill.textContent, new RegExp(LOCKED_TEXT));
    assert.ok(pill.querySelector("[aria-hidden='true']").textContent.length > 0, "icon hidden from AT");
});

test("the prompt has its own strip above the fleet and comes first in Tab order", (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.equal(element.firstChild, prompt(element), "before every focusable component");
    assert.equal(element.classList.contains(STRIP_CLASS), false, "no strip while the pill is still invisible");

    t.mock.timers.tick(600);
    assert.ok(element.classList.contains(STRIP_CLASS), "fleet shortened once the pill fades in");
});

test("preparing never calls resume() without a gesture, across refreshes", (t) => {
    const { visual } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    assert.ok(audio.last, "the context was created to detect the lock");
    assert.equal(audio.blockedResumes, 0);
});

test("clicking the prompt unlocks audio once the resume lands, confirms for 2 s, then removes it", async (t) => {
    const { visual, element, host } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    t.mock.timers.tick(1000);

    userClick(prompt(element));
    assert.match(prompt(element).textContent, new RegExp(LOCKED_TEXT), "resume() has not settled yet");

    await settle();
    assert.equal(audio.last.state, "running");
    assert.match(prompt(element).textContent, new RegExp(UNLOCKED_TEXT));
    assert.equal(host.createSelectionManager().clear.mock.calls.length, 0, "selection not cleared");

    t.mock.timers.tick(1999);
    assert.ok(prompt(element), "still confirming");
    t.mock.timers.tick(1);
    assert.equal(prompt(element), null, "gone after 2 s");
    assert.equal(element.classList.contains(STRIP_CLASS), false, "fleet gets its full height back");
});

test("when the focused prompt goes, focus moves to the first component, not out of the visual", async (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    t.mock.timers.tick(1000);
    prompt(element).focus();

    userClick(prompt(element));
    await settle();
    t.mock.timers.tick(2000);

    assert.equal(document.activeElement, element.querySelector("[data-component-key]"));
});

test("a click anywhere in the visual unlocks audio and confirms too", async (t) => {
    const { visual, element, host } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    t.mock.timers.tick(1000);

    userClick(element.querySelector(".bucket-health"));
    await settle();

    assert.match(prompt(element).textContent, new RegExp(UNLOCKED_TEXT));
    assert.ok(host.createSelectionManager().clear.mock.calls.length >= 1, "an empty-space click still clears");
});

test("the prompt stays gone across later updates once audio is unlocked", async (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    t.mock.timers.tick(1000);
    userClick(prompt(element));
    await settle();
    t.mock.timers.tick(2000);

    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.equal(prompt(element), null);
});

test("the prompt survives data refreshes while audio is still locked", (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    const pill = prompt(element);

    visual.update({ dataViews: [fixtureDataView()], type: 2 | 16 });
    assert.equal(prompt(element), pill, "same node, still attached");
    assert.equal(element.firstChild, pill);
});

test("if the browser locks audio again, the prompt comes back", async (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    t.mock.timers.tick(1000);
    userClick(prompt(element));
    await settle();
    t.mock.timers.tick(2000);

    audio.last.setState("interrupted");

    assert.match(prompt(element).textContent, new RegExp(LOCKED_TEXT));
});

test("where audio starts unlocked (Desktop) no prompt shows", (t) => {
    const { visual, element } = setup(t, { startsUnlocked: true });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    assert.equal(prompt(element), null);
    assert.equal(element.classList.contains(STRIP_CLASS), false);
});

test("audio that unlocks within the prompt's fade-in delay removes it without a confirmation", (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.ok(prompt(element));

    t.mock.timers.tick(100);
    assert.equal(element.classList.contains(STRIP_CLASS), false);
    audio.last.setState("running");

    assert.equal(prompt(element), null);
    t.mock.timers.tick(1000);
    assert.equal(element.classList.contains(STRIP_CLASS), false, "the fleet never moved");
});

test("no prompt where no AudioContext can be created, since no click could unlock one", (t) => {
    const { visual, element } = setup(t, { unavailable: true });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    assert.equal(prompt(element), null);
});

test("no prompt with Enable audio alarm off, and turning it off removes one", (t) => {
    const { visual, element } = setup(t);
    const audioOff = withObjects(fixtureDataView(), { alarm: { audioEnabled: false } });
    visual.update({ dataViews: [audioOff], type: 2 });
    assert.equal(prompt(element), null);

    visual.update({ dataViews: [fixtureDataView()], type: 2 });
    assert.ok(prompt(element));
    visual.update({ dataViews: [audioOff], type: 2 });
    assert.equal(prompt(element), null);
    assert.equal(element.classList.contains(STRIP_CLASS), false);
});

test("no prompt on an edge state", (t) => {
    const { visual, element } = setup(t);
    visual.update({ dataViews: [], type: 2 });

    assert.equal(prompt(element), null);
});

test("no prompt when the host disallows interactions, since a click cannot unlock audio there", (t) => {
    const host = createMockHost({ hostCapabilities: { allowInteractions: false } });
    const { visual, element } = setup(t, { host });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    assert.equal(prompt(element), null);
});

test("in Power BI high contrast the prompt takes the host palette's colours", (t) => {
    const host = createMockHost({
        colorPalette: {
            isHighContrast: true,
            foreground: { value: "#ffff00" },
            background: { value: "#000000" },
            foregroundSelected: { value: "#00ffff" }
        }
    });
    const { visual, element } = setup(t, { host });
    visual.update({ dataViews: [fixtureDataView()], type: 2 });

    const pill = prompt(element);
    assert.equal(pill.style.color, "rgb(255, 255, 0)");
    assert.equal(pill.style.background, "rgb(0, 0, 0)");
    assert.equal(pill.style.borderColor, "rgb(0, 255, 255)");
});
