const test = require("node:test");
const assert = require("node:assert/strict");
const { COMPOSITE_KEY_SEPARATOR, buildCompositeKey } = require("../../.tmp/test-build/src/data/keys");

test("COMPOSITE_KEY_SEPARATOR has the expected value", () => {
    assert.equal(COMPOSITE_KEY_SEPARATOR, "|#|");
});

test("buildCompositeKey joins two parts with separator", () => {
    assert.equal(buildCompositeKey("M1", "C1"), "M1|#|C1");
});

test("buildCompositeKey joins three parts with separator", () => {
    assert.equal(buildCompositeKey("M1", "C1", "t123"), "M1|#|C1|#|t123");
});

test("buildCompositeKey with a single part returns it unchanged", () => {
    assert.equal(buildCompositeKey("a"), "a");
});

test("buildCompositeKey with an empty string part preserves it", () => {
    assert.equal(buildCompositeKey("x", ""), "x|#|");
});
