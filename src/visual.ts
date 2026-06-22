"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import { AlarmController } from "./audio/alarmController";
import { parseDataView } from "./data/parseDataView";
import { BucketHealthDataModel, ComponentRecord, MachineBucketModel, WingSideAssignment } from "./data/types";
import { defaultWingSideAssignment } from "./domain/wingSideAssignment";
import { renderEdgeState } from "./rendering/renderEdgeStates";
import { renderFleet } from "./rendering/renderFleet";
import { VisualFormattingSettingsModel } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly target: HTMLElement;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly tooltipService: ITooltipService;
    private readonly alarmController = new AlarmController();
    private formattingSettings = new VisualFormattingSettingsModel();
    private componentLookup = new Map<string, ComponentRecord>();

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.tooltipService = options.host.tooltipService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("bucket-health-root");

        this.target.addEventListener("click", () => this.alarmController.dismiss());
        this.target.addEventListener("mouseover", (event) => this.handleTooltipShow(event));
        this.target.addEventListener("mouseleave", () => {
            try { this.tooltipService.hide({ isTouchEvent: false, immediately: false }); } catch { /* ignore */ }
        });
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
        this.target.replaceChildren();
    }

    private render(model: BucketHealthDataModel): void {
        this.target.replaceChildren();

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

    private handleTooltipShow(event: Event): void {
        if (!this.tooltipService.enabled()) return;

        const element = (event.target as Element).closest("[data-component-key]");
        if (!element) return;

        const key = element.getAttribute("data-component-key");
        const component = key ? this.componentLookup.get(key) : undefined;
        if (!component) return;

        const mouseEvent = event as MouseEvent;
        const containerRect = this.target.getBoundingClientRect();

        try {
            this.tooltipService.show({
                coordinates: [
                    mouseEvent.clientX - containerRect.left,
                    mouseEvent.clientY - containerRect.top
                ],
                isTouchEvent: false,
                dataItems: buildTooltipItems(component),
                identities: []
            });
        } catch { /* ignore tooltip errors */ }
    }
}

function buildComponentLookup(machines: MachineBucketModel[]): Map<string, ComponentRecord> {
    const lookup = new Map<string, ComponentRecord>();
    machines.forEach((machine) => {
        const all = [...machine.teeth, ...machine.lipShrouds, ...machine.wingShroudsLeft, ...machine.wingShroudsRight];
        all.forEach((component) => lookup.set(component.componentKey, component));
    });
    return lookup;
}

function buildTooltipItems(component: ComponentRecord): { displayName: string; value: string }[] {
    const items: { displayName: string; value: string }[] = [
        { displayName: "Component", value: component.componentKey },
        { displayName: "Status", value: component.status },
    ];

    if (component.lastSeen !== null && component.lastSeen !== undefined) {
        items.push({ displayName: "Last seen", value: String(component.lastSeen) });
    }

    component.tooltipFields.forEach((field) => {
        items.push({ displayName: field.label, value: String(field.value ?? "") });
    });

    return items;
}
