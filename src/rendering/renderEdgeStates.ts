"use strict";

import { BucketHealthDataState } from "../data/types";

// ---- inline SVG icons (64×64 viewBox) ---------------------------------------

const SVG_BUCKET_ADD = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,22 48,22 55,45 9,45" fill="rgba(74,143,212,0.10)" stroke="#4a8fd4" stroke-width="2" stroke-linejoin="round"/>
  <rect x="16" y="16" width="32" height="7" rx="2" fill="#2d4155" stroke="#4a8fd4" stroke-width="1.5"/>
  <rect x="11" y="45" width="11" height="12" rx="1.5" fill="#4a8fd4" opacity="0.75"/>
  <rect x="26.5" y="45" width="11" height="12" rx="1.5" fill="#4a8fd4" opacity="0.75"/>
  <rect x="42" y="45" width="11" height="12" rx="1.5" fill="#4a8fd4" opacity="0.75"/>
  <circle cx="32" cy="33" r="11" fill="rgba(74,143,212,0.12)" stroke="#4a8fd4" stroke-width="1.5"/>
  <path d="M32 27v12M26 33h12" stroke="#4a8fd4" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const SVG_LOADING = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="22" stroke="#1e2c3c" stroke-width="5"/>
  <path d="M32 10 A22 22 0 0 1 54 32 A22 22 0 0 1 44 50" stroke="#4a8fd4" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const SVG_WARNING = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="32,7 59,55 5,55" fill="rgba(244,192,78,0.10)" stroke="#F4C04E" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="32" y1="24" x2="32" y2="40" stroke="#F4C04E" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="48" r="2.5" fill="#F4C04E"/>
</svg>`;

const SVG_BUCKET_EMPTY = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,22 48,22 55,45 9,45" stroke="#3a4e63" stroke-width="2" stroke-linejoin="round" stroke-dasharray="5 3"/>
  <rect x="16" y="16" width="32" height="7" rx="2" stroke="#3a4e63" stroke-width="2" stroke-dasharray="5 3"/>
  <rect x="11" y="45" width="11" height="12" rx="1.5" stroke="#3a4e63" stroke-width="2" stroke-dasharray="4 2"/>
  <rect x="26.5" y="45" width="11" height="12" rx="1.5" stroke="#3a4e63" stroke-width="2" stroke-dasharray="4 2"/>
  <rect x="42" y="45" width="11" height="12" rx="1.5" stroke="#3a4e63" stroke-width="2" stroke-dasharray="4 2"/>
</svg>`;

const SVG_ERROR = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="24" fill="rgba(255,90,90,0.10)" stroke="#FF5A5A" stroke-width="2.5"/>
  <path d="M22 22l20 20M42 22L22 42" stroke="#FF5A5A" stroke-width="3" stroke-linecap="round"/>
