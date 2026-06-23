import { MachineBucketModel } from "../data/types";
import { VisualTheme } from "../domain/statusMeta";
import { renderMachineCard } from "./renderMachineCard";

export function renderFleet(machines: MachineBucketModel[], theme: VisualTheme): HTMLElement {
    const section = document.createElement("section");
    section.className = "bucket-health";

    const grid = document.createElement("div");
    grid.className = machines.length === 1
        ? "bucket-health__grid bucket-health__grid--single"
        : "bucket-health__grid";

    machines.forEach((machine) => grid.appendChild(renderMachineCard(machine, theme)));
    section.appendChild(grid);

    return section;
}
