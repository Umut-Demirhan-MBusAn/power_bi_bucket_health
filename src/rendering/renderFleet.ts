import { MachineBucketModel } from "../data/types";
import { renderMachineCard } from "./renderMachineCard";

export function renderFleet(machines: MachineBucketModel[]): HTMLElement {
    const section = document.createElement("section");
    section.className = "bucket-health";

    const grid = document.createElement("div");
    grid.className = machines.length === 1
        ? "bucket-health__grid bucket-health__grid--single"
        : "bucket-health__grid";

    machines.forEach((machine) => grid.appendChild(renderMachineCard(machine)));
    section.appendChild(grid);

    return section;
}