</svg>`;

// ---- required field definitions for the landing page -----------------------

const FIELD_DEFS = [
    { name: "Machine",   desc: "Identifies each excavator (e.g. EX-204)" },
    { name: "Component", desc: "Component key (e.g. T1, L2, W3R)" },
    { name: "Category",  desc: "tooth / lipShroud / wingShroud" },
    { name: "Order",     desc: "Integer position of the component" },
    { name: "Component Status", desc: "Component health status" },
];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
    machine: "Machine", component: "Component", category: "Category",
    order: "Order", status: "Component Status", lastSeen: "Last Seen", alarmTime: "Comp. Alarm Time"
};

// ---- public API -------------------------------------------------------------

export function renderEdgeState(
    state: Exclude<BucketHealthDataState, "ready">,
    detail?: string,
    missingRoles?: string[]
): HTMLElement {
    const container = document.createElement("div");
    container.className = "bucket-health-state";

    const icon = document.createElement("div");
    icon.className = "bucket-health-state__icon";

    const title = document.createElement("h2");
    title.className = "bucket-health-state__title";

    const subtitle = document.createElement("p");
    subtitle.className = "bucket-health-state__subtitle";

    switch (state) {
        case "noFields":
            icon.appendChild(svgEl(SVG_BUCKET_ADD));
            icon.classList.add("bucket-health-state__icon--add");
            title.textContent = "Add data to get started";
            subtitle.textContent = "Bind the required fields in the Fields pane to render machine bucket health.";
            container.append(icon, title, subtitle, buildFieldList(FIELD_DEFS), buildAlarmTimeTip());
            break;

        case "loading":
            icon.appendChild(svgEl(SVG_LOADING));
            icon.classList.add("bucket-health-state__icon--loading");
            title.textContent = "Loading machine data";
            subtitle.textContent = "Waiting for data from Power BI…";
            container.append(icon, title, subtitle);
            break;

        case "invalidConfig":
            icon.appendChild(svgEl(SVG_WARNING));
            icon.classList.add("bucket-health-state__icon--warning");
            title.textContent = "Configuration incomplete";
            subtitle.textContent = "Bind the following required data roles to render the visual:";
            container.append(icon, title, subtitle);
            if (missingRoles && missingRoles.length > 0) {
                container.appendChild(buildMissingList(missingRoles));
            } else if (detail) {
                const p = document.createElement("p");
                p.className = "bucket-health-state__detail";
                p.textContent = detail;
                container.appendChild(p);
            }
            break;

        case "noData":
            icon.appendChild(svgEl(SVG_BUCKET_EMPTY));
            icon.classList.add("bucket-health-state__icon--empty");
            title.textContent = "No machines to show";
            subtitle.textContent = "No rows match the current filters or slicers. Adjust the page filters to see machines.";
            container.append(icon, title, subtitle);
            break;

        case "error":
        default:
            icon.appendChild(svgEl(SVG_ERROR));
            icon.classList.add("bucket-health-state__icon--error");
            title.textContent = "Couldn’t render the visual";
            subtitle.textContent = "An unexpected data error occurred. New audio alarms are suppressed until valid data returns.";
            container.append(icon, title, subtitle);
            if (detail) {
                const code = document.createElement("code");
                code.className = "bucket-health-state__error-detail";
                code.textContent = `ERR · ${detail}`;
                container.appendChild(code);
            }
            break;
    }

    return container;
}

// ---- helpers ----------------------------------------------------------------

function svgEl(svgString: string): Element {
    const root = new DOMParser().parseFromString(svgString, "image/svg+xml").documentElement;
    // The SVG strings here are static developer constants, so a parse error is not expected.
    // Guard defensively anyway: a malformed string yields a <parsererror> root, which we
    // replace with an empty span so the edge state still renders its title and guidance.
    if (root.nodeName === "parsererror" || root.getElementsByTagName("parsererror").length > 0) {
        return document.createElement("span");
    }
    return root;
}

// ---- tip builder ------------------------------------------------------------

function buildAlarmTimeTip(): HTMLElement {
    const tip = document.createElement("p");
    tip.className = "bh-landing-tip";
    tip.textContent =
        "Tip: Also bind Comp. Alarm Time for per-component audio tracking — without it, audio won't re-fire if a component clears and re-alarms in the same session.";
    return tip;
}

// ---- list builders ----------------------------------------------------------

function buildFieldList(defs: { name: string; desc: string }[]): HTMLElement {
    const ul = document.createElement("ul");
    ul.className = "bucket-health-state__field-list";

    defs.forEach(({ name, desc }) => {
        const li = document.createElement("li");
        li.className = "bucket-health-state__field-item";

        const dot = document.createElement("span");
        dot.className = "bucket-health-state__field-dot";

        const label = document.createElement("span");
        label.className = "bucket-health-state__field-name";
        label.textContent = name;

        const descEl = document.createElement("span");
        descEl.className = "bucket-health-state__field-desc";
        descEl.textContent = desc;

        li.append(dot, label, descEl);
        ul.appendChild(li);
    });

    return ul;
}

function buildMissingList(roles: string[]): HTMLElement {
    const ul = document.createElement("ul");
    ul.className = "bucket-health-state__field-list bucket-health-state__field-list--missing";

    roles.forEach((role) => {
        const li = document.createElement("li");
        li.className = "bucket-health-state__field-item bucket-health-state__field-item--missing";

        const x = document.createElement("span");
        x.className = "bucket-health-state__field-x";
        x.textContent = "✕";

        const label = document.createElement("span");
        label.className = "bucket-health-state__field-name";
        label.textContent = ROLE_DISPLAY_NAMES[role] ?? role;

        const badge = document.createElement("span");
        badge.className = "bucket-health-state__field-badge";
        badge.textContent = "not bound";

        li.append(x, label, badge);
        ul.appendChild(li);
    });

    return ul;
}
