import { BucketHealthDataState } from "../data/types";

export function renderEdgeState(
    state: Exclude<BucketHealthDataState, "ready">,
    detail?: string
): HTMLElement {
    const container = document.createElement("div");
    container.className = "bucket-health-state";

    const title = document.createElement("h1");
    const message = document.createElement("p");

    switch (state) {
        case "noFields":
            title.textContent = "Add data to get started";
            message.textContent = "Bind Machine, Component, Category, Order, and Status fields.";
            break;
        case "loading":
            title.textContent = "Loading machine data";
            message.textContent = "Waiting for data from Power BI.";
            break;
        case "invalidConfig":
            title.textContent = "Configuration incomplete";
            message.textContent = detail ?? "Check required data role bindings.";
            break;
        case "noData":
            title.textContent = "No machines to show";
            message.textContent = "No rows match the current filters or slicers.";
            break;
        case "error":
        default:
            title.textContent = "Couldn't render the visual";
            message.textContent = detail ?? "An unexpected error occurred.";
            break;
    }

    container.append(title, message);
    return container;
}
