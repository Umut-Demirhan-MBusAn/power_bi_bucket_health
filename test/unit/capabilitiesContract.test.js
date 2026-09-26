"use strict";

// Requiring the mockHost helper (before anything else) registers the ESM-resolution fallback
// that powerbi-visuals-utils-formattingmodel needs -- settings.ts (like visual.ts) imports it,
// so compiling it down to CommonJS still needs that fix even though this file has no DOM.
require("../helpers/mockHost");

const test = require("node:test");
const assert = require("node:assert/strict");

const capabilities = require("../../capabilities.json");
const { VisualFormattingSettingsModel } = require("../../.tmp/test-build/src/settings");
const {
    asWingSideAssignment,
    asComponentOrderDirection,
    asAlarmMotion
} = require("../../.tmp/test-build/src/domain/settingsGuards");

// Maps each ItemDropdown slice ("<card>.<slice>") to its matching guard in settingsGuards.ts.
// Extend this whenever a new ItemDropdown setting (and its guard) is added.
const GUARD_BY_DROPDOWN = {
    "ordering.wingSideAssignment": asWingSideAssignment,
    "ordering.componentOrder": asComponentOrderDirection,
    "alarm.alarmMotion": asAlarmMotion
};

function capabilitiesPairs() {
    const pairs = new Set();
    Object.entries(capabilities.objects || {}).forEach(([cardName, cardDef]) => {
        Object.keys(cardDef.properties || {}).forEach((propName) => {
            pairs.add(`${cardName}.${propName}`);
        });
    });
    return pairs;
}

function modelSlices() {
    const model = new VisualFormattingSettingsModel();
    const slices = [];
    model.cards.forEach((card) => {
        (card.slices || []).forEach((slice) => {
            slices.push({ key: `${card.name}.${slice.name}`, slice });
        });
    });
    return slices;
}

test("every capabilities.json object property has a matching formatting-settings card/slice, and vice versa", () => {
    const capPairs = capabilitiesPairs();
    const modelPairs = new Set(modelSlices().map(({ key }) => key));

    const missingFromModel = [...capPairs].filter((pair) => !modelPairs.has(pair));
    const missingFromCapabilities = [...modelPairs].filter((pair) => !capPairs.has(pair));

    assert.deepEqual(
        missingFromModel,
        [],
        "capabilities.json objects.<card>.properties.<prop> entries with no matching card/slice name in VisualFormattingSettingsModel"
    );
    assert.deepEqual(
        missingFromCapabilities,
        [],
        "VisualFormattingSettingsModel card/slice pairs not declared under capabilities.json's objects"
    );
});

test("every ItemDropdown item is accepted unchanged by its guard, and each guard's default is one of its items", () => {
    const dropdowns = modelSlices().filter(({ slice }) => Array.isArray(slice.items));
    assert.ok(dropdowns.length > 0, "expected at least one ItemDropdown slice to check");

    dropdowns.forEach(({ key, slice }) => {
        const guard = GUARD_BY_DROPDOWN[key];
        assert.ok(guard, `no settingsGuards mapping registered for ItemDropdown "${key}" -- add one to GUARD_BY_DROPDOWN`);

        const itemValues = slice.items.map((item) => item.value);

        itemValues.forEach((value) => {
            assert.equal(guard(value), value, `${key}'s guard should accept item value "${value}" unchanged`);
        });

        const guardDefault = guard(undefined);
        assert.ok(
            itemValues.includes(guardDefault),
            `${key}'s guard default ("${guardDefault}") should be one of its own item values`
        );
    });

    // Completeness in the other direction: every mapped guard corresponds to a real dropdown.
    const dropdownKeys = dropdowns.map(({ key }) => key).sort();
    assert.deepEqual(
        dropdownKeys,
        Object.keys(GUARD_BY_DROPDOWN).sort(),
        "GUARD_BY_DROPDOWN is out of sync with the model's ItemDropdown slices"
    );
});

test("dataViewMappings[0].conditions caps every role but tooltipFields to one field, and sits beside table (not nested under it, where the host ignores it)", () => {
    const mapping = capabilities.dataViewMappings[0];
    const conditions = mapping.conditions && mapping.conditions[0];
    assert.ok(conditions, "dataViewMappings[0].conditions[0] should exist");

    capabilities.dataRoles.forEach(({ name }) => {
        if (name === "tooltipFields") {
            assert.equal(conditions[name], undefined, "tooltipFields accepts more than one field, so it has no condition");
        } else {
            assert.deepEqual(conditions[name], { max: 1 }, `${name} should be capped to { max: 1 }`);
        }
    });

    assert.equal(mapping.table.conditions, undefined, "conditions must not be nested under table -- the host reads it from the dataViewMapping object itself");
});
