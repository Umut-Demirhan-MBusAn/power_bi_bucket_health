const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html>");
globalThis.document = dom.window.document;

const test = require("node:test");
const assert = require("node:assert/strict");

const { renderMachineCard } = require("../../.tmp/test-build/src/rendering/renderMachineCard");

const THEME = { isHighContrast: false, foreground: "#ffffff", background: "#000000", foregroundSelected: "#ff0000" };
const THEME_HC = { isHighContrast: true, foreground: "#ffffff", background: "#000000", foregroundSelected: "#ff0000" };
const MIN_WIDTH = 220;

function component(category, order, status = "ok", side = undefined) {
    return { machineKey: "EX-TEST", componentKey: `${category}-${order}`, category, order, derivedWingSide: side, status, tooltipFields: [], sourceOrder: order };
}

function okMachine(overrides = {}) {
    const teethCount = overrides.teethCount || 5;
    return {
        key: overrides.key || "EX-TEST",
        name: overrides.name || "EX-TEST",
        type: overrides.type || "Hydraulic Excavator",
        teeth: overrides.teeth || Array.from({ length: teethCount }, (_, i) => component("tooth", i + 1)),
        lipShrouds: overrides.lipShrouds || Array.from({ length: teethCount - 1 }, (_, i) => component("lipShroud", i + 1)),
        wingShroudsLeft: overrides.wingShroudsLeft || [],
        wingShroudsRight: overrides.wingShroudsRight || [],
        alarmCount: 0, hasAlarm: false, sourceOrder: 0,
        issues: overrides.issues || [],
        incomplete: overrides.incomplete || false
    };
}

function alarmMachine(moveOrders = [1], proxOrders = []) {
    const teeth = Array.from({ length: 5 }, (_, i) => {
        const order = i + 1;
        const status = moveOrders.includes(order) ? "move" : proxOrders.includes(order) ? "prox" : "ok";
        return component("tooth", order, status);
    });
    const lipShrouds = Array.from({ length: 4 }, (_, i) => component("lipShroud", i + 1));
    return {
        key: "EX-TEST", name: "EX-TEST", type: "Hydraulic Excavator",
        teeth, lipShrouds, wingShroudsLeft: [], wingShroudsRight: [],
        alarmCount: moveOrders.length + proxOrders.length, hasAlarm: true, sourceOrder: 0,
        issues: [], incomplete: false
    };
}

test("ok machine: card class, status badge, and aria-label", () => {
    const card = renderMachineCard(okMachine(), THEME, MIN_WIDTH);
    assert.equal(card.className, "bucket-health-card");
    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "OK");
    assert.match(card.getAttribute("aria-label"), /EX-TEST/);
    assert.match(card.getAttribute("aria-label"), /OK/);
});

test("alarm machine: --alarm card class, ALARM! badge, alarm banner present", () => {
    const card = renderMachineCard(alarmMachine([1]), THEME, MIN_WIDTH);
    assert.equal(card.className, "bucket-health-card bucket-health-card--alarm");
    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "ALARM!");
    assert.ok(card.querySelector(".bucket-health-card__alarm-banner"), "alarm banner present");
});

test("alarm banner: move line shows affected components", () => {
    const card = renderMachineCard(alarmMachine([1, 3]), THEME, MIN_WIDTH);
    const moveLine = card.querySelector(".bucket-health-card__alarm-line--move");
    assert.ok(moveLine, "move line present");
    assert.match(moveLine.textContent, /Movement Alarm/);
    assert.match(moveLine.textContent, /Tooth 1/);
    assert.match(moveLine.textContent, /Tooth 3/);
    assert.equal(card.querySelector(".bucket-health-card__alarm-line--prox"), null);
});

test("alarm banner: prox line shows affected components", () => {
    const card = renderMachineCard(alarmMachine([], [2]), THEME, MIN_WIDTH);
    const proxLine = card.querySelector(".bucket-health-card__alarm-line--prox");
    assert.ok(proxLine, "prox line present");
    assert.match(proxLine.textContent, /Proximity Alarm/);
    assert.match(proxLine.textContent, /Tooth 2/);
    assert.equal(card.querySelector(".bucket-health-card__alarm-line--move"), null);
});

test("alarm banner: both move and prox lines when both component types alarm", () => {
    const card = renderMachineCard(alarmMachine([1], [3]), THEME, MIN_WIDTH);
    assert.ok(card.querySelector(".bucket-health-card__alarm-line--move"), "move line present");
    assert.ok(card.querySelector(".bucket-health-card__alarm-line--prox"), "prox line present");
});

test("no-data machine: NO DATA badge, no alarm banner, nodata aria-label", () => {
    const nodataTeeth = Array.from({ length: 5 }, (_, i) => component("tooth", i + 1, "nodata"));
    const nodataLips = Array.from({ length: 4 }, (_, i) => component("lipShroud", i + 1, "nodata"));
    const card = renderMachineCard(okMachine({ teeth: nodataTeeth, lipShrouds: nodataLips }), THEME, MIN_WIDTH);
    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "NO DATA");
    assert.equal(card.querySelector(".bucket-health-card__alarm-banner"), null);
    assert.match(card.getAttribute("aria-label"), /No Data \(1h\)/);
});

