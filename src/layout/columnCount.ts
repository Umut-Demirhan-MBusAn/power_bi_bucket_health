export function columnCount(machineCount: number): number {
    if (machineCount <= 1) return 1;
    if (machineCount <= 2) return 2;
    if (machineCount <= 6) return 3;
    if (machineCount <= 12) return 4;
    return 5;
}
