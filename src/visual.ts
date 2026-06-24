"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import { AlarmController } from "./audio/alarmController";
import { buildCompositeKey } from "./data/keys";
import { parseDataView } from "./data/parseDataView";
import { BucketHealthDataModel, ComponentRecord, MachineBucketModel } from "./data/types";
import { asAlarmMotion, asComponentOrderDirection, asWingSideAssignment } from "./domain/settingsGuards";
import { statusColors, statusLabels, VisualTheme } from "./domain/statusMeta";
import { renderEdgeState } from "./rendering/renderEdgeStates";
import { renderFleet } from "./rendering/renderFleet";
import { VisualFormattingSettingsModel } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewTable = powerbi.DataViewTable;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

const DIMMED_CLASS = "bucket-health-svg__component--dimmed";

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly target: HTMLElement;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly alarmController = new AlarmController();
    private formattingSettings = new VisualFormattingSettingsModel();
    private componentLookup = new Map<string, ComponentRecord>();
    private selectionIdLookup = new Map<string, ISelectionId>();
    private tooltip: HTMLElement | null = null;
    private hideTooltipTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly host: IVisualHost;
    private readonly selectionManager: ISelectionManager;
    private minCardWidth = 220;
    private rowCount = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("bucket-health-root");

        this.target.addEventListener("click", (event) => this.handleClick(event));
        this.target.addEventListener("contextmenu", (event) => this.handleContextMenu(event));
        this.target.addEventListener("keydown", (event) => this.handleKeyDown(event));
        this.target.addEventListener("mousemove", (event) => this.handlePointerMove(event));
        this.target.addEventListener("mouseleave", () => this.hideTooltipNow());

        try {
            this.selectionManager.registerOnSelectCallback(() => this.applyDimming());
        } catch (e) {
            console.warn("[BucketHealth] registerOnSelectCallback unavailable:", e);
        }
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews?.[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel,
                dataView
            );

            const wingSideAssignment = asWingSideAssignment(this.formattingSettings.ordering.wingSideAssignment.value?.value);
            const componentOrder = asComponentOrderDirection(this.formattingSettings.ordering.componentOrder.value?.value);

            const audioEnabled = this.formattingSettings.alarm.audioEnabled.value ?? true;

            const alarmMotion = asAlarmMotion(this.formattingSettings.alarm.alarmMotion.value?.value);
            const minCardWidth = this.formattingSettings.layout.minCardWidth.value ?? 220;
            this.minCardWidth = minCardWidth;
            this.target.classList.toggle("bucket-health-root--flash-always", alarmMotion === "always");
            this.target.classList.toggle("bucket-health-root--flash-never", alarmMotion === "never");

            this.rowCount = dataView?.table?.rows?.length ?? 0;
            const model = parseDataView(dataView, wingSideAssignment, componentOrder);
            this.alarmController.update(model, audioEnabled);

            const theme = this.readTheme();
            this.buildSelectionIdLookup(model, dataView?.table);

            this.render(model, theme);
            this.events.renderingFinished(options);
        } catch (error) {
            const errorModel: BucketHealthDataModel = {
                state: "error",
                machines: [],
                missingRoles: [],
                errors: [error instanceof Error ? error.message : String(error)]
            };
            this.render(errorModel, this.readTheme());
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    public destroy(): void {
        this.alarmController.destroy();
        this.hideTooltipNow();
        this.tooltip = null;
        this.target.replaceChildren();
    }

    private render(model: BucketHealthDataModel, theme: VisualTheme): void {
        // Power BI calls update() frequently; preserve the fleet scroll position across re-renders
        // so the user's scrollbar does not snap back to the top.
        const previousScroll = this.target.querySelector<HTMLElement>(".bucket-health")?.scrollTop ?? 0;

        this.hideTooltipNow();
        this.target.replaceChildren();
        this.tooltip = null;

        if (model.state !== "ready") {
            const detail = model.state === "error" ? model.errors.join(" ") : undefined;
            const missingRoles = model.state === "invalidConfig" ? model.missingRoles : undefined;
            this.target.appendChild(renderEdgeState(model.state, detail, missingRoles));
            this.componentLookup.clear();
            return;
        }

        this.componentLookup = buildComponentLookup(model.machines);
        const fleet = renderFleet(model.machines, theme, this.minCardWidth, this.rowCount >= 2000);
        this.target.appendChild(fleet);
        fleet.scrollTop = previousScroll;

        // Re-apply dimming so the selection visual survives re-renders.
        this.applyDimming();
    }

    private readTheme(): VisualTheme {
        const cp = this.host.colorPalette;
        return {
            isHighContrast: !!cp.isHighContrast,
            foreground: cp.foreground?.value ?? "#ffffff",
            background: cp.background?.value ?? "#000000",
            foregroundSelected: cp.foregroundSelected?.value ?? "#ffffff"
        };
    }

    private buildSelectionIdLookup(model: BucketHealthDataModel, table: DataViewTable | undefined): void {
        this.selectionIdLookup = new Map<string, ISelectionId>();
        if (model.state !== "ready" || !table) {
            return;
        }

        model.machines.forEach((machine) => {
            const all = [
                ...machine.teeth,
                ...machine.lipShrouds,
                ...machine.wingShroudsLeft,
                ...machine.wingShroudsRight
            ];
            all.forEach((component) => {
                const id = this.host
                    .createSelectionIdBuilder()
                    .withTable(table, component.sourceOrder)
                    .createSelectionId();
                this.selectionIdLookup.set(
                    buildCompositeKey(machine.key, component.componentKey),
                    id
                );
            });
        });
    }

    private resolveSelectionId(componentEl: Element): ISelectionId | undefined {
        const componentKey = componentEl.getAttribute("data-component-key");
        if (!componentKey) {
            return undefined;
        }
        const machineEl = componentEl.closest("[data-machine-key]");
        const machineKey = machineEl?.getAttribute("data-machine-key");
        if (!machineKey) {
            return undefined;
        }
        return this.selectionIdLookup.get(buildCompositeKey(machineKey, componentKey));
    }

    private handleClick(event: MouseEvent): void {
        if (!this.host.hostCapabilities.allowInteractions) return;
        // Preserve the existing audio arm/dismiss behavior on every click.
        this.alarmController.arm();
        this.alarmController.dismiss();

        const target = event.target as Element | null;
        const componentEl = target?.closest("[data-component-key]") ?? null;
        const selectionId = componentEl ? this.resolveSelectionId(componentEl) : undefined;

        const settled = selectionId
            ? this.selectionManager.select(selectionId, event.ctrlKey)
            : this.selectionManager.clear();
        this.afterSelection(settled);
    }

    private afterSelection(settled: { then?: (onOk: () => void, onErr: () => void) => unknown }): void {
        const finish = (): void => this.applyDimming();
        // Selection manager methods resolve asynchronously; re-apply dimming on settle,
        // and also synchronously so the visual updates promptly even if the promise never fires.
        if (settled && typeof settled.then === "function") {
            settled.then(finish, finish);
        }
        finish();
    }

    private handleContextMenu(event: MouseEvent): void {
        if (!this.host.hostCapabilities.allowInteractions) return;
        const target = event.target as Element | null;
        const componentEl = target?.closest("[data-component-key]") ?? null;
        const selectionId = componentEl ? this.resolveSelectionId(componentEl) : undefined;

        this.selectionManager.showContextMenu(selectionId ?? {}, {
            x: event.clientX,
            y: event.clientY
        });
        event.preventDefault();
    }

    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.host.hostCapabilities.allowInteractions) return;
        const active = document.activeElement as Element | null;
        const componentEl = active?.closest?.("[data-component-key]") ?? null;
        if (!componentEl) {
            return;
        }

        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            const selectionId = this.resolveSelectionId(componentEl);
            if (selectionId) {
                this.afterSelection(this.selectionManager.select(selectionId, event.ctrlKey));
            }
            event.preventDefault();
            return;
        }

        if (
            event.key === "ArrowRight" || event.key === "ArrowDown" ||
            event.key === "ArrowLeft" || event.key === "ArrowUp"
        ) {
            const elements = Array.from(this.target.querySelectorAll<HTMLElement>("[data-component-key]"));
            if (elements.length === 0) {
                return;
            }
            const currentIndex = elements.indexOf(componentEl as HTMLElement);
            const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
            const delta = forward ? 1 : -1;
            const nextIndex = (currentIndex + delta + elements.length) % elements.length;
            elements[nextIndex].focus();
            event.preventDefault();
        }
    }

    private applyDimming(): void {
        const selectedIds = this.selectionManager.getSelectionIds() as ISelectionId[];
        const elements = this.target.querySelectorAll<HTMLElement>("[data-component-key]");

        if (!selectedIds || selectedIds.length === 0) {
            elements.forEach((el) => el.classList.remove(DIMMED_CLASS));
            return;
        }

        elements.forEach((el) => {
            const id = this.resolveSelectionId(el);
            const isSelected = !!id && selectedIds.some((selected) => selectionIdsEqual(selected, id));
            el.classList.toggle(DIMMED_CLASS, !isSelected);
        });
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
        const record = this.componentLookup.get(buildCompositeKey(machineKey, componentKey));

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
        if (this.hideTooltipTimer !== null) {
            clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = null;
        }
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
        if (this.hideTooltipTimer !== null) return;
        this.hideTooltipTimer = setTimeout(() => {
            this.hideTooltipTimer = null;
            if (this.tooltip) this.tooltip.hidden = true;
        }, 8000);
    }

    private hideTooltipNow(): void {
        if (this.hideTooltipTimer !== null) {
            clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = null;
        }
        if (this.tooltip) this.tooltip.hidden = true;
    }
}

interface ComparableSelectionId {
    equals?: (other: ISelectionId) => boolean;
    getKey?: () => string;
}

function selectionIdsEqual(a: ISelectionId, b: ISelectionId): boolean {
    const ca = a as ComparableSelectionId;
    const cb = b as ComparableSelectionId;
    if (typeof ca.equals === "function") {
        return ca.equals(b);
    }
    if (typeof ca.getKey === "function" && typeof cb.getKey === "function") {
        return ca.getKey() === cb.getKey();
    }
    return a === b;
}

function buildComponentLookup(machines: MachineBucketModel[]): Map<string, ComponentRecord> {
    const lookup = new Map<string, ComponentRecord>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => lookup.set(buildCompositeKey(machine.key, component.componentKey), component));
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
