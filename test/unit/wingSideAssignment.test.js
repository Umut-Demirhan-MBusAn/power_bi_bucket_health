const test = require("node:test");
const assert = require("node:assert/strict");

const { assignWingSides } = require("../../.tmp/test-build/src/domain/wingSideAssignment");

function wing(order, sourceOrder = order) {
    return {
        machineKey: "EX-204",
        componentKey: `W${order}`,
        category: "wingShroud",
        order,
        status: "ok",
        tooltipFields: [],
        sourceOrder
    };
}

test("assignWingSides defaults odd orders left and even orders right", () => {
    const result = assignWingSides([wing(1), wing(2), wing(3), wing(4)]);

    assert.deepEqual(result.map((component) => component.derivedWingSide), ["left", "right", "left", "right"]);
});

test("assignWingSides supports odd-right/even-left mode", () => {
    const result = assignWingSides([wing(1), wing(2), wing(3), wing(4)], "OddRightEvenLeft");

    assert.deepEqual(result.map((component) => component.derivedWingSide), ["right", "left", "right", "left"]);
});

test("assignWingSides supports first-half-left/second-half-right mode", () => {
    const result = assignWingSides([wing(1), wing(2), wing(3), wing(4), wing(5)], "FirstHalfLeftSecondHalfRight");

    assert.deepEqual(result.map((component) => component.derivedWingSide), ["left", "left", "left", "right", "right"]);
});

test("assignWingSides supports first-half-right/second-half-left mode", () => {
    const result = assignWingSides([wing(1), wing(2), wing(3), wing(4), wing(5)], "FirstHalfRightSecondHalfLeft");

    assert.deepEqual(result.map((component) => component.derivedWingSide), ["right", "right", "right", "left", "left"]);
});

test("assignWingSides sorts by component order before assigning sides", () => {
    const result = assignWingSides([wing(4, 1), wing(2, 2), wing(1, 3), wing(3, 4)]);

    assert.deepEqual(result.map((component) => component.componentKey), ["W1", "W2", "W3", "W4"]);
    assert.deepEqual(result.map((component) => component.derivedWingSide), ["left", "right", "left", "right"]);
});
