import { MachineBucketModel } from "../data/types";
import { VisualTheme } from "../domain/statusMeta";
import { renderMachineCard } from "./renderMachineCard";

// Alarm animation periods in style/visual.less; each gets a `--bh-sync-<ms>` delay variable.
const ANIMATION_PERIODS_MS = [700, 800, 850];

const cardSignatures = new WeakMap<Element, string>();

export function renderFleet(
    machines: MachineBucketModel[],
    theme: VisualTheme,
    minCardWidth: number,
    truncated = false,
    warnings: string[] = []
): HTMLElement {
    const section = document.createElement("section");
    section.className = "bucket-health";
    section.append(...buildBanners(truncated, warnings));

    const grid = document.createElement("div");
    grid.className = gridClassName(machines.length);
    const now = timelineNow();
    machines.forEach((machine) => {
        grid.appendChild(createCard(machine, theme, minCardWidth, cardSignature(machine, theme, minCardWidth), now));
    });
    section.appendChild(grid);

    return section;
}

// Brings a section built by renderFleet up to date. A card whose signature is unchanged keeps its
// DOM node, so its focus, hover and running animations survive the update.
export function updateFleet(
    section: HTMLElement,
    machines: MachineBucketModel[],
    theme: VisualTheme,
    minCardWidth: number,
    truncated = false,
    warnings: string[] = []
): void {
    const grid = section.lastElementChild as HTMLElement;
    const now = timelineNow();

    const banners = buildBanners(truncated, warnings);
    const currentBanners = Array.from(section.children).filter((child) => child !== grid);
    if (!sameBanners(currentBanners, banners)) {
        currentBanners.forEach((banner) => banner.remove());
        banners.forEach((banner) => section.insertBefore(banner, grid));
    }

    grid.className = gridClassName(machines.length);

    const existing = new Map<string, Element>();
    Array.from(grid.children).forEach((card) => {
        const key = card.getAttribute("data-machine-key");
        if (key !== null) {
            existing.set(key, card);
        }
    });

    const desired = machines.map((machine) => {
        const signature = cardSignature(machine, theme, minCardWidth);
        const card = existing.get(machine.key);
        if (card && cardSignatures.get(card) === signature) {
            return card;
        }
        return createCard(machine, theme, minCardWidth, signature, now);
    });

    const keep = new Set(desired);
    Array.from(grid.children).forEach((card) => {
        if (!keep.has(card)) {
            card.remove();
        }
    });

    desired.forEach((card, index) => {
        const current = grid.children[index] ?? null;
        if (current !== card) {
            // Re-inserting a node restarts its CSS animations, so re-align them first.
            syncAnimationPhase(card as HTMLElement, now);
            grid.insertBefore(card, current);
        }
    });
}

// Everything a card's DOM depends on. Tooltip-only fields (last seen, tooltip fields, alarm time)
// are excluded: tooltips read the current model, so those changes need no rebuild.
export function cardSignature(machine: MachineBucketModel, theme: VisualTheme, minCardWidth: number): string {
    const components = [
        ...machine.teeth,
        ...machine.lipShrouds,
        ...machine.wingShroudsLeft,
        ...machine.wingShroudsRight
    ].map((c) => [c.category, c.componentKey, c.order, c.status, c.derivedWingSide ?? ""]);

    return JSON.stringify([
        theme,
        minCardWidth,
        machine.key,
        machine.name,
        machine.type ?? "",
        machine.hasAlarm,
        machine.incomplete,
        machine.issues,
        machine.teeth.length,
        machine.lipShrouds.length,
        machine.wingShroudsLeft.length,
        components
    ]);
}

function createCard(
    machine: MachineBucketModel,
    theme: VisualTheme,
    minCardWidth: number,
    signature: string,
    now: number
): HTMLElement {
    const card = renderMachineCard(machine, theme, minCardWidth);
    cardSignatures.set(card, signature);
    syncAnimationPhase(card, now);
    return card;
}

// A negative delay of (now mod period) puts every card's flashing on the document timeline's
// phase, so a card inserted mid-alarm flashes in step with the cards that were already there.
function syncAnimationPhase(card: HTMLElement, now: number): void {
    ANIMATION_PERIODS_MS.forEach((period) => {
        card.style.setProperty(`--bh-sync-${period}`, `${-Math.round(now % period)}ms`);
    });
}

function timelineNow(): number {
    const current = document.timeline?.currentTime;
    if (typeof current === "number") {
        return current;
    }
    return typeof performance !== "undefined" ? performance.now() : 0;
}

function buildBanners(truncated: boolean, warnings: string[]): HTMLElement[] {
    const banners: HTMLElement[] = [];

    if (truncated) {
        const banner = document.createElement("div");
        banner.className = "bh-truncation-warning";
        banner.textContent =
            "⚠ Row limit reached (2,000 rows) — some machines or components are not shown.";
        banners.push(banner);
    }

    warnings.forEach((warning) => {
        const banner = document.createElement("div");
        banner.className = "bh-fleet-warning";
        banner.textContent = `⚠ ${warning}`;
        banners.push(banner);
    });

    return banners;
}

function sameBanners(current: Element[], next: HTMLElement[]): boolean {
    return current.length === next.length && current.every((banner, index) =>
        banner.className === next[index].className && banner.textContent === next[index].textContent
    );
}

function gridClassName(machineCount: number): string {
    return machineCount === 1
        ? "bucket-health__grid bucket-health__grid--single"
        : "bucket-health__grid";
}
