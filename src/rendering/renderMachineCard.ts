import { MachineBucketModel } from "../data/types";
import { buildBucketGeometry } from "../geometry/bucketGeometry";
import { renderBucketSvg } from "./renderBucketSvg";
import { statusColors, statusLabels, worstStatus } from "../domain/statusMeta";
import { isAlarmStatus } from "../data/normalizeStatus";

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

    // Frame is colored by the worst status across all of the machine's components.
    const worst = worstStatus(all.map(c => c.status));
    card.style.borderColor = statusColors[worst];

    // Card height is uniform across the fleet; width tracks the bucket's aspect ratio so the
    // bucket fills that fixed height without distortion. More teeth → wider viewBox → wider card.
    const geometry = buildBucketGeometry(machine);
    const aspect = geometry.viewBoxWidth / geometry.viewBoxHeight;
    const targetWidth = Math.round(aspect * 220);
    card.style.flex = `${targetWidth} 1 ${targetWidth}px`;

    const cardHeader = document.createElement("div");
    cardHeader.className = "bucket-health-card__header";

    const headerText = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = machine.name;

    const meta = document.createElement("p");
    meta.textContent = [
        machine.type,
        `${machine.teeth.length} teeth`,
        `${machine.lipShrouds.length} lip shrouds`,
        `${machine.wingShroudsLeft.length + machine.wingShroudsRight.length} wing shrouds`
    ].filter(Boolean).join(" · ");

    const statusBadge = document.createElement("span");
    statusBadge.className = machine.hasAlarm
        ? "bucket-health-card__status bucket-health-card__status--alarm"
        : "bucket-health-card__status";
    statusBadge.textContent = machine.hasAlarm ? "ALARM!" : "OK";

    headerText.append(title, meta);
    cardHeader.append(headerText, statusBadge);
    card.append(cardHeader);

    const hasAlarm = machine.hasAlarm || all.some(c => isAlarmStatus(c.status));

    if (hasAlarm) {
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
                statusLabels["move"] + " — " + moveComponents.map(componentLabel).join(", ");
            alarmBanner.append(moveLine);
        }

        if (proxComponents.length > 0) {
            const proxLine = document.createElement("div");
            proxLine.className =
                "bucket-health-card__alarm-line bucket-health-card__alarm-line--prox";
            proxLine.textContent =
                statusLabels["prox"] + " — " + proxComponents.map(componentLabel).join(", ");
            alarmBanner.append(proxLine);
        }

        card.append(alarmBanner);
    }

    card.append(renderBucketSvg(machine));
    return card;
}
