import { ComponentOrderDirection, WingSideAssignment } from "../data/types";
import { defaultWingSideAssignment } from "./wingSideAssignment";

const WING_SIDE: WingSideAssignment[] = [
    "OddLeftEvenRight", "OddRightEvenLeft",
    "FirstHalfLeftSecondHalfRight", "FirstHalfRightSecondHalfLeft"
];
const COMPONENT_ORDER: ComponentOrderDirection[] = ["leftToRight", "rightToLeft"];
const ALARM_MOTION: Array<"always" | "auto" | "never"> = ["always", "auto", "never"];

export function asWingSideAssignment(val: unknown): WingSideAssignment {
    return (WING_SIDE as unknown[]).includes(val)
        ? (val as WingSideAssignment)
        : defaultWingSideAssignment;
}

export function asComponentOrderDirection(val: unknown): ComponentOrderDirection {
    return (COMPONENT_ORDER as unknown[]).includes(val)
        ? (val as ComponentOrderDirection)
        : "leftToRight";
}

export function asAlarmMotion(val: unknown): "always" | "auto" | "never" {
    return (ALARM_MOTION as unknown[]).includes(val)
        ? (val as "always" | "auto" | "never")
        : "always";
}
