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

export type ComponentOrderDirection = "leftToRight" | "rightToLeft";

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
    alarmTime?: PrimitiveValue;
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
    // Problems found on this machine's own rows/counts; empty means the machine is valid.
    // Rendered as a capped list in place of the bucket SVG (see renderMachineCard).
    issues: string[];
    // True when this machine's row set was cut short by the host's row cap; its count-based
    // issues (teeth/lip/wing) are replaced by a single "row limit reached" issue when true.
    incomplete: boolean;
}

export type BucketHealthDataState = "noFields" | "loading" | "invalidConfig" | "noData" | "ready" | "error";

export interface BucketHealthDataModel {
    state: BucketHealthDataState;
    machines: MachineBucketModel[];
    missingRoles: string[];
    errors: string[];
    // True when the host's dataReductionAlgorithm cut the table short (segment metadata present).
    truncated: boolean;
    // Fleet-level warnings (e.g. rows skipped for a blank machine) rendered as a banner above the
    // grid in the "ready" state. Distinct from `errors`, which only populate non-"ready" states.
    warnings: string[];
}
