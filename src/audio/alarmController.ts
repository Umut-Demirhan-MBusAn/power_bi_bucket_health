import { BucketHealthDataModel, BucketStatusKey, ComponentRecord, MachineBucketModel } from "../data/types";
import { isAlarmStatus } from "../data/normalizeStatus";
import { AlarmAudio } from "./alarmAudio";

export class AlarmController {
    private readonly audio = new AlarmAudio();
    private previousStatuses = new Map<string, BucketStatusKey>();
    private initialized = false;

    update(model: BucketHealthDataModel, audioEnabled: boolean): void {
        if (model.state !== "ready") {
            this.previousStatuses.clear();
            this.initialized = false;
            return;
        }

        const allComponents = collectComponents(model.machines);

        if (this.initialized && audioEnabled) {
            const hasFreshAlarm = allComponents.some((component) => {
                const prev = this.previousStatuses.get(component.componentKey);
                return isAlarmStatus(component.status) && (prev === undefined || !isAlarmStatus(prev));
            });

            if (hasFreshAlarm) {
                this.audio.start();
            }
        }

        allComponents.forEach((component) => {
            this.previousStatuses.set(component.componentKey, component.status);
        });
        this.initialized = true;
    }

    dismiss(): void {
        this.audio.dismiss();
    }

    destroy(): void {
        this.audio.destroy();
    }
}

function collectComponents(machines: MachineBucketModel[]): ComponentRecord[] {
    const result: ComponentRecord[] = [];
    machines.forEach((machine) => {
        result.push(...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight);
    });
    return result;
}
