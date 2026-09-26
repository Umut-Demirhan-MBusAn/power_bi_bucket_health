"use strict";

// Shared test double for the Power BI IVisualHost surface, plus jsdom / DataView / AudioContext
// setup helpers. Every DOM test (this task and later ones) should build its fixtures through
// this module rather than hand-rolling jsdom globals or host mocks per file.

const fs = require("node:fs");
const path = require("node:path");
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const { mock } = require("node:test");

// powerbi-visuals-utils-formattingmodel (a real dependency of src/visual.ts and src/settings.ts)
// ships ESM-syntax .js files with extension-less relative imports -- fine for TypeScript/webpack
// resolution but invalid for Node's own ESM resolver, which Node's require(esm) support now uses
// even for a plain CommonJS `require(...)` of that package. Without this, requiring the compiled
// visual fails with ERR_MODULE_NOT_FOUND. See esmExtensionFallback.mjs for exactly what it does
// (a resolution-only fallback); it must be registered before anything requires the compiled
// visual module.
register(
    pathToFileURL(path.join(__dirname, "esmExtensionFallback.mjs")).href,
    pathToFileURL(__filename).href
);

const { JSDOM } = require("jsdom");

const FIXTURE_PATH = path.join(__dirname, "../fixtures/bucket_health_components.csv");

// Column header -> data role, mirroring capabilities.json's dataRoles. Kept in sync with the
// role map in test/unit/parseDataView.test.js.
const ROLE_BY_HEADER = {
    machine_key: "machine",
    machine_type: "machineType",
    component_key: "component",
    component_category: "category",
    component_order: "order",
    status: "status",
    last_seen_utc: "lastSeen",
    tag_id: "tooltipFields",
    alarm_time: "alarmTime"
};

// visual.ts is compiled to CommonJS for tests, but its production import of the .less
// stylesheet (`import "./../style/visual.less"`) is still a plain `require(...)` call once
// compiled. Node has no loader for .less, so register a no-op one here, before any test
// `require`s the compiled visual. The production webpack build handles the real .less import;
// this only unblocks `require` in the Node test runner. Registered at module load so every file
// that requires this helper gets it for free, regardless of require order.
//
// Node resolves "./../style/visual.less" relative to the *compiled* file
// (.tmp/test-build/src/visual.js), i.e. .tmp/test-build/style/visual.less -- a build-output path
// that only ever holds compiled .ts, never the real stylesheet. require.extensions alone only
// controls how an already-resolved file is loaded, not whether Node can resolve a path that
// doesn't exist, so an empty stand-in file has to exist there too. It lives entirely under the
// gitignored .tmp/ build output.
{
    const lessStubDir = path.join(__dirname, "../../.tmp/test-build/style");
    const lessStubFile = path.join(lessStubDir, "visual.less");
    // powerbi-visuals/non-literal-fs-path guards against untrusted, dynamically-built paths
    // reaching fs.* in the shipped visual (which has no filesystem access anyway). These paths
    // are build-fixed constants derived from __dirname, not external input.
    // eslint-disable-next-line powerbi-visuals/non-literal-fs-path -- fixed path built from __dirname, not external input
    fs.mkdirSync(lessStubDir, { recursive: true });
    // eslint-disable-next-line powerbi-visuals/non-literal-fs-path -- fixed path built from __dirname, not external input
    if (!fs.existsSync(lessStubFile)) {
        // eslint-disable-next-line powerbi-visuals/non-literal-fs-path -- fixed path built from __dirname, not external input
        fs.writeFileSync(lessStubFile, "");
    }
}
require.extensions[".less"] = () => {};

// Installs a jsdom document (and the DOM globals the rendering/interaction code touches) onto
// globalThis. Call this before requiring any module that references `document` at module scope
// or during construction (pattern shared with test/unit/renderFleet.test.js and friends).
function installDom() {
    const dom = new JSDOM("<!DOCTYPE html><body></body>");
    const { window } = dom;

    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.DOMParser = window.DOMParser;
    globalThis.Element = window.Element;
    globalThis.HTMLElement = window.HTMLElement;
    globalThis.SVGElement = window.SVGElement;
    globalThis.KeyboardEvent = window.KeyboardEvent;
    globalThis.MouseEvent = window.MouseEvent;

    return dom;
}

