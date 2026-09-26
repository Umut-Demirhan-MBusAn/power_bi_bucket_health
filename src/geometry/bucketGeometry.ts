import { ComponentRecord, MachineBucketModel } from "../data/types";
import { isAlarmStatus } from "../data/normalizeStatus";
import {
    BucketGeometry,
    LipShroudGeometry,
    Point,
    RectGeometry,
    ToothGeometry,
    WingShroudGeometry
} from "./geometryTypes";

export const bucketGeometryConstants = {
    SLOT: 66,
    TOOTH_W: 30,
    TOOTH_H: 54,
    LIP_W: 26,
    LIP_H: 30,
    WING_HL: 24,
    WING_IN: 11,
    WING_OUT: 14,
    WING_PITCH: 56,
    MARGIN: 72,
    TOP_Y: 86,
    BASE_BUCKET_H: 116,
    WING_BUCKET_H: 46,
    TOP_WIDTH_RATIO: 0.84,
    HITCH_ORIGIN_X: 440,
    HITCH_ORIGIN_Y: 94
} as const;

export function buildBucketGeometry(machine: MachineBucketModel): BucketGeometry {
    // Teeth and lip shrouds keep the parser's display order (left-to-right or right-to-left).
    const teeth = machine.teeth;
    const lipShrouds = machine.lipShrouds;
    const wingShroudsLeft = sortComponents(machine.wingShroudsLeft);
    const wingShroudsRight = sortComponents(machine.wingShroudsRight);

    const toothCount = clamp(teeth.length, 4, 20);
    const wingsPerSide = clamp(Math.max(wingShroudsLeft.length, wingShroudsRight.length), 0, 4);
    const c = bucketGeometryConstants;

    const halfBottomWidth = toothCount * c.SLOT / 2;
    const halfTopWidth = halfBottomWidth * c.TOP_WIDTH_RATIO;
    const topY = c.TOP_Y;
    const bucketHeight = c.BASE_BUCKET_H + wingsPerSide * c.WING_BUCKET_H;
    const bottomY = topY + bucketHeight;
    const centerX = halfBottomWidth + c.MARGIN;
    const viewBoxWidth = 2 * centerX;
    const viewBoxHeight = bottomY + c.TOOTH_H + 40;

    const topLeft = point(centerX - halfTopWidth, topY);
    const topRight = point(centerX + halfTopWidth, topY);
    const bottomLeft = point(centerX - halfBottomWidth, bottomY);
    const bottomRight = point(centerX + halfBottomWidth, bottomY);
    const insetTopLeft = point(topLeft.x + 38, topY + 26);
    const insetTopRight = point(topRight.x - 38, topY + 26);
    const insetBottomLeft = point(bottomLeft.x + 54, bottomY - 14);
    const insetBottomRight = point(bottomRight.x - 54, bottomY - 14);

    const cuttingEdgeLeft = point(bottomLeft.x + 10, bottomY);
    const cuttingEdgeRight = point(bottomRight.x - 10, bottomY);
    const slot = (cuttingEdgeRight.x - cuttingEdgeLeft.x) / toothCount;

    const toothGeometry = buildTeeth(teeth, cuttingEdgeLeft, slot, bottomY);
    const lipGeometry = buildLipShrouds(lipShrouds, cuttingEdgeLeft, slot, bottomY);
    const wingGeometry = [
        ...buildWingShrouds(wingShroudsLeft, "left", bottomLeft, topLeft, centerX, topY, bucketHeight),
        ...buildWingShrouds(wingShroudsRight, "right", bottomRight, topRight, centerX, topY, bucketHeight)
    ];
    const alarmComponents = [...teeth, ...lipShrouds, ...wingShroudsLeft, ...wingShroudsRight]
        .filter((component) => isAlarmStatus(component.status));
    const anyMovementAlarm = alarmComponents.some((component) => component.status === "move");

    return {
        viewBox: `0 0 ${fmt(viewBoxWidth)} ${fmt(viewBoxHeight)}`,
        viewBoxWidth,
        viewBoxHeight,
        centerX,
        topY,
        bottomY,
        bucketHeight,
        halfBottomWidth,
        halfTopWidth,
        body: {
            shellPath: `M ${points(topLeft)} L ${points(topRight)} L ${points(bottomRight)} L ${points(bottomLeft)} Z`,
            cavityPath: `M ${points(insetTopLeft)} L ${points(insetTopRight)} L ${points(insetBottomRight)} L ${points(insetBottomLeft)} Z`,
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
        },
        cuttingEdgeBeamPath: `M ${points(point(cuttingEdgeLeft.x, bottomY - 9))} L ${points(point(cuttingEdgeRight.x, bottomY - 9))} L ${points(point(cuttingEdgeRight.x + 4, bottomY + 11))} L ${points(point(cuttingEdgeLeft.x - 4, bottomY + 11))} Z`,
        spillGuardRects: buildSpillGuard(topLeft, topRight, topY),
        hitchTransform: buildHitchTransform(centerX, topY, halfTopWidth),
        teeth: toothGeometry,
        lipShrouds: lipGeometry,
        wingShrouds: wingGeometry,
        alarmCenter: point(centerX, topY + bucketHeight * 0.42),
        alarmLabel: alarmComponents.length > 0 ? (anyMovementAlarm ? "MOVEMENT ALARM" : "PROXIMITY ALARM") : undefined,
        shadow: {
            center: point(centerX, bottomY + c.TOOTH_H + 18),
            radiusX: halfBottomWidth,
            radiusY: 16
        }
    };
}

