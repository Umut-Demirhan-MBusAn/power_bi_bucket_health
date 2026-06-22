import { MachineBucketModel } from "../data/types";
import { columnCount } from "../layout/columnCount";
import { renderMachineCard } from "./renderMachineCard";

export function renderFleet(machines: MachineBucketModel[]): HTMLElement {
    const section = document.createElement("section");
    section.className = "bucket-health";

    const header = document.createElement("header");
    header.className = "bucket-health__header";

    const title = document.createElement("h1");
    title.textContent = "Bucket Health";

    const summary = document.createElement("p");
    summary.textContent = `${machines.length} machine${machines.length === 1 ? "" : "s"} loaded`;

    header.append(title, summary);
    section.appendChild(header);

    const count = columnCount(machines.length);
    const grid = document.createElement("div");
    grid.className = machines.length === 1
        ? "bucket-health__grid bucket-health__grid--single"
        : "bucket-health__grid";
    grid.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;

    machines.forEach((machine) => grid.appendChild(renderMachineCard(machine)));
    section.appendChild(grid);

    return section;
}
