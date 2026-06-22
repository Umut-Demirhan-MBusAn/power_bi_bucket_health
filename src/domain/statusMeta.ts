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

export const statusSeverity: Record<BucketStatusKey, number> = {
    ok: 0,
    nodata: 1,
    lockout: 2,
    lockoutnd: 3,
    prox: 4,
    move: 5
};

export function worstStatus(statuses: BucketStatusKey[]): BucketStatusKey {
    return statuses.reduce<BucketStatusKey>(
        (worst, current) => (statusSeverity[current] > statusSeverity[worst] ? current : worst),
        "ok"
    );
}
