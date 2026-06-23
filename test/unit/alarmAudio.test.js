const test = require("node:test");
const assert = require("node:assert/strict");

const { AlarmAudio } = require("../../.tmp/test-build/src/audio/alarmAudio");

// Build a fake AudioContext factory. Returns { createContext, ctx } so a test
// can both inject the factory and inspect the resulting context's counters.
function fakeContextFactory(initialState) {
    const ctx = {
        currentTime: 0,
        state: initialState || "suspended",
        destination: {},
        oscillators: 0,
        gains: 0,
        resumes: 0,
        closes: 0,
        contexts: 1,
        createOscillator() {
            this.oscillators++;
            return {
                type: "",
                frequency: { value: 0 },
                connect() {},
                start() {},
                stop() {},
            };
        },
        createGain() {
            this.gains++;
            return { gain: { value: 0 }, connect() {} };
        },
        resume() {
            this.resumes++;
            this.state = "running";
            return Promise.resolve();
        },
        close() {
            this.closes++;
            return Promise.resolve();
        },
    };
    return { createContext: () => ctx, ctx };
}

test("arm() creates a context and calls resume()", () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    const audio = new AlarmAudio(createContext);

    audio.arm();

    assert.equal(ctx.contexts, 1, "context was created");
    assert.equal(ctx.resumes, 1, "resume() was called once");
    assert.equal(ctx.state, "running", "state flipped to running");
});

test("arm() does not call resume() when already running", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.arm();

    assert.equal(ctx.resumes, 0, "no resume when context already running");
});

test("start() schedules tones by creating oscillators", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    // Assert only on what happened synchronously; then clean up timers.
    const oscAfterStart = ctx.oscillators;
    const gainAfterStart = ctx.gains;
    audio.dismiss();

    assert.ok(oscAfterStart >= 2, `createOscillator called at least twice (got ${oscAfterStart})`);
    assert.ok(gainAfterStart >= 2, `createGain called at least twice (got ${gainAfterStart})`);
});

test("start() resumes a suspended context", () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    const audio = new AlarmAudio(createContext);

    audio.start();
    const resumesAfterStart = ctx.resumes;
    audio.dismiss();

    assert.ok(resumesAfterStart >= 1, "suspended context is resumed on start");
});

test("dismiss() closes the context", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    audio.dismiss();

    assert.equal(ctx.closes, 1, "close() called once on dismiss");
});

test("destroy() closes the context", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    audio.destroy();

    assert.equal(ctx.closes, 1, "close() called once on destroy");
});

test("start() is idempotent while already playing", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    const oscAfterFirst = ctx.oscillators;
    audio.start();
    const oscAfterSecond = ctx.oscillators;
    audio.dismiss();

    assert.equal(oscAfterSecond, oscAfterFirst, "second start() does not re-schedule tones");
});
