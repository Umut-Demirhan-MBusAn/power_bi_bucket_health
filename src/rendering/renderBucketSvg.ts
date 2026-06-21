import { BucketStatusKey, MachineBucketModel } from "../data/types";
import { bucketStatusColors, buildBucketGeometry } from "../geometry/bucketGeometry";
import { BucketGeometry, Point, RectGeometry } from "../geometry/geometryTypes";

const svgNamespace = "http://www.w3.org/2000/svg";

export function renderBucketSvg(machine: MachineBucketModel): SVGSVGElement {
    const geometry = buildBucketGeometry(machine);
    const id = sanitizeId(machine.key);
    const svg = svgElement("svg");
    svg.setAttribute("class", "bucket-health-svg");
    svg.setAttribute("viewBox", geometry.viewBox);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${machine.name} bucket health`);

    const title = svgElement("title");
    title.textContent = `${machine.name} bucket health`;
    svg.append(title, createDefs(id), createBucketGroup(geometry, machine, id));

    return svg;
}

function createDefs(id: string): SVGDefsElement {
    const defs = svgElement("defs");

    const bodyGradient = svgElement("linearGradient");
    bodyGradient.setAttribute("id", `${id}-body-gradient`);
    bodyGradient.setAttribute("x1", "0");
    bodyGradient.setAttribute("x2", "0");
    bodyGradient.setAttribute("y1", "0");
    bodyGradient.setAttribute("y2", "1");
    bodyGradient.append(
        stop("0%", "#3d4651"),
        stop("100%", "#1a212a")
    );

    const cavityGradient = svgElement("radialGradient");
    cavityGradient.setAttribute("id", `${id}-cavity-gradient`);
    cavityGradient.setAttribute("cx", "50%");
    cavityGradient.setAttribute("cy", "30%");
    cavityGradient.setAttribute("r", "72%");
    cavityGradient.append(
        stop("0%", "#1b232c"),
        stop("100%", "#0b1016")
    );

    const softShadow = svgElement("filter");
    softShadow.setAttribute("id", `${id}-soft-shadow`);
    softShadow.setAttribute("x", "-40%");
    softShadow.setAttribute("y", "-40%");
    softShadow.setAttribute("width", "180%");
    softShadow.setAttribute("height", "180%");

    const blur = svgElement("feGaussianBlur");
    blur.setAttribute("stdDeviation", "8");
    softShadow.appendChild(blur);

    defs.append(bodyGradient, cavityGradient, softShadow);
    return defs;
}

function createBucketGroup(geometry: BucketGeometry, machine: MachineBucketModel, id: string): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__bucket");

    group.append(
        ellipse(geometry.shadow.center, geometry.shadow.radiusX, geometry.shadow.radiusY, "#000", "bucket-health-svg__shadow"),
        path(geometry.body.shellPath, `url(#${id}-body-gradient)`, "#647283", "bucket-health-svg__body"),
        path(geometry.body.cavityPath, `url(#${id}-cavity-gradient)`, "#0f1720", "bucket-health-svg__cavity"),
        text(geometry.centerX, geometry.topY + geometry.bucketHeight * 0.5, machine.name, "bucket-health-svg__watermark"),
        path(geometry.cuttingEdgeBeamPath, "#202a35", "#617184", "bucket-health-svg__beam"),
        createSpillGuard(geometry.spillGuardRects),
        createHitch(geometry.hitchTransform),
        createWingShrouds(geometry),
        createLipShrouds(geometry),
        createTeeth(geometry),
        createAlarmRings(geometry),
        createCenterAlarm(geometry)
    );

    return group;
}

function createSpillGuard(rects: RectGeometry[]): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__spill-guard");

    rects.forEach((rectGeometry) => {
        const item = rect(rectGeometry, "#596878", "#778697", "bucket-health-svg__spill-bar");
        group.appendChild(item);
    });

    return group;
}

function createHitch(transform: string): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__hitch");
    group.setAttribute("transform", transform);

    group.append(
        rect({ x: 385, y: 74, width: 110, height: 38 }, "#2c3642", "#6d7d8f", "bucket-health-svg__hitch-base", 8),
        rect({ x: 404, y: 36, width: 24, height: 52 }, "#384453", "#7c8da0", "bucket-health-svg__hitch-lug", 7),
        rect({ x: 452, y: 36, width: 24, height: 52 }, "#384453", "#7c8da0", "bucket-health-svg__hitch-lug", 7),
        circle({ x: 416, y: 62 }, 8, "#111820", "#91a1b3", "bucket-health-svg__hitch-pin"),
        circle({ x: 464, y: 62 }, 8, "#111820", "#91a1b3", "bucket-health-svg__hitch-pin")
    );

    return group;
}

function createTeeth(geometry: BucketGeometry): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__teeth");

    geometry.teeth.forEach((tooth) => {
        const element = path(tooth.path, fill(tooth.status), stroke(tooth.status), "bucket-health-svg__component bucket-health-svg__tooth");
        setComponentData(element, tooth.componentKey, tooth.status);
        group.appendChild(element);
    });

    return group;
}

function createLipShrouds(geometry: BucketGeometry): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__lips");

    geometry.lipShrouds.forEach((lip) => {
        const element = rect(lip.rect, fill(lip.status), stroke(lip.status), "bucket-health-svg__component bucket-health-svg__lip", 3);
        setComponentData(element, lip.componentKey, lip.status);
        group.appendChild(element);
    });

    return group;
}

