const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBucketGeometry, bucketGeometryConstants } = require("../../.tmp/test-build/src/geometry/bucketGeometry");

function component(category, order, status = "ok", side) {
    return {
        machineKey: "EX-TEST",
        componentKey: `${category}-${side || "center"}-${order}`,
        category,
        order,
        derivedWingSide: side,
        status,
        tooltipFields: [],
        sourceOrder: order
    };
}

function machine({ teeth, leftWings = 0, rightWings = 0, toothStatus = {}, lipStatus = {}, leftWingStatus = {}, rightWingStatus = {} }) {
    const toothComponents = Array.from({ length: teeth }, (_, index) => {
        const order = index + 1;
        return component("tooth", order, toothStatus[order] || "ok");
    });
    const lipComponents = Array.from({ length: teeth - 1 }, (_, index) => {
        const order = index + 1;
        return component("lipShroud", order, lipStatus[order] || "ok");
    });
    const wingShroudsLeft = Array.from({ length: leftWings }, (_, index) => {
        const order = index + 1;
        return component("wingShroud", order, leftWingStatus[order] || "ok", "left");
    });
    const wingShroudsRight = Array.from({ length: rightWings }, (_, index) => {
        const order = index + 1;
        return component("wingShroud", order, rightWingStatus[order] || "ok", "right");
    });

    return {
        key: "EX-TEST",
        name: "EX-TEST",
        teeth: toothComponents,
        lipShrouds: lipComponents,
        wingShroudsLeft,
        wingShroudsRight,
        alarmCount: 0,
        hasAlarm: false,
        sourceOrder: 0
    };
}

test("bucket geometry uses handoff constants", () => {
    assert.equal(bucketGeometryConstants.SLOT, 66);
    assert.equal(bucketGeometryConstants.TOOTH_W, 30);
    assert.equal(bucketGeometryConstants.TOOTH_H, 54);
    assert.equal(bucketGeometryConstants.LIP_W, 26);
    assert.equal(bucketGeometryConstants.LIP_H, 30);
    assert.equal(bucketGeometryConstants.WING_PITCH, 56);
    assert.equal(bucketGeometryConstants.MARGIN, 72);
});

test("buildBucketGeometry matches minimum geometry dimensions", () => {
    const geometry = buildBucketGeometry(machine({ teeth: 4 }));

    assert.equal(geometry.viewBox, "0 0 408 296");
    assert.equal(geometry.centerX, 204);
    assert.equal(geometry.bottomY, 202);
    assert.equal(geometry.bucketHeight, 116);
    assert.equal(geometry.halfBottomWidth, 132);
    assert.equal(geometry.halfTopWidth, 110.88);
    assert.equal(geometry.teeth.length, 4);
    assert.equal(geometry.lipShrouds.length, 3);
    assert.equal(geometry.wingShrouds.length, 0);
    assert.equal(geometry.spillGuardRects.length, 8);
    assert.equal(geometry.hitchTransform, "translate(204 86) scale(0.693) translate(-440 -94)");
});

test("buildBucketGeometry matches maximum geometry dimensions", () => {
    const geometry = buildBucketGeometry(machine({ teeth: 20, leftWings: 4, rightWings: 4 }));

    assert.equal(geometry.viewBox, "0 0 1464 480");
    assert.equal(geometry.centerX, 732);
    assert.equal(geometry.bottomY, 386);
    assert.equal(geometry.bucketHeight, 300);
    assert.equal(geometry.halfBottomWidth, 660);
    assert.equal(geometry.halfTopWidth, 554.4);
    assert.equal(geometry.teeth.length, 20);
    assert.equal(geometry.lipShrouds.length, 19);
    assert.equal(geometry.wingShrouds.length, 8);
    assert.equal(geometry.hitchTransform, "translate(732 86) scale(1.05) translate(-440 -94)");
    assert.deepEqual(geometry.shadow, {
        center: { x: 732, y: 458 },
        radiusX: 660,
        radiusY: 16
    });
});

test("buildBucketGeometry preserves fixed component dimensions", () => {
    const geometry = buildBucketGeometry(machine({ teeth: 10, leftWings: 2, rightWings: 2 }));
    const firstTooth = geometry.teeth[0];
    const firstLip = geometry.lipShrouds[0];
    const firstWing = geometry.wingShrouds[0];

    assert.match(firstTooth.path, /^M 99,292 L 129,292/);
    assert.equal(firstLip.rect.width, 26);
    assert.equal(firstLip.rect.height, 30);
    assert.equal(firstWing.polygon.length, 4);
    assert.equal(firstWing.points.split(" ").length, 4);
});

