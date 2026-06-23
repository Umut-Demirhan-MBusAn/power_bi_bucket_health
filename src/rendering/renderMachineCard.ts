import { MachineBucketModel } from "../data/types";
import { buildBucketGeometry } from "../geometry/bucketGeometry";
import { renderBucketSvg } from "./renderBucketSvg";
import { machineStatusKey, statusColors, statusLabels } from "../domain/statusMeta";

const BUCKET_TARGET_HEIGHT = 220; // paired with .bucket-health-card height in style/visual.less

export function renderMachineCard(machine: MachineBucketModel): HTMLElement {
    const card = document.createElement("article");
    card.className = machine.hasAlarm
        ? "bucket-health-card bucket-health-card--alarm"
        : "bucket-health-card";
    card.setAttribute("data-machine-key", machine.key);

    const all = [
        ...machine.teeth,
        ...machine.lipShrouds,
        ...machine.wingShroudsLeft,
        ...machine.wingShroudsRight
    ];

    // Frame color reflects the machine's overall status: alarm if any component alarms,
    // "no data" if every component is no-data/lockout+no-data, otherwise OK.
    const statusKey = machineStatusKey(all.map(c => c.status));
    card.style.borderColor = statusColors[statusKey];

    // Card height is uniform across the fleet; width tracks the bucket's aspect ratio so the
    // bucket fills that fixed height without distortion. More teeth → wider viewBox → wider card.
    const geometry = buildBucketGeometry(machine);
    const aspect = geometry.viewBoxWidth / geometry.viewBoxHeight;
    const targetWidth = Math.round(aspect * BUCKET_TARGET_HEIGHT);
    card.style.flex = `${targetWidth} 1 ${targetWidth}px`;

    const cardHeader = document.createElement("div");
    cardHeader.className = "bucket-health-card__header";

    const headerText = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = machine.name;

    const wingCount = machine.wingShroudsLeft.length + machine.wingShroudsRight.length;
    const countLabel = (count: number, noun: string): string | undefined =>
        count > 0 ? `${count} ${noun}` : undefined;

    const meta = document.createElement("p");
    meta.textContent = [
        machine.type,
        countLabel(machine.teeth.length, "teeth"),
        countLabel(machine.lipShrouds.length, "lip shrouds"),
        countLabel(wingCount, "wing shrouds")
    ].filter(Boolean).join(" · ");

    const statusBadge = document.createElement("span");
    statusBadge.className = machine.hasAlarm
        ? "bucket-health-card__status bucket-health-card__status--alarm"
        : "bucket-health-card__status";
    statusBadge.textContent = machine.hasAlarm
        ? "ALARM!"
        : statusKey === "nodata" ? "NO DATA" : "OK";

    headerText.append(title, meta);
    cardHeader.append(headerText, statusBadge);
    card.append(cardHeader);

    if (machine.hasAlarm) {
        const componentLabel = (c: typeof all[number]): string => {
            const prefix =
                c.category === "tooth"
                    ? "Tooth"
                    : c.category === "lipShroud"
                        ? "Lip"
                        : "Wing";
            return `${prefix} ${c.order}`;
        };

        const alarmBanner = document.createElement("div");
        alarmBanner.className = "bucket-health-card__alarm-banner";

        const moveComponents = all.filter(c => c.status === "move");
        const proxComponents = all.filter(c => c.status === "prox");

        if (moveComponents.length > 0) {
            const moveLine = document.createElement("div");
            moveLine.className =
                "bucket-health-card__alarm-line bucket-health-card__alarm-line--move";
            moveLine.textContent =
                statusLabels["move"] + " - " + moveComponents.map(componentLabel).join(", ");
            alarmBanner.append(moveLine);
        }

        if (proxComponents.length > 0) {
            const proxLine = document.createElement("div");
            proxLine.className =
                "bucket-health-card__alarm-line bucket-health-card__alarm-line--prox";
            proxLine.textContent =
                statusLabels["prox"] + " - " + proxComponents.map(componentLabel).join(", ");
            alarmBanner.append(proxLine);
        }

        card.append(alarmBanner);
    }

    card.append(renderBucketSvg(machine, geometry));
    return card;
}
