import powerbi from "powerbi-visuals-api";

import PrimitiveValue = powerbi.PrimitiveValue;

export type BucketStatusKey =
    | "ok"
    | "nodata"
    | "lockout"
    | "lockoutnd"
    | "prox"
    | "move";

export type ComponentCategory = "tooth" | "lipShroud" | "wingShroud";
export type WingSide = "left" | "right";
export type WingSideAssignment =
    | "OddLeftEvenRight"
    | "OddRightEvenLeft"
    | "FirstHalfLeftSecondHalfRight"
    | "FirstHalfRightSecondHalfLeft";

export interface TooltipField {
    label: string;
    value: PrimitiveValue;
}

export interface ComponentRecord {
    machineKey: string;
    machineType?: string;
    componentKey: string;
    category: ComponentCategory;
    order: number;
    derivedWingSide?: WingSide;
    status: BucketStatusKey;
    lastSeen?: PrimitiveValue;
    tooltipFields: TooltipField[];
    sourceOrder: number;
}

export interface MachineBucketModel {
    key: string;
    name: string;
    type?: string;
    teeth: ComponentRecord[];
    lipShrouds: ComponentRecord[];
    wingShroudsLeft: ComponentRecord[];
    wingShroudsRight: ComponentRecord[];
    alarmCount: number;
    hasAlarm: boolean;
    dominantAlarm?: "prox" | "move";
    sourceOrder: number;
}

export type BucketHealthDataState = "noFields" | "loading" | "invalidConfig" | "noData" | "ready" | "error";

export interface BucketHealthDataModel {
    state: BucketHealthDataState;
    machines: MachineBucketModel[];
    missingRoles: string[];
    errors: string[];
}
