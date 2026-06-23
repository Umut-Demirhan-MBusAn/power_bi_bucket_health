/**
 * Pure Node.js PNG icon generator for BucketHealth.
 * No external dependencies - uses built-in zlib only.
 * Writes 300x300 RGBA PNG to assets/icon.png.
 *
 * Run: node scripts/gen-icon.js
 */
"use strict";
const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");

const W = 300, H = 300;
const px = Buffer.alloc(W * H * 4); // RGBA

// ---- drawing helpers --------------------------------------------------------

function sp(x, y, r, g, b, a = 255) {
    x = x | 0; y = y | 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

function fr(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
            sp(x + dx, y + dy, r, g, b, a);
}

function fp(pts, r, g, b, a = 255) {
    const ys = pts.map(p => p[1]);
    const y0 = Math.ceil(Math.min(...ys)), y1 = Math.floor(Math.max(...ys));
    const n = pts.length;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
        const xs = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
            if ((ay <= y && by > y) || (by <= y && ay > y))
                xs.push(ax + (y - ay) * (bx - ax) / (by - ay));
        }
        xs.sort((a, b) => a - b);
        for (let j = 0; j + 1 < xs.length; j += 2)
            for (let x = Math.max(0, Math.ceil(xs[j])); x <= Math.min(W - 1, Math.floor(xs[j + 1])); x++)
                sp(x, y, r, g, b, a);
    }
}

function rr(x, y, w, h, rad, r, g, b, a = 255) {
    fr(x + rad, y, w - 2 * rad, h, r, g, b, a);
    fr(x, y + rad, rad, h - 2 * rad, r, g, b, a);
    fr(x + w - rad, y + rad, rad, h - 2 * rad, r, g, b, a);
    for (let dy = 0; dy < rad; dy++)
        for (let dx = 0; dx < rad; dx++)
            if ((dx - rad + 0.5) ** 2 + (dy - rad + 0.5) ** 2 <= rad * rad) {
                sp(x + dx, y + dy, r, g, b, a);
                sp(x + w - 1 - dx, y + dy, r, g, b, a);
                sp(x + dx, y + h - 1 - dy, r, g, b, a);
                sp(x + w - 1 - dx, y + h - 1 - dy, r, g, b, a);
            }
}

function disc(cx, cy, rad, r, g, b) {
    for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++)
            if (dx * dx + dy * dy <= rad * rad)
                sp(cx + dx, cy + dy, r, g, b);
}

// ---- draw icon --------------------------------------------------------------

// Background (dark rounded square)
rr(0, 0, 300, 300, 36, 11, 16, 21);

// Subtle top-center radial brightness boost for the bg
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (px[i + 3] === 0) continue;
        const dx = (x - 150) / 160, dy = (y - 40) / 130;
        const glow = Math.max(0, Math.round((1 - Math.sqrt(dx * dx + dy * dy)) * 14));
        if (glow > 0) {
            px[i] = Math.min(255, px[i] + glow);
            px[i + 1] = Math.min(255, px[i + 1] + glow);
            px[i + 2] = Math.min(255, px[i + 2] + glow);
        }
    }
}

// Bucket body gradient (top #2d3a47 → bottom #1a212a)
// Trapezoid: top x=85-215 at y=88, bottom x=48-252 at y=200
for (let y = 88; y <= 200; y++) {
    const t = (y - 88) / 112;
    const r = Math.round(45 * (1 - t) + 26 * t);
    const g = Math.round(58 * (1 - t) + 33 * t);
    const b = Math.round(71 * (1 - t) + 42 * t);
    const lx = Math.round(85 - 37 * t);
    const rx = Math.round(215 + 37 * t);
    fr(lx, y, rx - lx + 1, 1, r, g, b);
}

// Bucket body outline
for (let y = 88; y <= 200; y++) {
    const t = (y - 88) / 112;
    const lx = Math.round(85 - 37 * t);
    const rx = Math.round(215 + 37 * t);
    sp(lx, y, 61, 79, 100);
    sp(rx, y, 61, 79, 100);
}

// Interior cavity (dark inset polygon)
fp([[103, 96], [197, 96], [228, 190], [72, 190]], 13, 23, 32);

// Spill guard bar
fr(85, 79, 130, 10, 61, 79, 100);
fr(85, 79, 130, 5, 82, 103, 126);

