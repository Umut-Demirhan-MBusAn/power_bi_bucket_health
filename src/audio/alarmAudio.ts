export class AlarmAudio {
    private context: AudioContext | null = null;
    private stopTimeout: ReturnType<typeof setTimeout> | null = null;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private playing = false;

    constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

    arm(): void {
        try {
            if (!this.context) {
                this.context = this.createContext();
            }
            if (this.context.state === "suspended") {
                void this.context.resume();
            }
        } catch {
            /* ignore */
        }
    }

    start(): void {
        if (this.playing) return;
        this.playing = true;
        try {
            if (!this.context) {
                this.context = this.createContext();
            }
            if (this.context.state === "suspended") {
                void this.context.resume();
            }
            this.scheduleBeep();
            this.intervalId = setInterval(() => this.scheduleBeep(), 1500);
            this.stopTimeout = setTimeout(() => this.stop(), 60000);
        } catch {
            this.playing = false;
        }
    }

    dismiss(): void {
        this.stop();
    }

    destroy(): void {
        this.stop();
    }

    private scheduleBeep(): void {
        if (!this.context) return;
        const now = this.context.currentTime;
        this.tone(880, now, 0.24);
        this.tone(660, now + 0.24, 0.24);
    }

    private tone(freq: number, start: number, duration: number): void {
        if (!this.context) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(this.context.destination);
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
        if (this.context) {
            try { this.context.close(); } catch { /* ignore */ }
            this.context = null;
        }
        this.playing = false;
    }
}
