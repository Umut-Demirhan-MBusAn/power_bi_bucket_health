const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html>");
globalThis.document = dom.window.document;

const test = require("node:test");
const assert = require("node:assert/strict");

const { renderBucketSvg } = require("../../.tmp/test-build/src/rendering/renderBucketSvg");
const { buildBucketGeometry } = require("../../.tmp/test-build/src/geometry/bucketGeometry");

const THEME = { isHighContrast: false, foreground: "#ffffff", background: "#000000", foregroundSelected: "#ff0000" };
const THEME_HC = { isHighContrast: true, foreground: "#ffffff", background: "#000000", foregroundSelected: "#ff0000" };

function component(category, order, status = "ok", side = undefined) {
    return { machineKey: "EX-TEST", componentKey: `${category}-${order}`, category, order, derivedWingSide: side, status, tooltipFields: [], sourceOrder: order };
}

function machine({ key = "EX-TEST", teethCount = 5, toothStatus = {} } = {}) {
    const teeth = Array.from({ length: teethCount }, (_, i) => {
        const order = i + 1;
        return component("tooth", order, toothStatus[order] || "ok");
    });
    const lipShrouds = Array.from({ length: teethCount - 1 }, (_, i) => component("lipShroud", i + 1));
    const hasAlarm = Object.values(toothStatus).some((s) => s === "move" || s === "prox");
    return {
        key, name: key, type: "Hydraulic Excavator",
        teeth, lipShrouds, wingShroudsLeft: [], wingShroudsRight: [],
        alarmCount: hasAlarm ? 1 : 0, hasAlarm, sourceOrder: 0
    };
}

function render(m, theme = THEME) {
    return renderBucketSvg(m, buildBucketGeometry(m), theme);
}

test("svg root: viewBox from geometry, img role, machine aria-label", () => {
    const m = machine();
    const geometry = buildBucketGeometry(m);
    const svg = renderBucketSvg(m, geometry, THEME);
    assert.equal(svg.getAttribute("viewBox"), geometry.viewBox);
    assert.equal(svg.getAttribute("role"), "img");
    assert.equal(svg.getAttribute("aria-label"), "EX-TEST bucket health");
});

test("normal theme: component fills come from the status palette", () => {
    const svg = render(machine({ toothStatus: { 1: "move", 2: "nodata" } }));
    const teeth = svg.querySelectorAll(".bucket-health-svg__tooth");
    assert.equal(teeth[0].getAttribute("fill"), "#C42B4A"); // move
    assert.equal(teeth[1].getAttribute("fill"), "#F4C04E"); // nodata
    assert.equal(teeth[2].getAttribute("fill"), "#34D399"); // ok
});

test("components carry data attributes and keyboard/a11y attributes", () => {
    const svg = render(machine());
    const tooth = svg.querySelector(".bucket-health-svg__tooth");
    assert.equal(tooth.getAttribute("data-component-key"), "tooth-1");
    assert.equal(tooth.getAttribute("data-status"), "ok");
    assert.equal(tooth.getAttribute("tabindex"), "0");
    assert.equal(tooth.getAttribute("role"), "img");
    assert.equal(tooth.getAttribute("aria-label"), "Tooth 1: OK");
});

test("center alarm: visible with halo, triangle, and mark when a component alarms", () => {
    const svg = render(machine({ toothStatus: { 3: "move" } }));
    const alarm = svg.querySelector(".bucket-health-svg__center-alarm");
    assert.ok(alarm, "center alarm group present");
    assert.ok(!alarm.getAttribute("class").includes("--hidden"), "not hidden");
    assert.ok(alarm.querySelector(".bucket-health-svg__alarm-halo"), "halo present");
    assert.equal(alarm.querySelectorAll("path").length, 1, "warning triangle present");
    assert.equal(alarm.querySelector(".bucket-health-svg__alarm-mark").textContent, "!");
});

test("center alarm: hidden and empty when no component alarms", () => {
    const svg = render(machine());
    const alarm = svg.querySelector(".bucket-health-svg__center-alarm");
    assert.ok(alarm.getAttribute("class").includes("--hidden"), "hidden modifier applied");
    assert.equal(alarm.childNodes.length, 0, "no alarm children rendered");
});

test("high contrast: decorative shell uses background fill and foreground stroke, no gradients", () => {
    const svg = render(machine(), THEME_HC);
    const body = svg.querySelector(".bucket-health-svg__body");
    assert.equal(body.getAttribute("fill"), "#000000");
    assert.equal(body.getAttribute("stroke"), "#ffffff");
    const cavity = svg.querySelector(".bucket-health-svg__cavity");
    assert.equal(cavity.getAttribute("fill"), "#000000");
});

test("high contrast: alarm components use foregroundSelected stroke at width 3, others foreground at 2", () => {
    const svg = render(machine({ toothStatus: { 1: "prox" } }), THEME_HC);
    const teeth = svg.querySelectorAll(".bucket-health-svg__tooth");
    assert.equal(teeth[0].getAttribute("fill"), "#000000");
    assert.equal(teeth[0].getAttribute("stroke"), "#ff0000");
    assert.equal(teeth[0].getAttribute("stroke-width"), "3");
    assert.equal(teeth[1].getAttribute("stroke"), "#ffffff");
    assert.equal(teeth[1].getAttribute("stroke-width"), "2");
});

test("gradient ids are sanitized from the machine key and referenced by the body fill", () => {
    const m = machine({ key: "EX 204/A" });
    const svg = render(m);
    const gradient = svg.querySelector("linearGradient");
    assert.equal(gradient.getAttribute("id"), "bucket-EX-204-A-body-gradient");
    assert.equal(svg.querySelector(".bucket-health-svg__body").getAttribute("fill"), "url(#bucket-EX-204-A-body-gradient)");
});
