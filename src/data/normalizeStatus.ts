import { BucketStatusKey } from "./types";

const statusMap = new Map<string, BucketStatusKey>([
    ["ok", "ok"],
    ["no data (1h)", "nodata"],
    ["nodata", "nodata"],
    ["no data", "nodata"],
    ["lockout", "lockout"],
    ["lockout + no data", "lockoutnd"],
    ["lockout+no data", "lockoutnd"],
    ["lockoutnd", "lockoutnd"],
    ["proximity alarm", "prox"],
    ["proximity", "prox"],
    ["prox", "prox"],
    ["movement alarm", "move"],
    ["movement", "move"],
    ["move", "move"]
]);

export function normalizeStatus(value: unknown): BucketStatusKey | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    return statusMap.get(String(value).trim().toLowerCase());
}

export function isAlarmStatus(status: BucketStatusKey): boolean {
    return status === "prox" || status === "move";
}
