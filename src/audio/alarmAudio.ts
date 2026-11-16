export class AlarmAudio {
    // The context a click unlocked must outlive dismissal: the visual runs in a sandboxed
    // cross-origin iframe, where a context created later, without a user gesture, starts suspended
    // and cannot be resumed, so the alarm would play silently. Only destroy() closes it.
    private context: AudioContext | null = null;
    // Every tone of one alarm runs through this node; disconnecting it silences the alarm at once
    // and frees its tone nodes, which matters because the context lives for the whole session.
    private master: GainNode | null = null;
    private stopTimeout: ReturnType<typeof setTimeout> | null = null;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private playing = false;
    private onLockChange: (() => void) | null = null;

    constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

    arm(): void {
        try {
            this.ensureRunning();
        } catch {
            /* ignore */
        }
    }

    // Creates the context up front, without a gesture, so the visual can tell whether the browser
    // has audio locked (the Service) or not (Desktop) and prompt for the unlocking click. It never
    // calls resume(): without a gesture that only logs an autoplay warning on every refresh, and an
    // unlocked host starts the context by itself.
    prepare(onLockChange: () => void): void {
        this.onLockChange = onLockChange;
        try {
            this.ensureContext();
        } catch {
            /* ignore */
        }
    }

    // False without a context (no Web Audio): no click could unlock one, so nothing should ask.
    isLocked(): boolean {
        return this.context !== null && this.context.state !== "running";
    }

    start(): void {
        if (this.playing) return;
        this.playing = true;
        try {
            const context = this.ensureRunning(() => {
                // resume() settles asynchronously, so the beep start() skipped plays now.
                if (this.playing) this.scheduleBeep();
            });
            this.master = context.createGain();
            this.master.gain.value = 0.12;
            this.master.connect(context.destination);
            this.scheduleBeep();
            this.intervalId = setInterval(() => this.scheduleBeep(), 1500);
            this.stopTimeout = setTimeout(() => this.stop(), 60000);
        } catch {
            this.stop();
        }
    }

    dismiss(): void {
        this.stop();
    }

    isPlaying(): boolean {
        return this.playing;
    }

    destroy(): void {
        this.stop();
        if (this.context) {
            this.context.close().catch(() => undefined);
            this.context = null;
        }
    }

    // "interrupted" (Safari) as well as "suspended": a kept context can stall either way.
    private ensureRunning(onResumed?: () => void): AudioContext {
        const context = this.ensureContext();
        if (context.state !== "running") {
            context.resume().then(onResumed, () => undefined);
        }
        return context;
    }

    private ensureContext(): AudioContext {
        if (!this.context) {
            this.context = this.createContext();
            this.context.onstatechange = () => this.onLockChange?.();
        }
        return this.context;
    }

    private scheduleBeep(): void {
        // currentTime is frozen while the context is not running, so tones scheduled then would all
        // sound at once when it resumes.
        if (!this.context || !this.master || this.context.state !== "running") return;
        const now = this.context.currentTime;
        this.tone(880, now, 0.24);
        this.tone(660, now + 0.24, 0.24);
    }

    private tone(freq: number, start: number, duration: number): void {
        if (!this.context || !this.master) return;
        const osc = this.context.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        osc.connect(this.master);
        osc.start(start);
        osc.stop(start + duration);
    }

    private stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.stopTimeout !== null) {
            clearTimeout(this.stopTimeout);
            this.stopTimeout = null;
        }
        if (this.master) {
            try { this.master.disconnect(); } catch { /* ignore */ }
            this.master = null;
        }
        this.playing = false;
    }
}
