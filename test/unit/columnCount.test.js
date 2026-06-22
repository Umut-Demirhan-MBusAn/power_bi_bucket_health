const test = require("node:test");
const assert = require("node:assert/strict");

const { columnCount } = require("../../.tmp/test-build/src/layout/columnCount");

test("columnCount returns 1 for zero machines", () => {
    assert.equal(columnCount(0), 1);
});

test("columnCount returns 1 for one machine", () => {
    assert.equal(columnCount(1), 1);
});

test("columnCount returns 2 for two machines", () => {
    assert.equal(columnCount(2), 2);
});

test("columnCount returns 3 for 3 machines", () => {
    assert.equal(columnCount(3), 3);
});

test("columnCount returns 3 for 6 machines", () => {
    assert.equal(columnCount(6), 3);
});

test("columnCount returns 4 for 7 machines", () => {
    assert.equal(columnCount(7), 4);
});

test("columnCount returns 4 for 12 machines", () => {
    assert.equal(columnCount(12), 4);
});

test("columnCount returns 5 for 13 machines", () => {
    assert.equal(columnCount(13), 5);
});

test("columnCount returns 5 for 20 machines", () => {
    assert.equal(columnCount(20), 5);
});