test("meta text: type, tooth count, lip shroud count", () => {
    const card = renderMachineCard(okMachine({ type: "Hydraulic Excavator" }), THEME, MIN_WIDTH);
    const meta = card.querySelector(".bucket-health-card__header p");
    assert.match(meta.textContent, /Hydraulic Excavator/);
    assert.match(meta.textContent, /5 teeth/);
    assert.match(meta.textContent, /4 lip shrouds/);
});

test("meta text: wing shroud count included when wings present", () => {
    const m = okMachine({
        wingShroudsLeft: [component("wingShroud", 1, "ok", "left")],
        wingShroudsRight: [component("wingShroud", 2, "ok", "right")]
    });
    const card = renderMachineCard(m, THEME, MIN_WIDTH);
    assert.match(card.querySelector("p").textContent, /2 wing shrouds/);
});

test("minWidth style is applied", () => {
    const card = renderMachineCard(okMachine(), THEME, 300);
    assert.equal(card.style.minWidth, "300px");
});

test("high contrast mode: normal card uses foreground, alarm card uses foregroundSelected", () => {
    const normalCard = renderMachineCard(okMachine(), THEME_HC, MIN_WIDTH);
    const alarmCard = renderMachineCard(alarmMachine([1]), THEME_HC, MIN_WIDTH);
    // jsdom normalizes hex to rgb(); THEME_HC.foreground=#ffffff, foregroundSelected=#ff0000
    assert.equal(normalCard.style.borderColor, "rgb(255, 255, 255)");
    assert.equal(alarmCard.style.borderColor, "rgb(255, 0, 0)");
});

test("alarm banner: lip and wing components use correct label prefixes", () => {
    const m = {
        key: "EX-TEST", name: "EX-TEST", type: "Hydraulic Excavator",
        teeth: Array.from({ length: 5 }, (_, i) => component("tooth", i + 1)),
        lipShrouds: [
            component("lipShroud", 1, "ok"),
            component("lipShroud", 2, "move"),
            component("lipShroud", 3, "ok"),
            component("lipShroud", 4, "ok"),
        ],
        wingShroudsLeft: [component("wingShroud", 1, "prox", "left")],
        wingShroudsRight: [],
        alarmCount: 2, hasAlarm: true, sourceOrder: 0,
        issues: [], incomplete: false
    };
    const card = renderMachineCard(m, THEME, MIN_WIDTH);
    const moveLine = card.querySelector(".bucket-health-card__alarm-line--move");
    const proxLine = card.querySelector(".bucket-health-card__alarm-line--prox");
    assert.ok(moveLine, "move line present");
    assert.match(moveLine.textContent, /Lip 2/);
    assert.ok(proxLine, "prox line present");
    assert.match(proxLine.textContent, /Wing 1/);
});

test("invalid machine: --invalid class, DATA ERROR badge, issues list instead of svg", () => {
    const m = okMachine({ issues: ["Tooth 3 (T3): status 'Offline' is not recognised."] });
    const card = renderMachineCard(m, THEME, MIN_WIDTH);

    assert.ok(card.className.includes("bucket-health-card--invalid"));
    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "DATA ERROR");

    const items = card.querySelectorAll(".bucket-health-card__issues li");
    assert.equal(items.length, 1);
    assert.equal(items[0].textContent, "Tooth 3 (T3): status 'Offline' is not recognised.");
    assert.equal(card.querySelector("svg"), null, "no bucket svg for an invalid card");
});

test("incomplete machine: --incomplete class, INCOMPLETE badge", () => {
    const m = okMachine({
        issues: ["Incomplete — the 2,000-row limit was reached."],
        incomplete: true
    });
    const card = renderMachineCard(m, THEME, MIN_WIDTH);

    assert.ok(card.className.includes("bucket-health-card--incomplete"));
    assert.ok(!card.className.includes("bucket-health-card--invalid"));
    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "INCOMPLETE");
    assert.equal(card.querySelector("svg"), null);
});

test("alarming invalid machine: ALARM! badge and alarm banner still shown, alongside the issues list", () => {
    const m = alarmMachine([1]);
    m.issues = ["Duplicate component 'T2'."];
    const card = renderMachineCard(m, THEME, MIN_WIDTH);

    assert.equal(card.querySelector(".bucket-health-card__status").textContent, "ALARM!");
    assert.ok(card.querySelector(".bucket-health-card__alarm-banner"), "alarm banner present");
    assert.ok(card.querySelector(".bucket-health-card__issues"), "issues list present");
    assert.equal(card.querySelector("svg"), null);
});

test("a valid machine (no issues) still renders the bucket svg, not an issues list", () => {
    const card = renderMachineCard(okMachine(), THEME, MIN_WIDTH);
    assert.equal(card.querySelector(".bucket-health-card__issues"), null);
    assert.ok(card.querySelector("svg"), "bucket svg present for a valid card");
});
