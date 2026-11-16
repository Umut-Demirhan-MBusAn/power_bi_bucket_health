const test = require("node:test");
const assert = require("node:assert/strict");

const { AlarmAudio } = require("../../.tmp/test-build/src/audio/alarmAudio");

// Fake AudioContext factory. Returns { createContext, ctx } so a test can inject the factory and
// inspect the context: how often it was created, resumed and closed, and the alarm's master gain.
function fakeContextFactory(initialState) {
    let created = 0;
    const ctx = {
        currentTime: 0,
        state: initialState || "suspended",
        destination: { name: "destination" },
        oscillators: 0,
        masters: [],
        resumes: 0,
        closes: 0,
        get contexts() {
            return created;
        },
        createOscillator() {
            this.oscillators++;
            return {
                type: "",
                frequency: { value: 0 },
                target: null,
                connect(target) {
                    this.target = target;
                },
                start() {},
                stop() {},
            };
        },
        createGain() {
            const gain = {
                gain: { value: 0 },
                target: null,
                disconnects: 0,
                connect(target) {
                    this.target = target;
                },
                disconnect() {
                    this.disconnects++;
                    this.target = null;
                },
            };
            this.masters.push(gain);
            return gain;
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
    return {
        createContext: () => {
            created++;
            return ctx;
        },
        ctx,
    };
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

test("arm() resumes a context Safari left interrupted", () => {
    const { createContext, ctx } = fakeContextFactory("interrupted");
    const audio = new AlarmAudio(createContext);

    audio.arm();

    assert.equal(ctx.resumes, 1);
});

test("start() routes each beep's two tones through one master gain on the destination", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    const oscAfterStart = ctx.oscillators;
    const master = ctx.masters[0];
    audio.dismiss();

    assert.equal(oscAfterStart, 2, "the first beep is two tones");
    assert.equal(ctx.masters.length, 1, "one master gain per alarm");
    assert.equal(master.gain.value, 0.12);
});

test("start() resumes a suspended context", () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    const audio = new AlarmAudio(createContext);

    audio.start();
    const resumesAfterStart = ctx.resumes;
    audio.dismiss();

    assert.ok(resumesAfterStart >= 1, "suspended context is resumed on start");
});

test("no tones are scheduled while the context is not running, so none pile up for a resume", (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
    const { createContext, ctx } = fakeContextFactory("suspended");
    ctx.resume = function () {
        this.resumes++;
        return Promise.resolve();
    };
    const audio = new AlarmAudio(createContext);

    audio.start();
    t.mock.timers.tick(4500);
    assert.equal(ctx.oscillators, 0, "a stalled context gets no tones");

    ctx.state = "running";
    t.mock.timers.tick(1500);
    assert.equal(ctx.oscillators, 2, "the next tick after a resume plays one beep");
    audio.dismiss();
});

test("when start() has to resume the context, the first beep plays once the resume lands", async () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    let land;
    ctx.resume = function () {
        this.resumes++;
        return new Promise((resolve) => {
            land = () => {
                this.state = "running";
                resolve();
            };
        });
    };
    const audio = new AlarmAudio(createContext);

    audio.start();
    assert.equal(ctx.oscillators, 0, "nothing is scheduled on a suspended context");
    land();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(ctx.oscillators, 2, "the skipped beep plays when resume() settles");
    audio.dismiss();
});

test("a resume that lands after a dismiss plays nothing", async () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    let land;
    ctx.resume = function () {
        return new Promise((resolve) => {
            land = () => {
                this.state = "running";
                resolve();
            };
        });
    };
    const audio = new AlarmAudio(createContext);

    audio.start();
    audio.dismiss();
    land();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(ctx.oscillators, 0);
});

test("dismiss() disconnects the master gain and keeps the context open", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    const master = ctx.masters[0];
    assert.equal(master.target, ctx.destination);
    audio.dismiss();

    assert.equal(master.disconnects, 1, "the alarm is silenced at once");
    assert.equal(ctx.closes, 0, "the gesture-unlocked context stays open");
});

test("a click (arm then dismiss) keeps the unlocked context for a later alarm", () => {
    const { createContext, ctx } = fakeContextFactory("suspended");
    const audio = new AlarmAudio(createContext);

    audio.arm();
    audio.dismiss();
    audio.start();
    const oscillators = ctx.oscillators;
    audio.dismiss();

    assert.equal(ctx.contexts, 1, "start() reuses the context the click unlocked");
    assert.equal(ctx.resumes, 1, "resumed once, inside the click");
    assert.equal(ctx.closes, 0);
    assert.equal(oscillators, 2, "the later alarm beeps");
});

test("a second alarm after a dismiss gets a fresh master gain", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    audio.dismiss();
    audio.start();

    assert.equal(ctx.masters.length, 2);
    assert.equal(ctx.masters[1].target, ctx.destination);
    audio.dismiss();
});

test("destroy() disconnects the master gain and closes the context", () => {
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    audio.destroy();

    assert.equal(ctx.masters[0].disconnects, 1);
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
    assert.equal(ctx.masters.length, 1);
});

test("start() schedules 3 beeps by 3000ms: the initial beep plus two 1500ms interval ticks", (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    assert.equal(ctx.oscillators, 2, "start() fires the initial beep synchronously (2 tones)");

    t.mock.timers.tick(1500);
    assert.equal(ctx.oscillators, 4, "first 1500ms interval tick fires a second beep");

    t.mock.timers.tick(1500);
    assert.equal(ctx.oscillators, 6, "second 1500ms interval tick fires a third beep (3 total by 3000ms)");

    audio.dismiss();
});

test("start() auto-stops at 60000ms: master disconnected, context kept; a later start() plays again", (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
    const { createContext, ctx } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    audio.start();
    t.mock.timers.tick(60000);

    assert.equal(ctx.masters[0].disconnects, 1, "the 60000ms stopTimeout silences the alarm");
    assert.equal(ctx.closes, 0, "auto-stop keeps the unlocked context");
    const oscillatorsAtStop = ctx.oscillators;
    t.mock.timers.tick(3000);
    assert.equal(ctx.oscillators, oscillatorsAtStop, "the interval is cleared");

    audio.start();
    assert.equal(ctx.oscillators, oscillatorsAtStop + 2, "playing was reset, so start() beeps again");

    audio.dismiss();
});

test("isPlaying() is true from start() until dismiss() or the 60000ms auto-stop", (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
    const { createContext } = fakeContextFactory("running");
    const audio = new AlarmAudio(createContext);

    assert.equal(audio.isPlaying(), false);
    audio.start();
    assert.equal(audio.isPlaying(), true);
    audio.dismiss();
    assert.equal(audio.isPlaying(), false);

    audio.start();
    t.mock.timers.tick(60000);
    assert.equal(audio.isPlaying(), false);
});
