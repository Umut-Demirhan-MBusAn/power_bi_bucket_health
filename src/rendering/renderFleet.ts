import { MachineBucketModel } from "../data/types";
import { VisualTheme } from "../domain/statusMeta";
import { renderMachineCard } from "./renderMachineCard";

export function renderFleet(
    machines: MachineBucketModel[],
    theme: VisualTheme,
    minCardWidth: number,
    truncated = false
): HTMLElement {
    const section = document.createElement("section");
    section.className = "bucket-health";

    if (truncated) {
        const banner = document.createElement("div");
        banner.className = "bh-truncation-warning";
        banner.textContent =
            "⚠ Data cap reached (2 000 rows) — some machines or components may not appear.";
        section.appendChild(banner);
    }

    const grid = document.createElement("div");
    grid.className = machines.length === 1
        ? "bucket-health__grid bucket-health__grid--single"
        : "bucket-health__grid";

    machines.forEach((machine) => grid.appendChild(renderMachineCard(machine, theme, minCardWidth)));
    section.appendChild(grid);

    return section;
}
