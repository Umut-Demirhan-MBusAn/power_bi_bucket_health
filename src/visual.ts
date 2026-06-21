"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import { parseDataView } from "./data/parseDataView";
import { BucketHealthDataModel, MachineBucketModel } from "./data/types";
import { VisualFormattingSettingsModel } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

export class Visual implements IVisual {
    private readonly events: IVisualEventService;
    private readonly target: HTMLElement;
    private readonly formattingSettingsService: FormattingSettingsService;
    private formattingSettings = new VisualFormattingSettingsModel();

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.target.classList.add("bucket-health-root");
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options.dataViews?.[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel,
                dataView
            );

            this.render(parseDataView(dataView));
            this.events.renderingFinished(options);
        } catch (error) {
            this.render({
                state: "error",
                machines: [],
                missingRoles: [],
                errors: [error instanceof Error ? error.message : String(error)]
            });
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private render(model: BucketHealthDataModel): void {
        this.target.replaceChildren();

        const container = document.createElement("section");
        container.className = "bucket-health";

        if (model.state !== "ready") {
            container.appendChild(this.createStateView(model));
            this.target.appendChild(container);
            return;
        }

        const header = document.createElement("header");
        header.className = "bucket-health__header";

        const title = document.createElement("h1");
        title.textContent = "Bucket Health";

        const summary = document.createElement("p");
        summary.textContent = `${model.machines.length} machine${model.machines.length === 1 ? "" : "s"} loaded`;

        header.append(title, summary);
        container.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "bucket-health__grid";

        model.machines.forEach((machine) => grid.appendChild(this.createMachineCard(machine)));
        container.appendChild(grid);
        this.target.appendChild(container);
    }

    private createStateView(model: BucketHealthDataModel): HTMLElement {
        const state = document.createElement("div");
        state.className = "bucket-health-state";

        const title = document.createElement("h1");
        const message = document.createElement("p");

        switch (model.state) {
            case "noFields":
                title.textContent = "Add data to get started";
                message.textContent = "Bind Machine, Component, Category, Order, and Status fields.";
                break;
            case "invalidConfig":
                title.textContent = "Configuration incomplete";
                message.textContent = `Missing roles: ${model.missingRoles.join(", ")}`;
                break;
            case "noData":
                title.textContent = "No machines to show";
                message.textContent = "No rows match the current filters or slicers.";
                break;
            case "error":
            default:
                title.textContent = "Couldn't render the visual";
                message.textContent = model.errors.join(" ");
                break;
        }

        state.append(title, message);
        return state;
    }

    private createMachineCard(machine: MachineBucketModel): HTMLElement {
        const card = document.createElement("article");
        card.className = machine.hasAlarm ? "bucket-health-card bucket-health-card--alarm" : "bucket-health-card";

        const title = document.createElement("h2");
        title.textContent = machine.name;

        const meta = document.createElement("p");
        meta.textContent = [
            machine.type,
            `${machine.teeth.length} teeth`,
            `${machine.lipShrouds.length} lip shrouds`,
            `${machine.wingShroudsLeft.length + machine.wingShroudsRight.length} wing shrouds`
        ].filter(Boolean).join(" · ");

        const status = document.createElement("span");
        status.className = machine.hasAlarm ? "bucket-health-card__status bucket-health-card__status--alarm" : "bucket-health-card__status";
        status.textContent = machine.hasAlarm
            ? `${machine.alarmCount} alarm${machine.alarmCount === 1 ? "" : "s"}`
            : "OK";

        card.append(title, meta, status);
        return card;
    }
}
