import { BucketStatusKey, WingSide } from "../data/types";

export interface Point {
    x: number;
    y: number;
}

export interface RectGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BodyGeometry {
    shellPath: string;
    cavityPath: string;
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
}

export interface ToothGeometry {
    componentKey: string;
    order: number;
    status: BucketStatusKey;
    path: string;
    center: Point;
    topY: number;
}

export interface LipShroudGeometry {
    componentKey: string;
    order: number;
    status: BucketStatusKey;
    rect: RectGeometry;
    center: Point;
}

export interface WingShroudGeometry {
    componentKey: string;
    order: number;
    status: BucketStatusKey;
    side: WingSide;
    polygon: Point[];
    points: string;
    center: Point;
}

export interface AlarmRingGeometry {
    componentKey: string;
    status: Extract<BucketStatusKey, "prox" | "move">;
    center: Point;
    radius: number;
    color: string;
}

export interface BucketGeometry {
    viewBox: string;
    viewBoxWidth: number;
    viewBoxHeight: number;
    centerX: number;
    topY: number;
    bottomY: number;
    bucketHeight: number;
    halfBottomWidth: number;
    halfTopWidth: number;
    body: BodyGeometry;
    cuttingEdgeBeamPath: string;
    spillGuardRects: RectGeometry[];
    hitchTransform: string;
    teeth: ToothGeometry[];
    lipShrouds: LipShroudGeometry[];
    wingShrouds: WingShroudGeometry[];
    alarmRings: AlarmRingGeometry[];
    alarmCenter: Point;
    alarmLabel?: "PROXIMITY ALARM" | "MOVEMENT ALARM";
    shadow: {
        center: Point;
        radiusX: number;
        radiusY: number;
    };
}
