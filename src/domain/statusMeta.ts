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

// Reduces a machine's component statuses to the single status that drives its frame color:
// - any alarm component -> alarm (movement outranks proximity)
// - else if every component is "no data" or "lockout + no data" -> nodata
// - otherwise -> ok
export function machineStatusKey(statuses: BucketStatusKey[]): BucketStatusKey {
    if (statuses.some((status) => status === "move")) {
        return "move";
    }
    if (statuses.some((status) => status === "prox")) {
        return "prox";
    }
    if (statuses.length > 0 && statuses.every((status) => status === "nodata" || status === "lockoutnd")) {
        return "nodata";
    }
    return "ok";
}
