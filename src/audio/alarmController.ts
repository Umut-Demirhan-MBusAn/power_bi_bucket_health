import { BucketHealthDataModel, BucketStatusKey, MachineBucketModel } from "../data/types";
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

export function buildComponentId(machine: string, component: string): string {
    return buildCompositeKey(machine, component);
}

export function collectComponentStatuses(machines: MachineBucketModel[]): Map<string, BucketStatusKey> {
    const statuses = new Map<string, BucketStatusKey>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => {
            const id = buildComponentId(machine.key, component.componentKey);
            // Duplicate rows for one component: an alarm row wins, so the result never depends on row order.
            const seen = statuses.get(id);
            if (seen === undefined || (!isAlarmStatus(seen) && isAlarmStatus(component.status))) {
                statuses.set(id, component.status);
            }
        });
    });
    return statuses;
}

export class AlarmController {
    // Source rows repeat an ongoing alarm with a fresh alarm time on every refresh, so audio keys on
    // a component's status transition, never on alarmTime. Components absent from a refresh keep
    // their last status: a filtered or partial load must not make an ongoing alarm sound again.
    private readonly lastStatus = new Map<string, BucketStatusKey>();
    private seeded = false;

    constructor(private readonly audio: AlarmSink = new AlarmAudio()) {}

    update(model: BucketHealthDataModel, audioEnabled: boolean): void {
        if ((!audioEnabled || model.state !== "ready") && this.audio.isPlaying()) {
            this.audio.dismiss();
        }

        if (model.state !== "ready") {
            return;
        }

        const current = collectComponentStatuses(model.machines);

        // First render seeds the statuses so pre-existing alarms do not blast audio on open.
        let hasNew = false;
        current.forEach((status, id) => {
            if (this.seeded && isAlarmStatus(status) && this.lastStatus.get(id) !== status) {
                hasNew = true;
            }
            this.lastStatus.set(id, status);
        });
        this.seeded = true;

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
