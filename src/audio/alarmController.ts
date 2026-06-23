import { BucketHealthDataModel, ComponentRecord, MachineBucketModel } from "../data/types";
import { isAlarmStatus } from "../data/normalizeStatus";
import { COMPOSITE_KEY_SEPARATOR } from "../data/keys";
import { AlarmAudio } from "./alarmAudio";

export interface AlarmSink {
    start(): void;
    arm(): void;
    dismiss(): void;
    destroy(): void;
}

export function buildAlarmId(machineKey: string, componentKey: string, alarmTime: ComponentRecord["alarmTime"]): string {
    const time = alarmTime === null || alarmTime === undefined ? "" : String(alarmTime);
    return machineKey + COMPOSITE_KEY_SEPARATOR + componentKey + COMPOSITE_KEY_SEPARATOR + time;
}

export function collectAlarmIds(machines: MachineBucketModel[]): Set<string> {
    const ids = new Set<string>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => {
            if (isAlarmStatus(component.status)) {
                ids.add(buildAlarmId(machine.key, component.componentKey, component.alarmTime));
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
