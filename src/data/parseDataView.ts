import powerbi from "powerbi-visuals-api";
import { assignWingSides, defaultWingSideAssignment } from "../domain/wingSideAssignment";
import { dominantAlarm } from "../domain/statusMeta";
import { isAlarmStatus, normalizeStatus } from "./normalizeStatus";
import {
    BucketHealthDataModel,
    ComponentCategory,
    ComponentOrderDirection,
    ComponentRecord,
    MachineBucketModel,
    TooltipField,
    WingSideAssignment
} from "./types";

import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewTableRow = powerbi.DataViewTableRow;
import PrimitiveValue = powerbi.PrimitiveValue;

const requiredRoles = ["machine", "component", "category", "order", "status"];
const MAX_ISSUES_PER_MACHINE = 20;
const ACCEPTED_STATUSES = "OK, No Data, Lockout, Lockout + No Data, Proximity Alarm or Movement Alarm";
const CATEGORY_LABELS: Record<ComponentCategory, string> = {
    tooth: "Tooth",
    lipShroud: "Lip shroud",
    wingShroud: "Wing shroud"
};

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

// One machine's rows as they are collected while walking the table. `validComponents` only ever
// holds rows that passed every row-level check; `issues` accumulates row-level problems in row
// order, and machine-level checks (duplicates, counts, wing limits, incomplete) are placed before
// them when the final issue list is built.
interface MachineDraft {
    key: string;
    machineType?: string;
    sourceOrder: number;
    validComponents: ComponentRecord[];
    issues: string[];
    rejectedRowCount: number;
}

export function parseDataView(
    dataView: DataView | undefined,
    wingSideAssignment: WingSideAssignment = defaultWingSideAssignment,
    componentOrder: ComponentOrderDirection = "leftToRight"
): BucketHealthDataModel {
    const table = dataView?.table;
    if (!table) {
        return emptyModel("noFields", requiredRoles);
    }

    const roleResult = getRoleIndexes(table.columns);
    if ("missingRoles" in roleResult) {
        return emptyModel("invalidConfig", roleResult.missingRoles);
    }

    if (!table.rows || table.rows.length === 0) {
        return emptyModel("noData");
    }

    const indexes = roleResult;
    const truncated = dataView?.metadata?.segment !== undefined;

    const { machineDrafts, blankMachineRowCount } = collectMachineDrafts(table.rows, table.columns, indexes);

    const warnings: string[] = [];
    if (blankMachineRowCount > 0) {
        warnings.push(blankMachineRowCount === 1
            ? "1 row has no machine and is not shown."
            : `${blankMachineRowCount} rows have no machine and are not shown.`);
    }

    if (machineDrafts.size === 0) {
        // Every row had a blank machine (the only way to reach zero drafts once rows.length > 0),
        // so `warnings` is always non-empty here.
        return {
            state: "error",
            machines: [],
            missingRoles: [],
            errors: warnings,
            truncated,
            warnings: []
        };
    }

    const machines = buildMachineModels(machineDrafts, truncated, wingSideAssignment, componentOrder);

    return {
        state: "ready",
        machines,
        missingRoles: [],
        errors: [],
        truncated,
        warnings
    };
}

function emptyModel(state: BucketHealthDataModel["state"], missingRoles: string[] = []): BucketHealthDataModel {
    return {
        state,
        machines: [],
        missingRoles,
        errors: [],
        truncated: false,
        warnings: []
    };
}

