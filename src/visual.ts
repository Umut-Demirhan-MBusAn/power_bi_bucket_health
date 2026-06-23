"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import { AlarmController } from "./audio/alarmController";
import { COMPOSITE_KEY_SEPARATOR } from "./data/keys";
import { parseDataView } from "./data/parseDataView";
import { BucketHealthDataModel, ComponentRecord, MachineBucketModel, WingSideAssignment } from "./data/types";
import { defaultWingSideAssignment } from "./domain/wingSideAssignment";
import { statusColors, statusLabels } from "./domain/statusMeta";
import { renderEdgeState } from "./rendering/renderEdgeStates";
import { renderFleet } from "./rendering/renderFleet";
import { VisualFormattingSettingsModel } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly target: HTMLElement;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly alarmController = new AlarmController();
    private formattingSettings = new VisualFormattingSettingsModel();
    private componentLookup = new Map<string, ComponentRecord>();
    private tooltip: HTMLElement | null = null;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("bucket-health-root");

        this.target.addEventListener("click", () => { this.alarmController.arm(); this.alarmController.dismiss(); });
        this.target.addEventListener("mousemove", (event) => this.handlePointerMove(event));
        this.target.addEventListener("mouseleave", () => this.hideTooltip());
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews?.[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel,
                dataView
            );

            const wingSideAssignment = (
                this.formattingSettings.ordering.wingSideAssignment.value?.value as WingSideAssignment | undefined
            ) ?? defaultWingSideAssignment;

            const audioEnabled = this.formattingSettings.alarm.audioEnabled.value ?? true;

            const alarmMotion = (this.formattingSettings.alarm.alarmMotion.value?.value as string | undefined) ?? "always";
            this.target.classList.toggle("bucket-health-root--flash-always", alarmMotion === "always");
            this.target.classList.toggle("bucket-health-root--flash-never", alarmMotion === "never");

            const model = parseDataView(dataView, wingSideAssignment);
            this.alarmController.update(model, audioEnabled);
            this.render(model);
            this.events.renderingFinished(options);
        } catch (error) {
            const errorModel: BucketHealthDataModel = {
                state: "error",
                machines: [],
                missingRoles: [],
                errors: [error instanceof Error ? error.message : String(error)]
            };
            this.render(errorModel);
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        this.alarmController.destroy();
        this.tooltip = null;
        this.target.replaceChildren();
    }

    private render(model: BucketHealthDataModel): void {
        this.hideTooltip();
        this.target.replaceChildren();
        this.tooltip = null;

        if (model.state !== "ready") {
            const detail = model.state === "invalidConfig"
                ? `Missing: ${model.missingRoles.join(", ")}`
                : model.state === "error"
                    ? model.errors.join(" ")
                    : undefined;
            this.target.appendChild(renderEdgeState(model.state, detail));
            this.componentLookup.clear();
            return;
        }

        this.componentLookup = buildComponentLookup(model.machines);
        this.target.appendChild(renderFleet(model.machines));
    }

    private handlePointerMove(event: MouseEvent): void {
        const target = event.target as Element | null;
        const componentEl = target?.closest("[data-component-key]");
        const machineEl = target?.closest("[data-machine-key]");

        if (!componentEl || !machineEl) {
            this.hideTooltip();
            return;
        }

        const componentKey = componentEl.getAttribute("data-component-key") ?? "";
        const machineKey = machineEl.getAttribute("data-machine-key") ?? "";
        const record = this.componentLookup.get(machineKey + COMPOSITE_KEY_SEPARATOR + componentKey);

        if (!record) {
            this.hideTooltip();
            return;
        }

        this.showTooltip(record, event);
    }

    private ensureTooltip(): HTMLElement {
        if (!this.tooltip || !this.tooltip.isConnected) {
            const tooltip = document.createElement("div");
            tooltip.className = "bh-tooltip";
            tooltip.hidden = true;
            this.target.appendChild(tooltip);
            this.tooltip = tooltip;
        }
        return this.tooltip;
    }

    private showTooltip(component: ComponentRecord, event: MouseEvent): void {
        const tooltip = this.ensureTooltip();
        tooltip.replaceChildren(...buildTooltipContent(component));
        tooltip.hidden = false;

        const rect = this.target.getBoundingClientRect();
        const margin = 14;
        let x = event.clientX - rect.left + margin;
        let y = event.clientY - rect.top + margin;

        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;

        if (x + width + margin > rect.width) {
            x = event.clientX - rect.left - width - margin;
        }
        if (y + height + margin > rect.height) {
            y = event.clientY - rect.top - height - margin;
        }

        tooltip.style.left = `${Math.max(margin, x)}px`;
        tooltip.style.top = `${Math.max(margin, y)}px`;
    }

    private hideTooltip(): void {
        if (this.tooltip) {
            this.tooltip.hidden = true;
        }
    }
}

function buildComponentLookup(machines: MachineBucketModel[]): Map<string, ComponentRecord> {
    const lookup = new Map<string, ComponentRecord>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => lookup.set(machine.key + COMPOSITE_KEY_SEPARATOR + component.componentKey, component));
    });
    return lookup;
}

function buildTooltipContent(component: ComponentRecord): HTMLElement[] {
    const color = statusColors[component.status];

    const head = document.createElement("div");
    head.className = "bh-tooltip__head";

    const dot = document.createElement("span");
    dot.className = "bh-tooltip__dot";
    dot.style.backgroundColor = color;

    const name = document.createElement("span");
    name.className = "bh-tooltip__name";
    name.textContent = componentLabel(component);

    head.append(dot, name);

    const rows = document.createElement("div");
    rows.className = "bh-tooltip__rows";

    const statusValue = statusLabels[component.status] ?? String(component.status);
    rows.appendChild(tooltipRow("Status", statusValue, color));
    rows.appendChild(tooltipRow("Machine", component.machineKey));

    if (component.machineType) {
        rows.appendChild(tooltipRow("Type", component.machineType));
    }

    rows.appendChild(tooltipRow("Component", component.componentKey));

    const lastSeen = formatLastSeen(component.lastSeen);
    if (lastSeen) {
        rows.appendChild(tooltipRow("Last seen", lastSeen));
    }

    component.tooltipFields.forEach((field) => {
        rows.appendChild(tooltipRow(field.label, String(field.value ?? "")));
    });

    return [head, rows];
}

function tooltipRow(label: string, value: string, valueColor?: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "bh-tooltip__row";

    const labelEl = document.createElement("span");
    labelEl.className = "bh-tooltip__label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "bh-tooltip__value";
    valueEl.textContent = value;
    if (valueColor) {
        valueEl.style.color = valueColor;
    }

    row.append(labelEl, valueEl);
    return row;
}

function componentLabel(component: ComponentRecord): string {
    const prefix = component.category === "tooth"
        ? "Tooth"
        : component.category === "lipShroud"
            ? "Lip shroud"
            : "Wing shroud";
    return `${prefix} ${component.order}`;
}

function formatLastSeen(value: PrimitiveValue | undefined): string {
    if (value === null || value === undefined) {
        return "";
    }

    let date: Date | null = null;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === "number") {
        // A bare year (e.g. 2026, from a Power BI date hierarchy) cannot be expanded to a timestamp.
        if (value > 1e11) {
            date = new Date(value);
        } else {
            return String(value);
        }
    } else {
        const parsed = new Date(String(value));
        if (!Number.isNaN(parsed.getTime())) {
            date = parsed;
        }
    }

    if (!date || Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}
