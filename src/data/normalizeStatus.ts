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

    return statusMap.get(normalizeStatusText(String(value)));
}

// Tolerates common source-system formatting drift before the exact-match lookup: collapses runs
// of whitespace to one space, normalizes spacing around "+" (e.g. "Lockout +No Data"), and
// inserts a space before "(" (e.g. "No Data(1h)" -> "no data (1h)"). Existing accepted spellings
// (already spaced this way) are unaffected.
function normalizeStatusText(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*\+\s*/g, " + ")
        .replace(/\s*\(/g, " (")
        .trim();
}

export function isAlarmStatus(status: BucketStatusKey): boolean {
    return status === "prox" || status === "move";
}
