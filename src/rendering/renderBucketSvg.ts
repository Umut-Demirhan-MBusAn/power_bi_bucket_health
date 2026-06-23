import { BucketStatusKey, MachineBucketModel } from "../data/types";
import { resolveComponentColors, statusLabels, VisualTheme } from "../domain/statusMeta";
import { BucketGeometry, Point, RectGeometry } from "../geometry/geometryTypes";

const svgNamespace = "http://www.w3.org/2000/svg";

export function renderBucketSvg(machine: MachineBucketModel, geometry: BucketGeometry, theme: VisualTheme): SVGSVGElement {
    const id = sanitizeId(machine.key);
    const svg = svgElement("svg");
    svg.setAttribute("class", "bucket-health-svg");
    svg.setAttribute("viewBox", geometry.viewBox);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${machine.name} bucket health`);

    svg.append(createDefs(id), createBucketGroup(geometry, id, theme));

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

    defs.append(bodyGradient, cavityGradient);
    return defs;
}

function createBucketGroup(geometry: BucketGeometry, id: string, theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__bucket");

    const hc = theme.isHighContrast;
    // In high contrast, the decorative shell loses its gradients/tints and becomes a legible
    // background fill with a strong foreground outline. Normal mode keeps the existing look.
    const bodyFill = hc ? theme.background : `url(#${id}-body-gradient)`;
    const bodyStroke = hc ? theme.foreground : "#647283";
    const cavityFill = hc ? theme.background : `url(#${id}-cavity-gradient)`;
    const cavityStroke = hc ? theme.foreground : "#0f1720";
    const beamFill = hc ? theme.background : "#202a35";
    const beamStroke = hc ? theme.foreground : "#617184";
    const decoStrokeWidth = hc ? 2 : 1.5;

    const elements: (SVGElement | undefined)[] = [
        ellipse(geometry.shadow.center, geometry.shadow.radiusX, geometry.shadow.radiusY, "#000", "bucket-health-svg__shadow"),
        path(geometry.body.shellPath, bodyFill, bodyStroke, "bucket-health-svg__body", decoStrokeWidth),
        path(geometry.body.cavityPath, cavityFill, cavityStroke, "bucket-health-svg__cavity", decoStrokeWidth),
        path(geometry.cuttingEdgeBeamPath, beamFill, beamStroke, "bucket-health-svg__beam", decoStrokeWidth),
        createSpillGuard(geometry.spillGuardRects, theme),
        createHitch(geometry.hitchTransform, theme),
        createWingShrouds(geometry, theme),
        createLipShrouds(geometry, theme),
        createTeeth(geometry, theme),
        createCenterAlarm(geometry)
    ];
    group.append(...elements.filter((e): e is SVGElement => e !== undefined));

    return group;
}

function createSpillGuard(rects: RectGeometry[], theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__spill-guard");

    const hc = theme.isHighContrast;
    const fillColor = hc ? theme.background : "#596878";
    const strokeColor = hc ? theme.foreground : "#778697";
    const strokeWidth = hc ? 2 : 1.5;

    rects.forEach((rectGeometry) => {
        const item = rect(rectGeometry, fillColor, strokeColor, "bucket-health-svg__spill-bar", 0, strokeWidth);
        group.appendChild(item);
    });

    return group;
}

function createHitch(transform: string, theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__hitch");
    group.setAttribute("transform", transform);

    const hc = theme.isHighContrast;
    const baseFill = hc ? theme.background : undefined;
    const lugFill = hc ? theme.background : undefined;
    const pinFill = hc ? theme.background : undefined;
    const outline = hc ? theme.foreground : undefined;
    const sw = hc ? 2 : 1.5;

    group.append(
        rect({ x: 385, y: 74, width: 110, height: 38 }, baseFill ?? "#2c3642", outline ?? "#6d7d8f", "bucket-health-svg__hitch-base", 8, sw),
        rect({ x: 404, y: 36, width: 24, height: 52 }, lugFill ?? "#384453", outline ?? "#7c8da0", "bucket-health-svg__hitch-lug", 7, sw),
        rect({ x: 452, y: 36, width: 24, height: 52 }, lugFill ?? "#384453", outline ?? "#7c8da0", "bucket-health-svg__hitch-lug", 7, sw),
        circle({ x: 416, y: 62 }, 8, pinFill ?? "#111820", outline ?? "#91a1b3", "bucket-health-svg__hitch-pin"),
        circle({ x: 464, y: 62 }, 8, pinFill ?? "#111820", outline ?? "#91a1b3", "bucket-health-svg__hitch-pin")
    );

    return group;
}

function createTeeth(geometry: BucketGeometry, theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__teeth");

    geometry.teeth.forEach((tooth) => {
        const colors = resolveComponentColors(tooth.status, theme);
        const element = path(tooth.path, colors.fill, colors.stroke, "bucket-health-svg__component bucket-health-svg__tooth", colors.strokeWidth);
        setComponentData(element, tooth.componentKey, tooth.status);
        applyComponentA11y(element, "Tooth", tooth.order, tooth.status);
        group.appendChild(element);
    });

    return group;
}

function createLipShrouds(geometry: BucketGeometry, theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__lips");

    geometry.lipShrouds.forEach((lip) => {
        const colors = resolveComponentColors(lip.status, theme);
        const element = rect(lip.rect, colors.fill, colors.stroke, "bucket-health-svg__component bucket-health-svg__lip", 3, colors.strokeWidth);
        setComponentData(element, lip.componentKey, lip.status);
        applyComponentA11y(element, "Lip shroud", lip.order, lip.status);
        group.appendChild(element);
    });

    return group;
}

function createWingShrouds(geometry: BucketGeometry, theme: VisualTheme): SVGGElement {
    const group = svgElement("g");
    group.setAttribute("class", "bucket-health-svg__wings");

    geometry.wingShrouds.forEach((wing) => {
        const colors = resolveComponentColors(wing.status, theme);
        const element = svgElement("polygon");
        element.setAttribute("class", "bucket-health-svg__component bucket-health-svg__wing");
        element.setAttribute("points", wing.points);
        element.setAttribute("fill", colors.fill);
        element.setAttribute("stroke", colors.stroke);
        element.setAttribute("stroke-width", String(colors.strokeWidth));
        element.setAttribute("stroke-linejoin", "round");
        element.setAttribute("data-side", wing.side);
        setComponentData(element, wing.componentKey, wing.status);
        applyComponentA11y(element, "Wing shroud", wing.order, wing.status);
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

    group.append(
        circle(center, 52, "rgba(255,77,77,0.14)", "#ff4d4d", "bucket-health-svg__alarm-halo"),
        triangle,
        mark
    );

    return group;
}

function path(d: string, fillColor: string, strokeColor: string, className: string, strokeWidth = 1.5): SVGPathElement {
    const element = svgElement("path");
    element.setAttribute("class", className);
    element.setAttribute("d", d);
    element.setAttribute("fill", fillColor);
    element.setAttribute("stroke", strokeColor);
    element.setAttribute("stroke-width", String(strokeWidth));
    element.setAttribute("stroke-linejoin", "round");
    return element;
}

function rect(rectGeometry: RectGeometry, fillColor: string, strokeColor: string, className: string, radius = 0, strokeWidth = 1.5): SVGRectElement {
    const element = svgElement("rect");
    element.setAttribute("class", className);
    element.setAttribute("x", String(rectGeometry.x));
    element.setAttribute("y", String(rectGeometry.y));
    element.setAttribute("width", String(rectGeometry.width));
    element.setAttribute("height", String(rectGeometry.height));
    element.setAttribute("fill", fillColor);
    element.setAttribute("stroke", strokeColor);
    element.setAttribute("stroke-width", String(strokeWidth));

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

// Makes each component keyboard-focusable and screen-reader friendly. The label combines a
// friendly component name ("Tooth 3") with the human-readable status from statusLabels.
function applyComponentA11y(element: SVGElement, name: string, order: number, status: BucketStatusKey): void {
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `${name} ${order}: ${statusLabels[status]}`);
}

function sanitizeId(value: string): string {
    return `bucket-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
    return document.createElementNS(svgNamespace, name);
}
