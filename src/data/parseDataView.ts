import powerbi from "powerbi-visuals-api";
import { assignWingSides, defaultWingSideAssignment } from "../domain/wingSideAssignment";
import { isAlarmStatus, normalizeStatus } from "./normalizeStatus";
import {
    BucketHealthDataModel,
    ComponentCategory,
    ComponentRecord,
    MachineBucketModel,
    TooltipField,
    WingSideAssignment
} from "./types";

import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewTable = powerbi.DataViewTable;
import PrimitiveValue = powerbi.PrimitiveValue;

const requiredRoles = ["machine", "component", "category", "order", "status"];
const allowedCategories = new Set<ComponentCategory>(["tooth", "lipShroud", "wingShroud"]);

interface RoleIndexes {
    machine: number;
    machineType?: number;
    component: number;
    category: number;
    order: number;
    status: number;
    lastSeen?: number;
    alarmTime?: number;
    tooltipFields: number[];
}

export function parseDataView(
    dataView: DataView | undefined,
    wingSideAssignment: WingSideAssignment = defaultWingSideAssignment
): BucketHealthDataModel {
    const table = dataView?.table;
    if (!table) {
        return emptyModel("noFields", requiredRoles);
    }

    const missingRoles = findMissingRoles(table.columns, requiredRoles);
    if (missingRoles.length > 0) {
        return emptyModel("invalidConfig", missingRoles);
    }

    if (!table.rows || table.rows.length === 0) {
        return emptyModel("noData");
    }

    const indexes = getRoleIndexes(table.columns);
    if (!indexes) {
        return emptyModel("invalidConfig", requiredRoles);
    }

    const errors: string[] = [];
    const components: ComponentRecord[] = [];

    table.rows.forEach((row, rowIndex) => {
        const line = rowIndex + 1;
        const machineKey = textValue(row[indexes.machine]);
        const componentKey = textValue(row[indexes.component]);
        const categoryValue = textValue(row[indexes.category]);
        const status = normalizeStatus(row[indexes.status]);
        const order = numberValue(row[indexes.order]);

        if (!machineKey) {
            errors.push(`Row ${line}: machine is required.`);
        }

        if (!componentKey) {
            errors.push(`Row ${line}: component is required.`);
        }

        if (!allowedCategories.has(categoryValue as ComponentCategory)) {
            errors.push(`Row ${line}: category '${categoryValue}' is not supported.`);
        }

        if (!status) {
            errors.push(`Row ${line}: status '${textValue(row[indexes.status])}' is not supported.`);
        }

        if (!Number.isInteger(order) || order < 1) {
            errors.push(`Row ${line}: order must be an integer greater than zero.`);
        }

        if (machineKey && componentKey && allowedCategories.has(categoryValue as ComponentCategory) && status && Number.isInteger(order) && order >= 1) {
            components.push({
                machineKey,
                machineType: optionalTextValue(row, indexes.machineType),
                componentKey,
                category: categoryValue as ComponentCategory,
                order,
                status,
                lastSeen: optionalValue(row, indexes.lastSeen),
                alarmTime: optionalValue(row, indexes.alarmTime),
                tooltipFields: getTooltipFields(row, table.columns, indexes.tooltipFields),
                sourceOrder: rowIndex
            });
        }
    });

    if (errors.length > 0) {
        return {
            state: "error",
            machines: [],
            missingRoles: [],
            errors
        };
    }

    const machines = deriveMachines(components, errors, wingSideAssignment);
    if (errors.length > 0) {
        return {
            state: "error",
            machines: [],
            missingRoles: [],
            errors
        };
    }

    return {
        state: machines.length > 0 ? "ready" : "noData",
        machines,
        missingRoles: [],
        errors: []
    };
}

function emptyModel(state: BucketHealthDataModel["state"], missingRoles: string[] = []): BucketHealthDataModel {
    return {
        state,
        machines: [],
        missingRoles,
        errors: []
    };
}

function findMissingRoles(columns: DataViewMetadataColumn[], roles: string[]): string[] {
    return roles.filter((role) => !columns.some((column) => Boolean(column.roles?.[role])));
}

function getRoleIndexes(columns: DataViewMetadataColumn[]): RoleIndexes | undefined {
    const machine = findRoleIndex(columns, "machine");
    const component = findRoleIndex(columns, "component");
    const category = findRoleIndex(columns, "category");
    const order = findRoleIndex(columns, "order");
    const status = findRoleIndex(columns, "status");

    if (machine === undefined || component === undefined || category === undefined || order === undefined || status === undefined) {
        return undefined;
    }

    return {
        machine,
        machineType: findRoleIndex(columns, "machineType"),
        component,
        category,
        order,
        status,
        lastSeen: findRoleIndex(columns, "lastSeen"),
        alarmTime: findRoleIndex(columns, "alarmTime"),
        tooltipFields: findRoleIndexes(columns, "tooltipFields")
    };
}