function getRoleIndexes(columns: DataViewMetadataColumn[]): RoleIndexes | { missingRoles: string[] } {
    const machine = findRoleIndex(columns, "machine");
    const component = findRoleIndex(columns, "component");
    const category = findRoleIndex(columns, "category");
    const order = findRoleIndex(columns, "order");
    const status = findRoleIndex(columns, "status");

    if (machine === undefined || component === undefined || category === undefined || order === undefined || status === undefined) {
        return { missingRoles: requiredRoles.filter((role) => findRoleIndex(columns, role) === undefined) };
    }

    return {
        machine,
        component,
        category,
        order,
        status,
        machineType: findRoleIndex(columns, "machineType"),
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

// Walks every row once: rows with a blank machine are skipped and counted (fleet-level warning);
// every other row attaches its row-level issues (if any) to that machine's draft and, only when
// every row-level check passes, contributes a ComponentRecord to that machine's valid rows.
function collectMachineDrafts(
    rows: DataViewTableRow[],
    columns: DataViewMetadataColumn[],
    indexes: RoleIndexes
): { machineDrafts: Map<string, MachineDraft>; blankMachineRowCount: number } {
    const machineDrafts = new Map<string, MachineDraft>();
    let blankMachineRowCount = 0;

    rows.forEach((row, rowIndex) => {
        const machineKey = textValue(row[indexes.machine]);

        if (!machineKey) {
            blankMachineRowCount += 1;
            return;
        }

        let draft = machineDrafts.get(machineKey);
        if (!draft) {
            draft = { key: machineKey, sourceOrder: rowIndex, validComponents: [], issues: [], rejectedRowCount: 0 };
            machineDrafts.set(machineKey, draft);
        }

        const componentKey = textValue(row[indexes.component]);
        const categoryRaw = textValue(row[indexes.category]);
        const category = matchCategory(categoryRaw);
        const statusRaw = textValue(row[indexes.status]);
        const status = normalizeStatus(row[indexes.status]);
        const orderRaw = textValue(row[indexes.order]);
        const order = parseOrder(row[indexes.order]);

        // Row positions are never shown: they index the host's DataView, which the report author
        // cannot see and which changes with filters and sorting.
        const subject = rowSubject(componentKey, category, order);
        if (!componentKey) {
            draft.issues.push(`${genericRow(category)} has no component name.`);
        }
        if (!category) {
            draft.issues.push(`${subject}: ${describeValue("category", categoryRaw)}. Use tooth, lip shroud or wing shroud.`);
        }
        if (!status) {
            draft.issues.push(`${subject}: ${describeValue("status", statusRaw)}. Use ${ACCEPTED_STATUSES}.`);
        }
        if (order === undefined) {
            draft.issues.push(orderRaw
                ? `${subject}: order '${orderRaw}' must be a whole number, starting at 1.`
                : `${subject}: order is blank; it must be a whole number, starting at 1.`);
        }

        if (!componentKey || !category || !status || order === undefined) {
            draft.rejectedRowCount += 1;
            return;
        }

        const machineType = optionalTextValue(row, indexes.machineType);
        if (draft.machineType === undefined) {
            draft.machineType = machineType;
        }

        draft.validComponents.push({
            machineKey,
            machineType,
            componentKey,
            category,
            order,
            status,
            lastSeen: optionalValue(row, indexes.lastSeen),
            alarmTime: optionalValue(row, indexes.alarmTime),
            tooltipFields: getTooltipFields(row, columns, indexes.tooltipFields),
            sourceOrder: rowIndex
        });
    });

    return { machineDrafts, blankMachineRowCount };
}

function rowSubject(componentKey: string, category: ComponentCategory | undefined, order: number | undefined): string {
    if (category && order !== undefined) {
        const label = `${CATEGORY_LABELS[category]} ${order}`;
        return componentKey ? `${label} (${componentKey})` : label;
    }
    return componentKey || genericRow(category);
}

function genericRow(category: ComponentCategory | undefined): string {
    return category ? `A ${CATEGORY_LABELS[category].toLowerCase()} row` : "A row";
}

function describeValue(field: string, raw: string): string {
    return raw ? `${field} '${raw}' is not recognised` : `${field} is blank`;
}

// Category matching: lower-case, strip spaces/underscores/hyphens, then match. A real type guard
// (no `as ComponentCategory` cast) — the return type is only ever a value this function produced.
function matchCategory(raw: string): ComponentCategory | undefined {
    const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
    if (normalized === "tooth" || normalized === "teeth") {
        return "tooth";
    }
    if (normalized === "lipshroud") {
        return "lipShroud";
    }
    if (normalized === "wingshroud") {
        return "wingShroud";
    }
    return undefined;
}

// Accepts a finite integer >= 1, either as a number or as a string of digits (optionally padded
// with whitespace). Booleans, Dates, hex-looking strings ("0x3"), and decimals ("1.5") all fail
// both branches and fall through to undefined.
function parseOrder(value: PrimitiveValue): number | undefined {
    if (typeof value === "number") {
        return Number.isInteger(value) && value >= 1 ? value : undefined;
    }
    if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) {
        const parsed = Number(value.trim());
        return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
    }
    return undefined;
}

function buildMachineModels(
    machineDrafts: Map<string, MachineDraft>,
    truncated: boolean,
    wingSideAssignment: WingSideAssignment,
    componentOrder: ComponentOrderDirection
): MachineBucketModel[] {
    const incompleteKey = truncated ? findIncompleteMachineKey(machineDrafts) : undefined;
    const machines: MachineBucketModel[] = [];

    machineDrafts.forEach((draft) => {
        const incomplete = draft.key === incompleteKey;

        const teeth = orderComponents(draft.validComponents.filter((component) => component.category === "tooth"), componentOrder);
        const lipShrouds = orderComponents(draft.validComponents.filter((component) => component.category === "lipShroud"), componentOrder);
        const wingShrouds = assignWingSides(
            draft.validComponents.filter((component) => component.category === "wingShroud"),
            wingSideAssignment
        );
        const wingShroudsLeft = sortComponents(wingShrouds.filter((component) => component.derivedWingSide === "left"));
        const wingShroudsRight = sortComponents(wingShrouds.filter((component) => component.derivedWingSide === "right"));

        // Machine-level issues (duplicates, counts, wing limits, incomplete) come before this
        // machine's row-level issues, so a flood of bad rows can never push the more structurally
        // significant machine-level problems past the 20-issue cap.
        const machineIssues: string[] = [];

        findDuplicateComponentKeys(draft.validComponents).forEach((componentKey) => {
            machineIssues.push(`Duplicate component '${componentKey}'.`);
        });

        if (incomplete) {
            machineIssues.push("Incomplete — the 2,000-row limit was reached.");
        } else {
            // A rejected row can only lower a count, so the upper limits are always real problems,
            // while "too few teeth" and the lip-shroud check would blame a category that is fine.
            if (teeth.length > 20) {
                machineIssues.push(`${teeth.length} teeth; supported range is 4–20.`);
            } else if (draft.rejectedRowCount === 0) {
                if (teeth.length < 4) {
                    machineIssues.push(`${teeth.length} teeth; supported range is 4–20.`);
                } else if (lipShrouds.length !== teeth.length - 1) {
                    machineIssues.push(`${lipShrouds.length} lip shrouds; expected ${teeth.length - 1}.`);
                }
            }
            if (wingShroudsLeft.length > 4) {
                machineIssues.push(`${wingShroudsLeft.length} wing shrouds on the left side; maximum is 4 per side.`);
            }
            if (wingShroudsRight.length > 4) {
                machineIssues.push(`${wingShroudsRight.length} wing shrouds on the right side; maximum is 4 per side.`);
            }
        }

        const issues = [...machineIssues, ...draft.issues];

        const alarmComponents = draft.validComponents.filter((component) => isAlarmStatus(component.status));

        machines.push({
            key: draft.key,
            name: draft.key,
            type: draft.machineType,
            teeth,
            lipShrouds,
            wingShroudsLeft,
            wingShroudsRight,
            alarmCount: alarmComponents.length,
            hasAlarm: alarmComponents.length > 0,
            dominantAlarm: dominantAlarm(alarmComponents.map((component) => component.status)),
            sourceOrder: draft.sourceOrder,
            issues: capIssues(issues),
            incomplete
        });
    });

    return machines.sort(compareMachines);
}

// Resolves the ambiguity in "the machine whose first row index is highest": the machine whose
// earliest row in table.rows comes last is the one the 2,000-row cut can have split.
function findIncompleteMachineKey(machineDrafts: Map<string, MachineDraft>): string | undefined {
    let bestKey: string | undefined;
    let bestSourceOrder = -1;

    machineDrafts.forEach((draft) => {
        if (draft.sourceOrder > bestSourceOrder) {
            bestSourceOrder = draft.sourceOrder;
            bestKey = draft.key;
        }
    });

    return bestKey;
}

function capIssues(issues: string[]): string[] {
    if (issues.length <= MAX_ISSUES_PER_MACHINE) {
        return issues;
    }

    const overflow = issues.length - MAX_ISSUES_PER_MACHINE;
    return [...issues.slice(0, MAX_ISSUES_PER_MACHINE), `…and ${overflow} more.`];
}

function compareMachines(a: MachineBucketModel, b: MachineBucketModel): number {
    if (a.hasAlarm !== b.hasAlarm) return a.hasAlarm ? -1 : 1;
    if (a.hasAlarm && b.hasAlarm) {
        const aMove = a.dominantAlarm === "move";
        const bMove = b.dominantAlarm === "move";
        if (aMove !== bMove) return aMove ? -1 : 1;
    }
    if (a.alarmCount !== b.alarmCount) return b.alarmCount - a.alarmCount;
    return a.sourceOrder - b.sourceOrder;
}

function sortComponents(components: ComponentRecord[]): ComponentRecord[] {
    return [...components].sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder);
}

// Orders a row of components left-to-right (ascending order) or right-to-left (descending),
// so the renderer can lay them out by array index.
function orderComponents(components: ComponentRecord[], direction: ComponentOrderDirection): ComponentRecord[] {
    const sorted = sortComponents(components);
    return direction === "rightToLeft" ? sorted.reverse() : sorted;
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

function getTooltipFields(row: DataViewTableRow, columns: DataViewMetadataColumn[], indexes: number[]): TooltipField[] {
    return indexes.map((index) => ({
        label: columns[index].displayName,
        value: row[index]
    }));
}

function textValue(value: PrimitiveValue): string {
    return value === null || value === undefined ? "" : String(value).trim();
}

function optionalTextValue(row: DataViewTableRow, index: number | undefined): string | undefined {
    if (index === undefined) {
        return undefined;
    }

    return textValue(row[index]) || undefined;
}

function optionalValue(row: DataViewTableRow, index: number | undefined): PrimitiveValue | undefined {
    return index === undefined ? undefined : row[index];
}
