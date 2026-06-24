const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html>");
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;

const test = require("node:test");
const assert = require("node:assert/strict");

const { renderEdgeState } = require("../../.tmp/test-build/src/rendering/renderEdgeStates");

test("noFields: container class and title", () => {
    const el = renderEdgeState("noFields");
    assert.equal(el.className, "bucket-health-state");
    assert.equal(el.querySelector("h2").textContent, "Add data to get started");
    assert.ok(el.querySelector(".bucket-health-state__icon--add"), "icon has --add class");
});

test("noFields: renders all five required field definitions", () => {
    const el = renderEdgeState("noFields");
    const items = el.querySelectorAll(".bucket-health-state__field-item");
    assert.equal(items.length, 5);
    assert.equal(items[0].querySelector(".bucket-health-state__field-name").textContent, "Machine");
    assert.equal(items[4].querySelector(".bucket-health-state__field-name").textContent, "Component Status");
});

test("noFields: renders alarm time tip", () => {
    const el = renderEdgeState("noFields");
    const tip = el.querySelector(".bh-landing-tip");
    assert.ok(tip, "alarm time tip present");
    assert.match(tip.textContent, /Comp\. Alarm Time/);
});

test("loading: title and loading icon class", () => {
    const el = renderEdgeState("loading");
    assert.equal(el.querySelector("h2").textContent, "Loading machine data");
    assert.ok(el.querySelector(".bucket-health-state__icon--loading"), "icon has --loading class");
});

test("invalidConfig with missingRoles: shows missing role list using display names", () => {
    const el = renderEdgeState("invalidConfig", undefined, ["machine", "status"]);
    const list = el.querySelector(".bucket-health-state__field-list--missing");
    assert.ok(list, "missing list present");
    const items = el.querySelectorAll(".bucket-health-state__field-item--missing");
    assert.equal(items.length, 2);
    const names = [...items].map(li => li.querySelector(".bucket-health-state__field-name").textContent);
    assert.deepEqual(names, ["Machine", "Component Status"]);
});

test("invalidConfig with missingRoles: unknown role key falls back to raw string", () => {
    const el = renderEdgeState("invalidConfig", undefined, ["unknownRole"]);
    const item = el.querySelector(".bucket-health-state__field-item--missing");
    assert.equal(item.querySelector(".bucket-health-state__field-name").textContent, "unknownRole");
});

test("invalidConfig with empty missingRoles and no detail: no list, no detail paragraph", () => {
    const el = renderEdgeState("invalidConfig", undefined, []);
    assert.equal(el.querySelector(".bucket-health-state__field-list--missing"), null);
    assert.equal(el.querySelector(".bucket-health-state__detail"), null);
    assert.match(el.querySelector("h2").textContent, /Configuration incomplete/);
});

test("invalidConfig with detail only (no missingRoles): shows detail paragraph", () => {
    const el = renderEdgeState("invalidConfig", "Some configuration detail");
    assert.equal(el.querySelector(".bucket-health-state__field-list--missing"), null);
    const detail = el.querySelector(".bucket-health-state__detail");
    assert.ok(detail, "detail paragraph present");
    assert.equal(detail.textContent, "Some configuration detail");
});

test("noData: title and empty icon class", () => {
    const el = renderEdgeState("noData");
    assert.equal(el.querySelector("h2").textContent, "No machines to show");
    assert.ok(el.querySelector(".bucket-health-state__icon--empty"), "icon has --empty class");
});

test("error with detail: shows error code element prefixed with ERR", () => {
    const el = renderEdgeState("error", "something broke");
    assert.match(el.querySelector("h2").textContent, /render the visual/);
    const code = el.querySelector(".bucket-health-state__error-detail");
    assert.ok(code, "error code element present");
    assert.match(code.textContent, /ERR/);
    assert.match(code.textContent, /something broke/);
});

test("error without detail: no error code element rendered", () => {
    const el = renderEdgeState("error");
    assert.equal(el.querySelector(".bucket-health-state__error-detail"), null);
});
