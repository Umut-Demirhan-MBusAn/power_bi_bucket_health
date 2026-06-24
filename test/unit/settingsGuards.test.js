const test = require("node:test");
const assert = require("node:assert/strict");
const { asWingSideAssignment, asComponentOrderDirection, asAlarmMotion } =
    require("../../.tmp/test-build/src/domain/settingsGuards");

// asWingSideAssignment
test("asWingSideAssignment: valid OddLeftEvenRight is returned as-is", () => {
    assert.equal(asWingSideAssignment("OddLeftEvenRight"), "OddLeftEvenRight");
});

test("asWingSideAssignment: valid OddRightEvenLeft is returned as-is", () => {
    assert.equal(asWingSideAssignment("OddRightEvenLeft"), "OddRightEvenLeft");
});

test("asWingSideAssignment: valid FirstHalfLeftSecondHalfRight is returned as-is", () => {
    assert.equal(asWingSideAssignment("FirstHalfLeftSecondHalfRight"), "FirstHalfLeftSecondHalfRight");
});

test("asWingSideAssignment: valid FirstHalfRightSecondHalfLeft is returned as-is", () => {
    assert.equal(asWingSideAssignment("FirstHalfRightSecondHalfLeft"), "FirstHalfRightSecondHalfLeft");
});

test("asWingSideAssignment: unknown string bogus returns default OddLeftEvenRight", () => {
    assert.equal(asWingSideAssignment("bogus"), "OddLeftEvenRight");
});

test("asWingSideAssignment: undefined returns default OddLeftEvenRight", () => {
    assert.equal(asWingSideAssignment(undefined), "OddLeftEvenRight");
});

test("asWingSideAssignment: null returns default OddLeftEvenRight", () => {
    assert.equal(asWingSideAssignment(null), "OddLeftEvenRight");
});

// asComponentOrderDirection
test("asComponentOrderDirection: leftToRight returns leftToRight", () => {
    assert.equal(asComponentOrderDirection("leftToRight"), "leftToRight");
});

test("asComponentOrderDirection: rightToLeft returns rightToLeft", () => {
    assert.equal(asComponentOrderDirection("rightToLeft"), "rightToLeft");
});

test("asComponentOrderDirection: bogus returns default leftToRight", () => {
    assert.equal(asComponentOrderDirection("bogus"), "leftToRight");
});

test("asComponentOrderDirection: undefined returns default leftToRight", () => {
    assert.equal(asComponentOrderDirection(undefined), "leftToRight");
});

// asAlarmMotion
test("asAlarmMotion: always returns always", () => {
    assert.equal(asAlarmMotion("always"), "always");
});

test("asAlarmMotion: auto returns auto", () => {
    assert.equal(asAlarmMotion("auto"), "auto");
});

test("asAlarmMotion: never returns never", () => {
    assert.equal(asAlarmMotion("never"), "never");
});

test("asAlarmMotion: bogus returns default always", () => {
    assert.equal(asAlarmMotion("bogus"), "always");
});

test("asAlarmMotion: undefined returns default always", () => {
    assert.equal(asAlarmMotion(undefined), "always");
});
