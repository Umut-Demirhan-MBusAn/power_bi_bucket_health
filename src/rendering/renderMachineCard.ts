import { MachineBucketModel } from "../data/types";
import { renderBucketSvg } from "./renderBucketSvg";

export function renderMachineCard(machine: MachineBucketModel): HTMLElement {
    const card = document.createElement("article");
    card.className = machine.hasAlarm
        ? "bucket-health-card bucket-health-card--alarm"
        : "bucket-health-card";
    card.setAttribute("data-machine-key", machine.key);

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
    statusBadge.textContent = machine.hasAlarm
        ? `${machine.alarmCount} alarm${machine.alarmCount === 1 ? "" : "s"}`
        : "OK";

    headerText.append(title, meta);
    cardHeader.append(headerText, statusBadge);
    card.append(cardHeader, renderBucketSvg(machine));
    return card;
}