test("buildBucketGeometry supports asymmetric wing counts using max side height", () => {
    const geometry = buildBucketGeometry(machine({ teeth: 10, leftWings: 3, rightWings: 1 }));

    assert.equal(geometry.bucketHeight, 254);
    assert.equal(geometry.wingShrouds.length, 4);
    assert.equal(geometry.wingShrouds.filter((wing) => wing.side === "left").length, 3);
    assert.equal(geometry.wingShrouds.filter((wing) => wing.side === "right").length, 1);
});

test("buildBucketGeometry orders wing shrouds top-to-bottom by order on each side", () => {
    const geometry = buildBucketGeometry(machine({ teeth: 10, leftWings: 3, rightWings: 3 }));

    ["left", "right"].forEach((side) => {
        const wings = geometry.wingShrouds.filter((wing) => wing.side === side);
        assert.deepEqual(wings.map((wing) => wing.order), [1, 2, 3]);
        // order 1 sits at the top (smallest y), increasing downward
        assert.ok(wings[0].center.y < wings[1].center.y, `${side} 1 above 2`);
        assert.ok(wings[1].center.y < wings[2].center.y, `${side} 2 above 3`);
    });
});

test("buildBucketGeometry derives the dominant alarm label", () => {
    const movement = buildBucketGeometry(machine({
        teeth: 10,
        leftWings: 1,
        rightWings: 1,
        toothStatus: { 5: "prox" },
        lipStatus: { 3: "move" },
        leftWingStatus: { 1: "prox" }
    }));
    assert.equal(movement.alarmLabel, "MOVEMENT ALARM");

    const proximity = buildBucketGeometry(machine({ teeth: 10, toothStatus: { 5: "prox" } }));
    assert.equal(proximity.alarmLabel, "PROXIMITY ALARM");

    const healthy = buildBucketGeometry(machine({ teeth: 10 }));
    assert.equal(healthy.alarmLabel, undefined);
});

function numbersIn(path) {
    return (path.match(/-?\d+(\.\d+)?/g) || []).map(Number);
}

function pathPoints(path) {
    const values = numbersIn(path);
    const result = [];
    for (let index = 0; index + 1 < values.length; index += 2) {
        result.push({ x: values[index], y: values[index + 1] });
    }
    return result;
}

function projectedRange(polygon, axis) {
    const projections = polygon.map((p) => p.x * axis.x + p.y * axis.y);
    return [Math.min(...projections), Math.max(...projections)];
}

function polygonsOverlap(a, b) {
    const edges = [a, b].flatMap((polygon) => polygon.map((p, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return { x: next.y - p.y, y: p.x - next.x };
    }));
    return edges.every((axis) => {
        const [aMin, aMax] = projectedRange(a, axis);
        const [bMin, bMax] = projectedRange(b, axis);
        return aMax > bMin + 1e-6 && bMax > aMin + 1e-6;
    });
}

test("geometry stays valid for every tooth count and wing count", () => {
    const c = bucketGeometryConstants;
    let minGap = Infinity;

    for (let teeth = 4; teeth <= 20; teeth++) {
        for (let wings = 0; wings <= 4; wings++) {
            const label = `${teeth} teeth, ${wings} wings per side`;
            const geometry = buildBucketGeometry(machine({ teeth, leftWings: wings, rightWings: wings }));
            const inside = (p) => p.x >= 0 && p.y >= 0 && p.x <= geometry.viewBoxWidth && p.y <= geometry.viewBoxHeight;

            const allPoints = [
                ...geometry.teeth.flatMap((tooth) => pathPoints(tooth.path)),
                ...geometry.lipShrouds.flatMap(({ rect }) => [
                    { x: rect.x, y: rect.y },
                    { x: rect.x + rect.width, y: rect.y + rect.height }
                ]),
                ...geometry.wingShrouds.flatMap((wing) => wing.polygon)
            ];
            allPoints.forEach((p) => {
                assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${label}: finite point`);
                assert.ok(inside(p), `${label}: (${p.x}, ${p.y}) inside the viewBox`);
            });

            geometry.lipShrouds.forEach(({ rect }, index) => {
                const left = geometry.teeth[index].center.x + c.TOOTH_W / 2;
                const right = geometry.teeth[index + 1].center.x - c.TOOTH_W / 2;
                const gap = Math.min(rect.x - left, right - (rect.x + rect.width));
                minGap = Math.min(minGap, gap);
                assert.ok(gap >= 2, `${label}: lip ${index + 1} clears its teeth by ${gap}`);
            });

            ["left", "right"].forEach((side) => {
                const polygons = geometry.wingShrouds.filter((wing) => wing.side === side).map((wing) => wing.polygon);
                for (let a = 0; a < polygons.length; a++) {
                    for (let b = a + 1; b < polygons.length; b++) {
                        assert.ok(!polygonsOverlap(polygons[a], polygons[b]), `${label}: ${side} wings ${a + 1} and ${b + 1} overlap`);
                    }
                }
            });
        }
    }

    assert.equal(minGap, 2.5);
});
