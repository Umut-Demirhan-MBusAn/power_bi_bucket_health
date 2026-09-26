import { BucketHealthDataModel, MachineBucketModel } from "../data/types";
import { isAlarmStatus } from "../data/normalizeStatus";
import { buildCompositeKey } from "../data/keys";
import { AlarmAudio } from "./alarmAudio";

export interface AlarmSink {
    start(): void;
    arm(): void;
    dismiss(): void;
    isPlaying(): boolean;
    destroy(): void;
}

export function buildAlarmId(machine: string, component: string, time: string | undefined): string {
    return buildCompositeKey(machine, component, time ?? "");
}

export function collectAlarmIds(machines: MachineBucketModel[]): Set<string> {
    const ids = new Set<string>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => {
            if (isAlarmStatus(component.status)) {
                const alarmTime = component.alarmTime === null || component.alarmTime === undefined
                    ? undefined
                    : String(component.alarmTime);
                ids.add(buildAlarmId(machine.key, component.componentKey, alarmTime));
            }
        });
    });
    return ids;
}

export class AlarmController {
    private readonly fired = new Set<string>();
    private seeded = false;

    constructor(private readonly audio: AlarmSink = new AlarmAudio()) {}

    update(model: BucketHealthDataModel, audioEnabled: boolean): void {
        // Only a sounding alarm is stopped: dismiss() also closes the gesture-unlocked context.
        if ((!audioEnabled || model.state !== "ready") && this.audio.isPlaying()) {
            this.audio.dismiss();
        }

        if (model.state !== "ready") {
            return;
        }

        const current = collectAlarmIds(model.machines);

        // First render seeds the cache so pre-existing alarms do not blast audio on open.
        if (!this.seeded) {
            current.forEach((id) => this.fired.add(id));
            this.seeded = true;
            return;
        }

        let hasNew = false;
        current.forEach((id) => {
            if (!this.fired.has(id)) {
                hasNew = true;
                this.fired.add(id);
            }
        });

        if (hasNew && audioEnabled) {
            this.audio.start();
        }
    }

    arm(): void {
        this.audio.arm();
    }

    dismiss(): void {
        this.audio.dismiss();
    }

    destroy(): void {
        this.audio.destroy();
    }
}