function findRoleIndex(columns: DataViewMetadataColumn[], role: string): number | undefined {
    const index = columns.findIndex((column) => Boolean(column.roles?.[role]));
    return index >= 0 ? index : undefined;
}

function findRoleIndexes(columns: DataViewMetadataColumn[], role: string): number[] {
    return columns
        .map((column, index) => Boolean(column.roles?.[role]) ? index : -1)
        .filter((index) => index >= 0);
}

function deriveMachines(
    components: ComponentRecord[],
    errors: string[],
    wingSideAssignment: WingSideAssignment
): MachineBucketModel[] {
    const byMachine = new Map<string, ComponentRecord[]>();
    const sourceOrder = new Map<string, number>();

    components.forEach((component) => {
        if (!byMachine.has(component.machineKey)) {
            byMachine.set(component.machineKey, []);
            sourceOrder.set(component.machineKey, component.sourceOrder);
        }

        byMachine.get(component.machineKey)?.push(component);
    });

    const machines: MachineBucketModel[] = [];
    byMachine.forEach((machineComponents, machineKey) => {
        const duplicateKeys = findDuplicateComponentKeys(machineComponents);
        duplicateKeys.forEach((componentKey) => errors.push(`Machine '${machineKey}' has duplicate component '${componentKey}'.`));

        const teeth = sortComponents(machineComponents.filter((component) => component.category === "tooth"));
        const lipShrouds = sortComponents(machineComponents.filter((component) => component.category === "lipShroud"));
        const wingShrouds = assignWingSides(
            machineComponents.filter((component) => component.category === "wingShroud"),
            wingSideAssignment
        );

        if (teeth.length < 4 || teeth.length > 20) {
            errors.push(`Machine '${machineKey}' has ${teeth.length} teeth; supported range is 4-20.`);
        }

        if (lipShrouds.length !== teeth.length - 1) {
            errors.push(`Machine '${machineKey}' has ${lipShrouds.length} lip shrouds; expected ${teeth.length - 1}.`);
        }

        if (wingShrouds.length > 8) {
            errors.push(`Machine '${machineKey}' has ${wingShrouds.length} wing shrouds; maximum total is 8.`);
        }

        const wingShroudsLeft = sortComponents(wingShrouds.filter((component) => component.derivedWingSide === "left"));
        const wingShroudsRight = sortComponents(wingShrouds.filter((component) => component.derivedWingSide === "right"));
        const alarmComponents = machineComponents.filter((component) => isAlarmStatus(component.status));
        const hasMove = alarmComponents.some((component) => component.status === "move");

        machines.push({
            key: machineKey,
            name: machineKey,
            type: firstDefined(machineComponents.map((component) => component.machineType)),
            teeth,
            lipShrouds,
            wingShroudsLeft,
            wingShroudsRight,
            alarmCount: alarmComponents.length,
            hasAlarm: alarmComponents.length > 0,
            dominantAlarm: alarmComponents.length > 0 ? (hasMove ? "move" : "prox") : undefined,
            sourceOrder: sourceOrder.get(machineKey) ?? 0
        });
    });

    return machines.sort((a, b) => {
        if (a.hasAlarm !== b.hasAlarm) return a.hasAlarm ? -1 : 1;
        if (a.hasAlarm && b.hasAlarm) {
            const aMove = a.dominantAlarm === "move";
            const bMove = b.dominantAlarm === "move";
            if (aMove !== bMove) return aMove ? -1 : 1;
        }
        if (a.alarmCount !== b.alarmCount) return b.alarmCount - a.alarmCount;
        return a.sourceOrder - b.sourceOrder;
    });
}

function sortComponents(components: ComponentRecord[]): ComponentRecord[] {
    return [...components].sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder);
}

function findDuplicateComponentKeys(components: ComponentRecord[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    components.forEach((component) => {
        if (seen.has(component.componentKey)) {
            duplicates.add(component.componentKey);
        }
        seen.add(component.componentKey);
    });

    return [...duplicates];
}

function getTooltipFields(row: DataViewTable["rows"][number], columns: DataViewMetadataColumn[], indexes: number[]): TooltipField[] {
    return indexes.map((index) => ({
        label: columns[index].displayName,
        value: row[index]
    }));
}

function textValue(value: PrimitiveValue): string {
    return value === null || value === undefined ? "" : String(value).trim();
}

function optionalTextValue(row: DataViewTable["rows"][number], index: number | undefined): string | undefined {
    if (index === undefined) {
        return undefined;
    }

    return textValue(row[index]) || undefined;
}

function optionalValue(row: DataViewTable["rows"][number], index: number | undefined): PrimitiveValue | undefined {
    return index === undefined ? undefined : row[index];
}

function numberValue(value: PrimitiveValue): number {
    if (typeof value === "number") {
        return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function firstDefined(values: Array<string | undefined>): string | undefined {
    return values.find((value) => Boolean(value));
}