// Hitch saddle
rr(126, 62, 48, 20, 9, 30, 44, 58);
fr(126, 62, 48, 20, 30, 44, 58);
// Hitch outline
for (let dx = 0; dx < 48; dx++) {
    sp(126 + dx, 62, 61, 79, 100);
    sp(126 + dx, 81, 61, 79, 100);
}
for (let dy = 0; dy < 20; dy++) {
    sp(126, 62 + dy, 61, 79, 100);
    sp(173, 62 + dy, 61, 79, 100);
}
// Mounting lugs
rr(134, 54, 14, 18, 4, 38, 55, 74);
rr(152, 54, 14, 18, 4, 38, 55, 74);
// Pivot pin
disc(150, 72, 6, 61, 80, 104);
disc(150, 72, 3, 120, 152, 180);

// Teeth: TW=24, pitch=38, start x=62
// Colors: green, green, RED(alarm), green, amber
const TC = [
    [52, 211, 153], // #34D399 green
    [52, 211, 153],
    [255, 90, 90],  // #FF5A5A red (alarm)
    [52, 211, 153],
    [244, 192, 78]  // #F4C04E amber
];
for (let t = 0; t < 5; t++) {
    const tx = 62 + t * 38;
    const [r, g, b] = TC[t];
    // Tapered tooth: top 24px, tip 16px (4px inset each side)
    fp([[tx, 200], [tx + 24, 200], [tx + 20, 242], [tx + 4, 242]], r, g, b);
    // Highlight strip at top
    const hr = Math.min(255, r + 50), hg = Math.min(255, g + 50), hb = Math.min(255, b + 50);
    fp([[tx + 2, 200], [tx + 22, 200], [tx + 22, 209], [tx + 2, 209]], hr, hg, hb, 100);
}

// Alarm glow on T3 (red tooth at x=138)
for (let y = 200; y <= 242; y++) {
    for (let x = 136; x <= 164; x++) {
        const i = (y * W + x) * 4;
        if (px[i + 3] === 0) continue;
        // subtle glow spread outward from the tooth
    }
}
// Simple glow: slightly lighter pixels just outside tooth 3
for (let y = 197; y <= 244; y++) {
    for (let x = 133; x <= 167; x++) {
        const i = (y * W + x) * 4;
        if (px[i] === 255 && px[i + 1] === 90 && px[i + 2] === 90) continue; // on tooth, skip
        const cx = x - 150, cy = y - 221;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const glow = Math.max(0, Math.round((1 - dist / 20) * 25));
        if (glow > 0 && px[i + 3] > 0) {
            px[i] = Math.min(255, px[i] + glow * 3);
            px[i + 1] = Math.min(255, px[i + 1] + Math.round(glow * 0.3));
            px[i + 2] = Math.min(255, px[i + 2] + Math.round(glow * 0.3));
        }
    }
}

// Lip shrouds between teeth (darker green)
const LX = [88, 126, 164, 202];
for (const lx of LX) fr(lx, 200, 10, 19, 41, 163, 118);

// Wing shrouds: perpendicular to slope, 2 per side
// Left slope (85,88)→(48,200), outward normal ≈ (-0.950, -0.314)
fp([[69, 120], [74, 136], [61, 132], [56, 116]], 41, 163, 118);
fp([[57, 157], [62, 173], [49, 169], [44, 153]], 41, 163, 118);
// Right slope (215,88)→(252,200), outward normal ≈ (0.950, -0.314)
fp([[231, 120], [226, 136], [239, 132], [244, 116]], 41, 163, 118);
fp([[243, 157], [238, 173], [251, 169], [256, 153]], 41, 163, 118);

// ---- PNG encode --------------------------------------------------------------

function crc32(buf) {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    let c = 0xFFFFFFFF;
    for (const b of buf) c = t[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
    const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const lb = Buffer.alloc(4); lb.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(type), d]);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(td));
    return Buffer.concat([lb, td, cb]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: None
    px.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}

const idat = zlib.deflateSync(raw, { level: 9 });
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const out = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const dest = path.join(__dirname, "..", "assets", "icon.png");
fs.writeFileSync(dest, out);
console.log(`✓ icon.png written: ${out.length} bytes (${W}×${H} RGBA)`);
