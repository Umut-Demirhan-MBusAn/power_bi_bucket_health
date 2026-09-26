const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCompositeKey } = require("../../.tmp/test-build/src/data/keys");

test("buildCompositeKey JSON-encodes two parts", () => {
    assert.equal(buildCompositeKey("M1", "C1"), JSON.stringify(["M1", "C1"]));
});

test("buildCompositeKey JSON-encodes three parts", () => {
    assert.equal(buildCompositeKey("M1", "C1", "t123"), JSON.stringify(["M1", "C1", "t123"]));
});

test("buildCompositeKey with a single part", () => {
    assert.equal(buildCompositeKey("a"), JSON.stringify(["a"]));
});

test("buildCompositeKey with an empty string part preserves it", () => {
    assert.equal(buildCompositeKey("x", ""), JSON.stringify(["x", ""]));
});

test("buildCompositeKey distinguishes parts that would collide under naive delimiter joining", () => {
    assert.notEqual(buildCompositeKey("A|#|B", "C"), buildCompositeKey("A", "B|#|C"));
});