function buildTeeth(
    teeth: ComponentRecord[],
    cuttingEdgeLeft: Point,
    slot: number,
    bottomY: number
): ToothGeometry[] {
    const c = bucketGeometryConstants;
    const halfWidth = c.TOOTH_W / 2;
    const top = bottomY - 2;

    return teeth.map((component, index) => {
        const center = point(cuttingEdgeLeft.x + (index + 0.5) * slot, top + c.TOOTH_H * 0.5);
        const path =
            `M ${points(point(center.x - halfWidth, top))} L ${points(point(center.x + halfWidth, top))} ` +
            `L ${points(point(center.x + c.TOOTH_W * 0.22, top + c.TOOTH_H * 0.86))} ` +
            `Q ${points(point(center.x + c.TOOTH_W * 0.14, top + c.TOOTH_H))} ${points(point(center.x, top + c.TOOTH_H))} ` +
            `Q ${points(point(center.x - c.TOOTH_W * 0.14, top + c.TOOTH_H))} ${points(point(center.x - c.TOOTH_W * 0.22, top + c.TOOTH_H * 0.86))} Z`;

        return {
            componentKey: component.componentKey,
            order: component.order,
            status: component.status,
            path,
            center,
            topY: top
        };
    });
}

function buildLipShrouds(
    lipShrouds: ComponentRecord[],
    cuttingEdgeLeft: Point,
    slot: number,
    bottomY: number
): LipShroudGeometry[] {
    const c = bucketGeometryConstants;

    return lipShrouds.map((component, index) => {
        const center = point(cuttingEdgeLeft.x + (index + 1) * slot, bottomY - 2);
        const rect = {
            x: round(center.x - c.LIP_W / 2),
            y: round(bottomY - c.LIP_H / 2 - 3),
            width: c.LIP_W,
            height: c.LIP_H
        };

        return {
            componentKey: component.componentKey,
            order: component.order,
            status: component.status,
            rect,
            center
        };
    });
}

function buildWingShrouds(
    wingShrouds: ComponentRecord[],
    side: "left" | "right",
    bottom: Point,
    top: Point,
    centerX: number,
    topY: number,
    bucketHeight: number
): WingShroudGeometry[] {
    if (wingShrouds.length === 0) {
        return [];
    }

    const c = bucketGeometryConstants;
    const center = point(centerX, topY + bucketHeight * 0.4);
    const ab = point(top.x - bottom.x, top.y - bottom.y);
    const edgeLength = Math.hypot(ab.x, ab.y);
    const u = point(ab.x / edgeLength, ab.y / edgeLength);
    let v = point(u.y, -u.x);
    const sideCenter = lerp(bottom, top, 0.4);

    if ((sideCenter.x - center.x) * v.x + (sideCenter.y - center.y) * v.y < 0) {
        v = point(-v.x, -v.y);
    }

    const pitchT = c.WING_PITCH / edgeLength;

    return wingShrouds.map((component, index) => {
        // Lowest order at the top, increasing downward (top-to-bottom for both sides).
        const t = clamp(0.5 + ((wingShrouds.length - 1) / 2 - index) * pitchT, 0.1, 0.9);
        const wingCenter = lerp(bottom, top, t);
        const polygon = [
            wingPoint(wingCenter, u, v, -c.WING_HL, -c.WING_IN),
            wingPoint(wingCenter, u, v, c.WING_HL, -c.WING_IN),
            wingPoint(wingCenter, u, v, c.WING_HL, c.WING_OUT),
            wingPoint(wingCenter, u, v, -c.WING_HL, c.WING_OUT)
        ];

        return {
            componentKey: component.componentKey,
            order: component.order,
            status: component.status,
            side,
            polygon,
            points: points(...polygon),
            center: wingCenter
        };
    });
}

function buildSpillGuard(topLeft: Point, topRight: Point, topY: number): RectGeometry[] {
    const width = topRight.x - topLeft.x;
    const count = Math.max(5, Math.floor(width / 26));
    const rects: RectGeometry[] = [];

    for (let index = 0; index < count; index++) {
        const t = count === 1 ? 0 : index / (count - 1);
        const x = topLeft.x + 16 + t * (width - 32);

        rects.push({
            x: round(x - 3.5),
            y: round(topY - 4 - Math.sin(t * Math.PI) * 4),
            width: 7,
            height: 20
        });
    }

    return rects;
}

function buildHitchTransform(centerX: number, topY: number, halfTopWidth: number): string {
    const scale = clamp((2 * halfTopWidth) / 320, 0.6, 1.05);

    return `translate(${fmt(centerX)} ${fmt(topY)}) scale(${fmt(scale, 3)}) translate(-${bucketGeometryConstants.HITCH_ORIGIN_X} -${bucketGeometryConstants.HITCH_ORIGIN_Y})`;
}

function wingPoint(center: Point, u: Point, v: Point, along: number, outward: number): Point {
    return point(
        center.x + u.x * along + v.x * outward,
        center.y + u.y * along + v.y * outward
    );
}

function sortComponents(components: ComponentRecord[]): ComponentRecord[] {
    return [...components].sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder);
}

function lerp(a: Point, b: Point, t: number): Point {
    return point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}

function point(x: number, y: number): Point {
    return {
        x: round(x),
        y: round(y)
    };
}

function points(...items: Point[]): string {
    return items.map((item) => `${fmt(item.x)},${fmt(item.y)}`).join(" ");
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
}

function fmt(value: number, digits = 2): string {
    return String(round(value, digits));
}