function createWingShrouds(geometry: BucketGeometry): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__wings");

    geometry.wingShrouds.forEach((wing) => {
        const element = svgElement("polygon");
        element.setAttribute("class", "bucket-health-svg__component bucket-health-svg__wing");
        element.setAttribute("points", wing.points);
        element.setAttribute("fill", fill(wing.status));
        element.setAttribute("stroke", stroke(wing.status));
        element.setAttribute("stroke-width", "1.5");
        element.setAttribute("stroke-linejoin", "round");
        element.setAttribute("data-side", wing.side);
        setComponentData(element, wing.componentKey, wing.status);
        group.appendChild(element);
    });

    return group;
}

function createAlarmRings(geometry: BucketGeometry): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__alarm-rings");

    geometry.alarmRings.forEach((ring) => {
        const element = circle(ring.center, ring.radius, "none", ring.color, "bucket-health-svg__alarm-ring");
        element.setAttribute("stroke-width", "3");
        element.setAttribute("data-component-key", ring.componentKey);
        element.setAttribute("data-status", ring.status);
        group.appendChild(element);
    });

    return group;
}

function createCenterAlarm(geometry: BucketGeometry): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", geometry.alarmLabel ? "bucket-health-svg__center-alarm" : "bucket-health-svg__center-alarm bucket-health-svg__center-alarm--hidden");

    if (!geometry.alarmLabel) {
        return group;
    }

    const triangleSize = 34;
    const center = geometry.alarmCenter;
    const triangle = svgElement("path");
    triangle.setAttribute(
        "d",
        `M ${center.x},${center.y - triangleSize} L ${center.x + triangleSize * 0.92},${center.y + triangleSize * 0.75} L ${center.x - triangleSize * 0.92},${center.y + triangleSize * 0.75} Z`
    );
    triangle.setAttribute("fill", "#ff4d4d");
    triangle.setAttribute("stroke", "#ffd1d1");
    triangle.setAttribute("stroke-width", "2");

    const mark = text(center.x, center.y + 20, "!", "bucket-health-svg__alarm-mark");
    const label = text(center.x, center.y + 56, geometry.alarmLabel, "bucket-health-svg__alarm-label");

    group.append(
        circle(center, 52, "rgba(255,77,77,0.14)", "#ff4d4d", "bucket-health-svg__alarm-halo"),
        triangle,
        mark,
        label
    );

    return group;
}

function path(d: string, fillColor: string, strokeColor: string, className: string): SVGPathElement {
    const element = svgElement("path");
    element.setAttribute("class", className);
    element.setAttribute("d", d);
    element.setAttribute("fill", fillColor);
    element.setAttribute("stroke", strokeColor);
    element.setAttribute("stroke-width", "1.5");
    element.setAttribute("stroke-linejoin", "round");
    return element;
}

function rect(rectGeometry: RectGeometry, fillColor: string, strokeColor: string, className: string, radius = 0): SVGRectElement {
    const element = svgElement("rect");
    element.setAttribute("class", className);
    element.setAttribute("x", String(rectGeometry.x));
    element.setAttribute("y", String(rectGeometry.y));
    element.setAttribute("width", String(rectGeometry.width));
    element.setAttribute("height", String(rectGeometry.height));
    element.setAttribute("fill", fillColor);
    element.setAttribute("stroke", strokeColor);
    element.setAttribute("stroke-width", "1.5");

    if (radius > 0) {
        element.setAttribute("rx", String(radius));
    }

    return element;
}

function circle(center: Point, radius: number, fillColor: string, strokeColor: string, className: string): SVGCircleElement {
    const element = svgElement("circle");
    element.setAttribute("class", className);
    element.setAttribute("cx", String(center.x));
    element.setAttribute("cy", String(center.y));
    element.setAttribute("r", String(radius));
    element.setAttribute("fill", fillColor);
    element.setAttribute("stroke", strokeColor);
    return element;
}

function ellipse(center: Point, radiusX: number, radiusY: number, fillColor: string, className: string): SVGEllipseElement {
    const element = svgElement("ellipse");
    element.setAttribute("class", className);
    element.setAttribute("cx", String(center.x));
    element.setAttribute("cy", String(center.y));
    element.setAttribute("rx", String(radiusX));
    element.setAttribute("ry", String(radiusY));
    element.setAttribute("fill", fillColor);
    element.setAttribute("opacity", "0.35");
    return element;
}

function text(x: number, y: number, value: string, className: string): SVGTextElement {
    const element = svgElement("text");
    element.setAttribute("class", className);
    element.setAttribute("x", String(x));
    element.setAttribute("y", String(y));
    element.setAttribute("text-anchor", "middle");
    element.textContent = value;
    return element;
}

function stop(offset: string, color: string): SVGStopElement {
    const element = svgElement("stop");
    element.setAttribute("offset", offset);
    element.setAttribute("stop-color", color);
    return element;
}

function setComponentData(element: SVGElement, componentKey: string, status: BucketStatusKey): void {
    element.setAttribute("data-component-key", componentKey);
    element.setAttribute("data-status", status);
}

function fill(status: BucketStatusKey): string {
    return bucketStatusColors[status];
}

function stroke(status: BucketStatusKey): string {
    return mixWithBlack(bucketStatusColors[status], 0.42);
}

function mixWithBlack(hex: string, amount: number): string {
    const value = hex.replace("#", "");
    const red = Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount));
    const green = Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount));
    const blue = Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount));

    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function toHex(value: number): string {
    return value.toString(16).padStart(2, "0");
}

function sanitizeId(value: string): string {
    return `bucket-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
    return document.createElementNS(svgNamespace, name);
}
