const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html>");
globalThis.document = dom.window.document;

const test = require("node:test");
const assert = require("node:assert/strict");

const { renderFleet, updateFleet } = require("../../.tmp/test-build/src/rendering/renderFleet");

const THEME = { isHighContrast: false, foreground: "#fff", background: "#000", foregroundSelected: "#ff0" };

function component(category, order, status = "ok", side = undefined) {
    return { machineKey: "EX-1", componentKey: `${category}-${order}`, category, order, derivedWingSide: side, status, tooltipFields: [], sourceOrder: order };
}

function machine(key = "EX-1") {
    return {
        key, name: key, type: "Hydraulic Excavator",
        teeth: Array.from({ length: 5 }, (_, i) => component("tooth", i + 1)),
        lipShrouds: Array.from({ length: 4 }, (_, i) => component("lipShroud", i + 1)),
        wingShroudsLeft: [], wingShroudsRight: [],
        alarmCount: 0, hasAlarm: false, sourceOrder: 0,
        issues: [], incomplete: false
    };
}

test("renderFleet returns a section.bucket-health", () => {
    const el = renderFleet([machine()], THEME, 220);
    assert.equal(el.tagName, "SECTION");
    assert.equal(el.className, "bucket-health");
});

test("renderFleet shows truncation banner when truncated=true", () => {
    const el = renderFleet([machine()], THEME, 220, true);
    const banner = el.querySelector(".bh-truncation-warning");
    assert.ok(banner, "truncation banner present");
    assert.match(banner.textContent, /Row limit reached \(2,000 rows\)/);
});

test("renderFleet omits truncation banner when truncated=false", () => {
    const el = renderFleet([machine()], THEME, 220, false);
    assert.equal(el.querySelector(".bh-truncation-warning"), null);
});

test("renderFleet renders a banner per fleet-level warning", () => {
    const el = renderFleet([machine()], THEME, 220, false, ["2 row(s) skipped: machine is blank."]);
    const banners = el.querySelectorAll(".bh-fleet-warning");
    assert.equal(banners.length, 1);
    assert.match(banners[0].textContent, /2 row\(s\) skipped: machine is blank\./);
});

test("renderFleet omits fleet-warning banners when warnings is empty", () => {
    const el = renderFleet([machine()], THEME, 220);
    assert.equal(el.querySelector(".bh-fleet-warning"), null);
});

test("renderFleet applies --single modifier for one machine", () => {
    const el = renderFleet([machine()], THEME, 220);
    const grid = el.querySelector(".bucket-health__grid");
    assert.ok(grid.className.includes("--single"), "grid has --single modifier");
});

test("renderFleet uses plain grid class for multiple machines", () => {
    const el = renderFleet([machine("EX-1"), machine("EX-2")], THEME, 220);
    const grid = el.querySelector(".bucket-health__grid");
    assert.equal(grid.className, "bucket-health__grid");
});

test("renderFleet renders one card per machine", () => {
    const el = renderFleet([machine("EX-1"), machine("EX-2"), machine("EX-3")], THEME, 220);
    const cards = el.querySelectorAll(".bucket-health-card");
    assert.equal(cards.length, 3);
});

test("renderFleet handles empty machines array", () => {
    const el = renderFleet([], THEME, 220);
    const grid = el.querySelector(".bucket-health__grid");
    assert.equal(grid.className, "bucket-health__grid");
    assert.equal(el.querySelectorAll(".bucket-health-card").length, 0);
});

test("updateFleet swaps changed banners and leaves the cards alone", () => {
    const el = renderFleet([machine("EX-1"), machine("EX-2")], THEME, 220, false, ["first warning"]);
    const cards = Array.from(el.querySelectorAll(".bucket-health-card"));

    updateFleet(el, [machine("EX-1"), machine("EX-2")], THEME, 220, true, ["second warning"]);

    assert.ok(el.querySelector(".bh-truncation-warning"));
    const banners = Array.from(el.querySelectorAll(".bh-fleet-warning"));
    assert.deepEqual(banners.map((b) => b.textContent), ["⚠ second warning"]);
    assert.deepEqual(Array.from(el.querySelectorAll(".bucket-health-card")), cards);
    assert.equal(el.lastElementChild.className, "bucket-health__grid");
});

test("updateFleet keeps unchanged banner nodes", () => {
    const el = renderFleet([machine()], THEME, 220, false, ["same warning"]);
    const banner = el.querySelector(".bh-fleet-warning");

    updateFleet(el, [machine()], THEME, 220, false, ["same warning"]);

    assert.equal(el.querySelector(".bh-fleet-warning"), banner);
});

test("updateFleet rebuilds every card when the theme or minimum width changes", () => {
    const el = renderFleet([machine()], THEME, 220);
    const card = el.querySelector(".bucket-health-card");

    updateFleet(el, [machine()], THEME, 300);
    const widened = el.querySelector(".bucket-health-card");
    assert.notEqual(widened, card);

    updateFleet(el, [machine()], { ...THEME, isHighContrast: true }, 300);
    assert.notEqual(el.querySelector(".bucket-health-card"), widened);
});

test("updateFleet applies the --single modifier as the machine count changes", () => {
    const el = renderFleet([machine("EX-1"), machine("EX-2")], THEME, 220);

    updateFleet(el, [machine("EX-1")], THEME, 220);

    assert.ok(el.lastElementChild.className.includes("--single"));
    assert.equal(el.querySelectorAll(".bucket-health-card").length, 1);
});

test("cards carry flash-phase delays for every alarm animation period", () => {
    const el = renderFleet([machine()], THEME, 220);
    const card = el.querySelector(".bucket-health-card");

    ["700", "800", "850"].forEach((period) => {
        const value = card.style.getPropertyValue(`--bh-sync-${period}`);
        assert.match(value, /^-?\d+ms$/, `--bh-sync-${period} = ${value}`);
        assert.ok(-parseInt(value, 10) < Number(period));
    });
});