// Installs a minimal fake AudioContext on globalThis so AlarmAudio's default
// `() => new AudioContext()` factory resolves without a real browser audio stack.
function installFakeAudioContext() {
    class FakeAudioContext {
        constructor() {
            this.currentTime = 0;
            this.state = "suspended";
            this.destination = {};
        }

        createOscillator() {
            return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
        }

        createGain() {
            return { gain: { value: 0 }, connect() {} };
        }

        resume() {
            this.state = "running";
            return Promise.resolve();
        }

        close() {
            this.state = "closed";
            return Promise.resolve();
        }
    }

    globalThis.AudioContext = FakeAudioContext;
    return FakeAudioContext;
}

// Builds a minimal-but-real-shaped DataView around a table. `segment` (when passed) is mirrored
// onto `metadata.segment`, matching powerbi-visuals-api's DataViewMetadata for tests that need to
// simulate a partial/segmented data fetch.
function buildTableDataView({ columns, rows }, { segment } = {}) {
    const metadata = { columns };
    if (segment !== undefined) {
        metadata.segment = segment;
    }

    return {
        metadata,
        table: { columns, rows }
    };
}

// Builds columns from a header row using ROLE_BY_HEADER, the shape `parseDataView` expects.
function columnsFromHeaders(headers) {
    return headers.map((header) => ({
        displayName: header,
        roles: ROLE_BY_HEADER[header] ? { [ROLE_BY_HEADER[header]]: true } : {}
    }));
}

// Reads test/fixtures/bucket_health_components.csv and returns it as a DataView, using the same
// role map as the CSV round-trip tests in parseDataView.test.js.
function fixtureDataView() {
    // eslint-disable-next-line powerbi-visuals/non-literal-fs-path -- fixed path built from __dirname, not external input
    const text = fs.readFileSync(FIXTURE_PATH, "utf8").trim();
    const [headerLine, ...lines] = text.split(/\r?\n/);
    const headers = headerLine.split(",");
    const columns = columnsFromHeaders(headers);
    const rows = lines.map((line) => line.split(","));

    return buildTableDataView({ columns, rows });
}

// A fresh ISelectionIdBuilder per call (matching the real host contract, where each call starts
// a new builder). The id is plain data so tests can assert on it with assert.deepEqual.
function createSelectionIdBuilder() {
    let rowIndex;
    return {
        withTable(_table, index) {
            rowIndex = index;
            return this;
        },
        createSelectionId() {
            return { __mockSelectionId: true, rowIndex };
        }
    };
}

// Builds a test double for IVisualHost covering everything src/visual.ts touches: eventService,
// selectionManager (a singleton per host, matching one visual instance owning one manager),
// createSelectionIdBuilder, colorPalette and hostCapabilities. Pass `overrides` to replace any
// property (including as an accessor, e.g. `{ get colorPalette() { throw new Error(...); } }`
// to make the ready-path render throw) — overrides are applied as property descriptors so
// getters are preserved rather than evaluated eagerly.
function createMockHost(overrides = {}) {
    const selectionManager = {
        select: mock.fn(() => Promise.resolve([])),
        clear: mock.fn(() => Promise.resolve()),
        showContextMenu: mock.fn(() => Promise.resolve()),
        toggleExpandCollapse: mock.fn(() => Promise.resolve()),
        hasSelection: () => false,
        getSelectionIds: () => [],
        registerOnSelectCallback: () => {}
    };

    const defaults = {
        eventService: {
            renderingStarted: mock.fn(),
            renderingFinished: mock.fn(),
            renderingFailed: mock.fn()
        },
        selectionManager,
        createSelectionManager: () => selectionManager,
        createSelectionIdBuilder,
        colorPalette: {
            isHighContrast: false,
            foreground: { value: "#ffffff" },
            background: { value: "#000000" },
            foregroundSelected: { value: "#ff0000" }
        },
        hostCapabilities: { allowInteractions: true },
        persistProperties: () => {},
        instanceId: "mock-host"
    };

    const host = {};
    Object.defineProperties(host, Object.getOwnPropertyDescriptors(defaults));
    Object.defineProperties(host, Object.getOwnPropertyDescriptors(overrides));
    return host;
}

module.exports = {
    installDom,
    installFakeAudioContext,
    buildTableDataView,
    fixtureDataView,
    createMockHost,
    ROLE_BY_HEADER
};
