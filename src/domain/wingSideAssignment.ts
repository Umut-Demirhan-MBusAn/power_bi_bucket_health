import { ComponentRecord, WingSide, WingSideAssignment } from "../data/types";

export const defaultWingSideAssignment: WingSideAssignment = "OddLeftEvenRight";

export function assignWingSides(
    wingShrouds: ComponentRecord[],
    mode: WingSideAssignment = defaultWingSideAssignment
): ComponentRecord[] {
    const ordered = [...wingShrouds].sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder);
    const splitIndex = Math.ceil(ordered.length / 2);

    return ordered.map((wing, index) => ({
        ...wing,
        derivedWingSide: getWingSide(wing.order, index, splitIndex, mode)
    }));
}

function getWingSide(order: number, index: number, splitIndex: number, mode: WingSideAssignment): WingSide {
    switch (mode) {
        case "OddRightEvenLeft":
            return order % 2 === 1 ? "right" : "left";
        case "FirstHalfLeftSecondHalfRight":
            return index < splitIndex ? "left" : "right";
        case "FirstHalfRightSecondHalfLeft":
            return index < splitIndex ? "right" : "left";
        case "OddLeftEvenRight":
        default:
            return order % 2 === 1 ? "left" : "right";
    }
}
