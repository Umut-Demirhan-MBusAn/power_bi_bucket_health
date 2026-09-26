import { BucketStatusKey } from "../data/types";

export const statusColors: Record<BucketStatusKey, string> = {
    ok: "#34D399",
    nodata: "#F4C04E",
    lockout: "#5BA8F5",
    lockoutnd: "#3B5BD9",
    prox: "#FF5A5A",
    move: "#C42B4A"
};

export const statusLabels: Record<BucketStatusKey, string> = {
    ok: "OK",
    nodata: "No Data (1h)",
    lockout: "Lockout",
    lockoutnd: "Lockout + No Data",
    prox: "Proximity Alarm",
    move: "Movement Alarm"
};

// Host-provided theme. `isHighContrast` mirrors the Power BI high-contrast mode; the
// foreground/background/foregroundSelected colors come from the host color palette.
export interface VisualTheme {
    isHighContrast: boolean;
    foreground: string;
    background: string;
    foregroundSelected: string;
}

// Resolves the fill/stroke/strokeWidth for a single bucket component.
// In high-contrast mode the host colors take over and alarm components (prox/move) use the
// selected-foreground accent with a heavier stroke. In normal mode the status palette drives
// the fill and the stroke is a darkened variant of the same color.
export function resolveComponentColors(
    status: BucketStatusKey,
    theme: VisualTheme
): { fill: string; stroke: string; strokeWidth: number } {
    if (theme.isHighContrast) {
        const isAlarm = status === "prox" || status === "move";
        return {
            fill: theme.background,
            stroke: isAlarm ? theme.foregroundSelected : theme.foreground,
            strokeWidth: isAlarm ? 3 : 2
        };
    }

    return {
        fill: statusColors[status],
        stroke: darkenHex(statusColors[status], 0.42),
        strokeWidth: 1.5
    };
}

// Self-contained hex darkener (mixes the color toward black by `amount`).
function darkenHex(hex: string, amount: number): string {
    const value = hex.replace("#", "");
    const red = Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount));
    const green = Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount));
    const blue = Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount));
    const toHex = (channel: number): string => channel.toString(16).padStart(2, "0");
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

// The single implementation of move-over-prox alarm precedence, shared by parseDataView (machine
// alarm fields) and machineStatusKey (frame color). The bucket geometry engine still derives its
// own center alarm label separately (its alarm handling is reworked in a later task).
export function dominantAlarm(statuses: BucketStatusKey[]): "move" | "prox" | undefined {
    if (statuses.some((status) => status === "move")) {
        return "move";
    }
    if (statuses.some((status) => status === "prox")) {
        return "prox";
    }
    return undefined;
}

// Reduces a machine's component statuses to the single status that drives its frame color:
// - any alarm component -> alarm (movement outranks proximity)
// - else if every component is "no data" or "lockout + no data" -> nodata
// - otherwise -> ok
export function machineStatusKey(statuses: BucketStatusKey[]): BucketStatusKey {
    const alarm = dominantAlarm(statuses);
    if (alarm) {
        return alarm;
    }
    if (statuses.length > 0 && statuses.every((status) => status === "nodata" || status === "lockoutnd")) {
        return "nodata";
    }
    return "ok";
}
