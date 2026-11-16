import { VIEW, WORLD_WIDTH } from '../../config/world';
import type { Rng } from '../../game/rng';
import type { HelipadZone } from '../../game/world';
import { between, disc, fillView, glow, padHalf, pick, strokeLine, type Ctx, type Scene } from '../art';
import { zoneColor } from '../map';
import { tracePolygon } from './shared';

type Side = 1 | -1;

const PLANET = { x: 545, y: 900, r: 620 };
const HULL_FACE = 62;
const DECK_EDGE = 163;
const DECK_TOP = 50;
const DECK_BOTTOM = 430;
const DOOR_DEPTH = 22;
const DOOR_HALF = 20;
const STAR_TINTS = ['205, 220, 240', '240, 236, 225', '255, 214, 178', '172, 196, 255'];

function sx(side: Side, u: number): number {
  return side === 1 ? u : WORLD_WIDTH - u;
}

function band(g: Ctx, side: Side, u0: number, u1: number, y: number, h: number): void {
  const a = sx(side, u0);
  const b = sx(side, u1);
  g.fillRect(Math.min(a, b), y, Math.abs(b - a), h);
}

function space(g: Ctx, rng: Rng): void {
  const sky = g.createLinearGradient(VIEW.x, VIEW.y, VIEW.x + VIEW.w, VIEW.y + VIEW.h);
  sky.addColorStop(0, '#111a2a');
  sky.addColorStop(0.5, '#060b14');
  sky.addColorStop(1, '#03070d');
  fillView(g, sky);
  g.save();
  g.translate(350, 120);
  g.rotate(-0.55);
  g.scale(1, 0.45);
  for (let i = 0; i < 50; i++) {
    const x = between(rng, -700, 700);
    const y = between(rng, -90, 90);
    const radius = between(rng, 70, 180);
    const cloud = g.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, i % 3 === 0 ? 'rgba(130, 93, 117, 0.055)' : 'rgba(77, 118, 165, 0.09)');
    cloud.addColorStop(1, 'rgba(20, 24, 45, 0)');
    g.fillStyle = cloud;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 600; i++) {
    disc(g, between(rng, -700, 700), between(rng, -1, 1) * between(rng, 0, 100), between(rng, 0.25, 0.8), 'rgba(200, 214, 240, 0.16)');
  }
  g.restore();
  for (let i = 0; i < 850; i++) {
    const x = between(rng, VIEW.x, VIEW.x + VIEW.w);
    const y = between(rng, VIEW.y, VIEW.y + VIEW.h);
    const tint = pick(rng, STAR_TINTS);
    const bright = i % 113 === 0;
    disc(g, x, y, bright ? 0.9 : between(rng, 0.2, 0.65), `rgba(${tint}, ${between(rng, 0.12, bright ? 0.85 : 0.5)})`);
    if (bright) {
      strokeLine(g, [{ x: x - 3.5, y }, { x: x + 3.5, y }], 0.5, `rgba(${tint}, 0.3)`);
      strokeLine(g, [{ x, y: y - 3.5 }, { x, y: y + 3.5 }], 0.5, `rgba(${tint}, 0.3)`);
    }
  }
}

function battleStation(g: Ctx, rng: Rng): void {
  const x = 600;
  const y = 73;
  const r = 29;
  const lit = g.createRadialGradient(x - 13, y - 15, 1, x + 7, y + 4, r * 1.3);
  lit.addColorStop(0, '#737e86');
  lit.addColorStop(0.65, '#343e49');
  lit.addColorStop(1, '#101823');
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = lit;
  g.fill();
  g.clip();
  for (let row = -r; row < r; row += 2.5) {
    g.fillStyle = 'rgba(4, 10, 17, 0.25)';
    g.fillRect(x - r, y + row, r * 2, 0.6);
    for (let col = -r; col < r; col += between(rng, 3, 9)) {
      g.fillStyle = rng() < 0.5 ? 'rgba(178, 193, 202, 0.16)' : 'rgba(6, 13, 22, 0.25)';
      g.fillRect(x + col, y + row, between(rng, 1, 5), 1.2);
    }
  }
  g.fillStyle = '#111a24';
  g.fillRect(x - r, y + 2, r * 2, 2);
  g.fillStyle = 'rgba(161, 177, 187, 0.3)';
  g.fillRect(x - r, y + 1, r * 2, 0.6);
  disc(g, x - 9, y - 10, 7, '#202d38');
  disc(g, x - 8, y - 9, 5.6, '#596975');
  disc(g, x - 7, y - 8, 3.8, '#354652');
  disc(g, x - 8, y - 9, 1.2, '#16232f');
  const night = g.createLinearGradient(x - r, y - r, x + r, y + r);
  night.addColorStop(0.35, 'rgba(4, 8, 14, 0)');
  night.addColorStop(0.85, 'rgba(4, 8, 14, 0.85)');
  g.fillStyle = night;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

function distantCruiser(g: Ctx): void {
  g.save();
  g.translate(322, 58);
  g.rotate(-0.3);
  tracePolygon(g, [{ x: 47, y: 0 }, { x: -31, y: -18 }, { x: -25, y: 0 }, { x: -31, y: 18 }]);
  g.fillStyle = '#273341';
  g.fill();
  strokeLine(g, [{ x: -31, y: -18 }, { x: 47, y: 0 }, { x: -25, y: 0 }], 0.6, '#53616f', false);
  tracePolygon(g, [{ x: 19, y: 0 }, { x: -22, y: -9 }, { x: -19, y: 9 }]);
  g.fillStyle = '#394654';
  g.fill();
  g.fillStyle = '#52606b';
  g.fillRect(-21, -7, 5, 14);
  g.fillStyle = '#1b2835';
  g.fillRect(-21, -5, 2, 10);
  for (const y of [-7, 0, 7]) disc(g, -28, y, 1.2, '#688ba4');
  g.restore();
}

function volcanicNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const hash = (a: number, b: number) => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const top = hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx;
  const bottom = hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

function volcanicSurface(g: Ctx): void {
  const { x, y, r } = PLANET;
  const step = 1;
  for (let py = y - r; py < VIEW.y + VIEW.h; py += step) {
    for (let px = VIEW.x; px < VIEW.x + VIEW.w; px += step) {
      const nx = (px + step / 2 - x) / r;
      const ny = (py + step / 2 - y) / r;
      const depth = 1 - nx * nx - ny * ny;
      if (depth < 0) continue;
      const nz = Math.sqrt(depth);
      const u = nx * 9 + 17;
      const v = nz * 9 + ny * 3 + 31;
      const warp = volcanicNoise(u * 1.7, v * 1.7);
      const fine = volcanicNoise(u * 19, v * 19);
      const rock = volcanicNoise(u * 6, v * 6) * 0.65 + fine * 0.35;
      const warpedU = u + warp * 1.8;
      const warpedV = v + volcanicNoise(u + 8, v - 3) * 1.8;
      const fault = Math.abs(volcanicNoise(warpedU, warpedV) * 0.75 + volcanicNoise(warpedU * 3, warpedV * 3) * 0.19 + fine * 0.06 - 0.5);
      const width = 0.016 + volcanicNoise(u * 3 - 4, v * 3 + 8) ** 3 * 0.08;
      const heat = Math.max(0, 1 - fault / width);
      const ember = Math.exp(-fault * 30) * 0.6;
      const light = Math.max(0.12, -nx * 0.5 - ny * 0.35 + nz * 0.15);
      const crust = (12 + rock * 48) * light;
      const red = Math.min(255, crust * 1.15 + ember * 100 + heat * 235);
      const green = Math.min(255, crust * 0.75 + ember * 12 + heat ** 2 * 165);
      const blue = Math.min(255, crust * 0.75 + heat ** 5 * 55);
      g.fillStyle = `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
      g.fillRect(px, py, step, step);
    }
  }
}

function planet(g: Ctx, rng: Rng): void {
  const { x, y, r } = PLANET;
  const halo = g.createRadialGradient(x, y, r - 3, x, y, r + 27);
  halo.addColorStop(0, 'rgba(255, 112, 47, 0.5)');
  halo.addColorStop(0.2, 'rgba(171, 42, 20, 0.2)');
  halo.addColorStop(1, 'rgba(95, 15, 8, 0)');
  g.fillStyle = halo;
  g.beginPath();
  g.arc(x, y, r + 36, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.clip();
  const surface = g.createLinearGradient(180, y - r, 670, y - r + 270);
  surface.addColorStop(0, '#38221e');
  surface.addColorStop(0.4, '#201719');
  surface.addColorStop(1, '#0d0c10');
  fillView(g, surface);
  volcanicSurface(g);
  for (let front = 0; front < 3; front++) {
    for (let i = 0; i < 50; i++) {
      const a = between(rng, -2.3, -0.95);
      const d = r - 14 - front * 43 + Math.sin(a * 8 + front) * 18 + between(rng, -10, 10);
      g.save();
      g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
      g.rotate(a + Math.PI / 2 + 0.2);
      g.scale(between(rng, 20, 55), between(rng, 4, 12));
      const cloud = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      cloud.addColorStop(0, 'rgba(65, 46, 43, 0.28)');
      cloud.addColorStop(0.45, 'rgba(50, 34, 33, 0.14)');
      cloud.addColorStop(1, 'rgba(39, 25, 26, 0)');
      g.fillStyle = cloud;
      g.fillRect(-1, -1, 2, 2);
      g.restore();
    }
  }
  const terminator = g.createRadialGradient(260, 280, 70, 260, 280, 540);
  terminator.addColorStop(0, 'rgba(3, 7, 14, 0.03)');
  terminator.addColorStop(0.5, 'rgba(7, 3, 6, 0.12)');
  terminator.addColorStop(0.82, 'rgba(7, 3, 6, 0.25)');
  terminator.addColorStop(1, 'rgba(7, 3, 6, 0.4)');
  g.fillStyle = terminator;
  g.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
  g.restore();
  g.beginPath();
  g.arc(x, y, r, -2.4, -1.1);
  g.lineWidth = 1.2;
  g.strokeStyle = 'rgba(255, 151, 76, 0.5)';
  g.stroke();
}

function cylinder(g: Ctx, x: number, y: number, w: number, h: number, light: string, dark: string, vertical: boolean): void {
  const shade = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
  shade.addColorStop(0, dark);
  shade.addColorStop(0.3, light);
  shade.addColorStop(1, dark);
  g.fillStyle = shade;
  g.beginPath();
  g.roundRect(x, y, w, h, Math.min(w, h) * 0.3);
  g.fill();
  g.strokeStyle = 'rgba(20, 18, 16, 0.6)';
  g.lineWidth = 1;
  g.stroke();
}

function rebelStation(g: Ctx, rng: Rng, color: string): void {
  const outline = [
    { x: VIEW.x, y: VIEW.y }, { x: -18, y: VIEW.y }, { x: 6, y: -25 }, { x: 84, y: -8 },
    { x: 112, y: 20 }, { x: 106, y: 42 }, { x: HULL_FACE, y: 64 },
    { x: HULL_FACE, y: 416 }, { x: 98, y: 439 }, { x: 98, y: 466 }, { x: 64, y: 489 },
    { x: -18, y: 500 }, { x: -28, y: VIEW.y + VIEW.h }, { x: VIEW.x, y: VIEW.y + VIEW.h },
  ];
  shadowCast(g, outline, 9);
  tracePolygon(g, outline);
  const hull = g.createLinearGradient(-80, 0, HULL_FACE, 0);
  hull.addColorStop(0, '#57574f');
  hull.addColorStop(0.6, '#a49e8b');
  hull.addColorStop(1, '#746d5d');
  g.fillStyle = hull;
  g.fill();
  g.save();
  g.clip();
  for (let y = -70; y < 570; y += 54) {
    for (let x = -140; x < 110; x += 47) {
      g.fillStyle = pick(rng, ['#888574', '#9a9683', '#a5a18e', '#777767']);
      g.fillRect(x + 2, y + 2, 43, 49);
      g.fillStyle = 'rgba(234, 227, 201, 0.3)';
      g.fillRect(x + 2, y + 2, 43, 1);
      g.fillStyle = '#4b4d43';
      g.fillRect(x + 5, y + 44, 16, 3);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = 'rgba(39, 39, 31, 0.2)';
        g.fillRect(x + between(rng, 3, 42), y + between(rng, 4, 44), between(rng, 1, 4), 0.8);
      }
    }
  }
  g.fillStyle = '#743b32';
  g.fillRect(-8, VIEW.y, 11, VIEW.h);
  g.fillRect(-25, 16, 127, 9);
  g.fillRect(-25, 450, 119, 9);
  g.fillStyle = '#343a35';
  g.fillRect(8, 51, 25, 382);
  for (const x of [12, 22]) {
    cylinder(g, x, 53, 6, 378, '#b7ab8d', '#4b483b', true);
    for (let y = 65; y < 425; y += 38) {
      g.fillStyle = '#4b4c40';
      g.fillRect(x - 2, y, 10, 4);
      g.fillStyle = '#b6ad93';
      g.fillRect(x - 2, y, 10, 1);
    }
  }
  for (let y = 126; y < 410; y += 90) {
    g.fillStyle = '#323b37';
    g.fillRect(37, y, 20, 23);
    for (let v = 3; v < 22; v += 4) {
      g.fillStyle = '#9b9580';
      g.fillRect(39, y + v, 16, 1.3);
    }
  }
  g.restore();
  tracePolygon(g, outline);
  g.strokeStyle = '#b3ac96';
  g.lineWidth = 1.2;
  g.stroke();
  for (const y of [20, 459]) {
    cylinder(g, -88, y - 13, 108, 26, '#b3ae99', '#4c4e43', false);
    for (let x = -78; x < 18; x += 16) strokeLine(g, [{ x, y: y - 12 }, { x, y: y + 12 }], 1.5, '#646252', false);
    for (let x = 46; x < 83; x += 8) {
      g.fillStyle = '#252e2d';
      g.fillRect(x, y - 7, 5, 12);
      g.fillStyle = '#c2d5cf';
      g.fillRect(x + 1, y - 6, 3, 1.2);
    }
  }
  mast(g, 48, 36, color);
  cylinder(g, -56, 62, 43, 357, '#8b8b77', '#3b443d', true);
  for (let y = 72; y < 410; y += 30) {
    strokeLine(g, [{ x: -56, y }, { x: -13, y }], 2, '#4d5449', false);
  }
}

function empireStation(g: Ctx, rng: Rng, color: string): void {
  const face = WORLD_WIDTH - HULL_FACE;
  const right = VIEW.x + VIEW.w;
  const outline = [
    { x: right, y: VIEW.y }, { x: face + 18, y: VIEW.y }, { x: face + 18, y: -14 },
    { x: face - 58, y: 12 }, { x: face - 80, y: 40 }, { x: face - 17, y: 63 },
    { x: face - 17, y: 417 }, { x: face - 80, y: 440 }, { x: face - 58, y: 468 },
    { x: face + 18, y: 494 }, { x: face + 18, y: VIEW.y + VIEW.h }, { x: right, y: VIEW.y + VIEW.h },
  ];
  shadowCast(g, outline, 12);
  tracePolygon(g, outline);
  const metal = g.createLinearGradient(face - 80, 0, right, 0);
  metal.addColorStop(0, '#677581');
  metal.addColorStop(0.35, '#3b4855');
  metal.addColorStop(1, '#202b37');
  g.fillStyle = metal;
  g.fill();
  g.save();
  g.clip();
  for (let y = VIEW.y; y < VIEW.y + VIEW.h; y += 36) {
    for (let x = face - 80; x < right; x += 38) {
      g.fillStyle = rng() < 0.5 ? 'rgba(166, 184, 199, 0.09)' : 'rgba(6, 13, 22, 0.15)';
      g.fillRect(x + 1, y + 1, 36, 34);
      g.strokeStyle = 'rgba(11, 20, 29, 0.45)';
      g.lineWidth = 0.8;
      g.strokeRect(x, y, 38, 36);
      g.fillStyle = 'rgba(164, 184, 200, 0.2)';
      g.fillRect(x + 4, y + 3, 24, 0.7);
    }
  }
  g.fillStyle = '#101923';
  g.fillRect(face + 34, VIEW.y, 18, VIEW.h);
  for (let y = VIEW.y + 5; y < VIEW.y + VIEW.h; y += 12) {
    g.fillStyle = '#3a4957';
    g.fillRect(face + 36, y, 14, 6);
    g.fillStyle = '#8a99a4';
    g.fillRect(face + 36, y, 14, 0.8);
  }
  for (const y of [26, 454]) {
    tracePolygon(g, [{ x: face - 57, y: y - 7 }, { x: face + 12, y: y - 16 },
      { x: face + 28, y: y }, { x: face + 12, y: y + 16 }, { x: face - 57, y: y + 7 }]);
    g.fillStyle = '#18232e';
    g.fill();
    strokeLine(g, [{ x: face - 49, y: y - 3 }, { x: face + 8, y: y - 11 }], 1.3, '#c0d0da', false);
    for (let x = face - 38; x < face + 12; x += 7) {
      g.fillStyle = '#596c7d';
      g.fillRect(x, y, 3, 6);
    }
    glow(g, face - 61, y, color, 1, 3);
  }
  g.restore();
  tracePolygon(g, outline);
  g.strokeStyle = '#8e9eac';
  g.lineWidth = 1.2;
  g.stroke();
  for (let y = 150; y < 400; y += 90) {
    tracePolygon(g, [{ x: face - 10, y: y - 7 }, { x: face + 28, y: y - 12 },
      { x: face + 28, y: y + 12 }, { x: face - 10, y: y + 7 }]);
    g.fillStyle = '#687783';
    g.fill();
    strokeLine(g, [{ x: face - 7, y: y - 5 }, { x: face + 24, y: y - 9 }], 1, '#aab6be', false);
    g.fillStyle = '#16212d';
    g.fillRect(face + 2, y - 2, 21, 4);
  }
}

function shadowCast(g: Ctx, points: readonly { x: number; y: number }[], height: number): void {
  tracePolygon(g, points.map((p) => ({ x: p.x + height * 0.6, y: p.y + height * 0.8 })));
  g.fillStyle = 'rgba(6, 8, 12, 0.45)';
  g.fill();
}

function mast(g: Ctx, x: number, y: number, color: string): void {
  tracePolygon(g, [{ x: x - 4, y: y - 4 }, { x: x + 4, y: y - 4 }, { x: x + 22, y: y + 20 }, { x: x + 14, y: y + 20 }]);
  g.fillStyle = 'rgba(6, 8, 12, 0.45)';
  g.fill();
  g.fillStyle = '#6c757e';
  g.fillRect(x - 5, y - 5, 10, 10);
  g.strokeStyle = '#b5bec6';
  g.lineWidth = 0.8;
  g.strokeRect(x - 5, y - 5, 10, 10);
  g.beginPath();
  g.ellipse(x - 14, y + 10, 9, 6, -0.5, 0, Math.PI * 2);
  g.fillStyle = '#a6afb7';
  g.fill();
  strokeLine(g, [{ x: x - 14, y: y + 10 }, { x: x - 19, y: y + 6 }], 1, '#565f68', false);
  glow(g, x, y, color, 1.2);
}

function deckSlab(g: Ctx, side: Side, color: string, pads: readonly HelipadZone[]): void {
  g.fillStyle = side === 1 ? '#3c4039' : '#111a24';
  band(g, side, HULL_FACE - 2, HULL_FACE + 18, DECK_TOP, DECK_BOTTOM - DECK_TOP);
  if (side === -1) {
    tracePolygon(g, [
      { x: sx(side, HULL_FACE - 2), y: DECK_TOP - 8 }, { x: sx(side, DECK_EDGE - 18), y: DECK_TOP - 8 },
      { x: sx(side, DECK_EDGE), y: DECK_TOP + 10 }, { x: sx(side, DECK_EDGE), y: DECK_BOTTOM - 10 },
      { x: sx(side, DECK_EDGE - 18), y: DECK_BOTTOM + 8 }, { x: sx(side, HULL_FACE - 2), y: DECK_BOTTOM + 8 },
    ]);
    g.fillStyle = '#394652';
    g.fill();
    g.strokeStyle = '#8999a7';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = '#18232e';
    band(g, side, DECK_EDGE - 8, DECK_EDGE - 3, DECK_TOP + 16, DECK_BOTTOM - DECK_TOP - 32);
    for (let y = DECK_TOP + 20; y < DECK_BOTTOM - 16; y += 19) {
      g.fillStyle = '#cadce6';
      band(g, side, DECK_EDGE - 6, DECK_EDGE - 4.5, y, 8);
    }
  }
  for (const pad of pads) {
    const y = pad.center.y;
    const end = side === 1 ? DECK_EDGE : DECK_EDGE - 13;
    const outline = [
      { x: sx(side, HULL_FACE - 1), y: y - 38 }, { x: sx(side, end - 12), y: y - 38 },
      { x: sx(side, end), y: y - 26 }, { x: sx(side, end), y: y + 26 },
      { x: sx(side, end - 12), y: y + 38 }, { x: sx(side, HULL_FACE - 1), y: y + 38 },
    ];
    shadowCast(g, outline, side === 1 ? 6 : 3);
    tracePolygon(g, outline);
    const floor = g.createLinearGradient(sx(side, HULL_FACE), 0, sx(side, end), 0);
    floor.addColorStop(0, side === 1 ? '#3b4039' : '#080f17');
    floor.addColorStop(1, side === 1 ? '#777563' : '#344554');
    g.fillStyle = floor;
    g.fill();
    g.strokeStyle = side === 1 ? '#a49d84' : '#667d8e';
    g.lineWidth = side === 1 ? 2 : 1;
    g.stroke();
    for (const offset of [-1, 1]) {
      strokeLine(g, [
        { x: sx(side, HULL_FACE + 3), y: y + offset * 33 },
        { x: sx(side, end - 15), y: y + offset * 33 },
        { x: sx(side, end - 5), y: y + offset * 23 },
      ], side === 1 ? 2 : 1.5, side === 1 ? '#b4a37c' : '#b8d1df', false);
      g.fillStyle = side === 1 ? '#342f25' : '#101923';
      band(g, side, HULL_FACE + 7, HULL_FACE + 22, y + offset * 29 - 2, 4);
    }
    if (side === 1) {
      for (let v = -20; v <= 20; v += 8) {
        strokeLine(g, [{ x: end - 5, y: y + v }, { x: end - 2, y: y + v + 3 }], 2, '#d0b267', false);
      }
      g.fillStyle = '#874d3c';
      g.fillRect(HULL_FACE + 7, y - 35, 20, 4);
    }
    for (const offset of [-1, 1]) glow(g, sx(side, end - 1), y + offset * 24, color, 0.7, 2.5);
  }
}

function bay(g: Ctx, side: Side, pad: HelipadZone, color: string): void {
  const y = pad.center.y;
  const back = HULL_FACE - DOOR_DEPTH - 2;
  tracePolygon(g, [
    { x: sx(side, HULL_FACE + 9), y: y - DOOR_HALF - 9 },
    { x: sx(side, back + 5), y: y - DOOR_HALF - 9 },
    { x: sx(side, back - 3), y: y - DOOR_HALF - 1 },
    { x: sx(side, back - 3), y: y + DOOR_HALF + 1 },
    { x: sx(side, back + 5), y: y + DOOR_HALF + 9 },
    { x: sx(side, HULL_FACE + 9), y: y + DOOR_HALF + 9 },
  ]);
  g.fillStyle = side === 1 ? '#b5ab90' : '#798c9c';
  g.fill();
  g.strokeStyle = side === 1 ? '#383c33' : '#152431';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#050a10';
  band(g, side, back + 2, HULL_FACE + 10, y - DOOR_HALF - 2, DOOR_HALF * 2 + 4);
  for (const offset of [-1, 1]) {
    tracePolygon(g, [
      { x: sx(side, back + 2), y: y + offset * (DOOR_HALF + 2) },
      { x: sx(side, HULL_FACE + 10), y: y + offset * (DOOR_HALF + 2) },
      { x: sx(side, back + 2), y: y + offset * (DOOR_HALF - 7) },
    ]);
    g.fillStyle = side === 1 ? '#3d4034' : '#283c4c';
    g.fill();
    strokeLine(g, [
      { x: sx(side, back + 5), y: y + offset * (DOOR_HALF - 6) },
      { x: sx(side, HULL_FACE + 8), y: y + offset * (DOOR_HALF + 1) },
    ], 0.6, side === 1 ? '#b5a87f' : '#7cabbf', false);
  }
  g.fillStyle = side === 1 ? '#141c18' : '#0d1923';
  band(g, side, back + 3, back + 6, y - DOOR_HALF + 8, DOOR_HALF * 2 - 16);
  g.fillStyle = color;
  g.globalAlpha = 0.4;
  band(g, side, HULL_FACE + 7, HULL_FACE + 8, y - DOOR_HALF, DOOR_HALF * 2);
  g.globalAlpha = 1;
  const spill = g.createLinearGradient(sx(side, HULL_FACE), 0, pad.center.x, 0);
  spill.addColorStop(0, color);
  spill.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = spill;
  g.globalAlpha = 0.12;
  tracePolygon(g, [
    { x: sx(side, HULL_FACE), y: y - DOOR_HALF }, { x: pad.center.x, y: y - DOOR_HALF - 6 },
    { x: pad.center.x, y: y + DOOR_HALF + 6 }, { x: sx(side, HULL_FACE), y: y + DOOR_HALF },
  ]);
  g.fill();
  g.globalAlpha = 1;
  for (const offset of [-1, 1]) {
    g.fillStyle = side === 1 ? '#e2c688' : '#d6eaf3';
    band(g, side, back + 8, HULL_FACE + 5, y + offset * (DOOR_HALF + 5) - 0.8, 1.6);
  }
  g.setLineDash([3, 4]);
  strokeLine(g, [{ x: sx(side, HULL_FACE + 8), y }, { x: pad.center.x - side * padHalf(pad), y }], 1, '#b1b9b0', false);
  g.setLineDash([]);
}

function plate(g: Ctx, side: Side, pad: HelipadZone, color: string): void {
  const { x, y } = pad.center;
  const half = padHalf(pad);
  tracePolygon(g, Array.from({ length: 8 }, (_, i) => {
    const angle = Math.PI / 8 + i * Math.PI / 4;
    return { x: x + Math.cos(angle) * (half + 4), y: y + Math.sin(angle) * (half + 4) };
  }));
  const surface = g.createLinearGradient(x - half, y - half, x + half, y + half);
  surface.addColorStop(0, side === 1 ? '#777767' : '#3f5565');
  surface.addColorStop(1, side === 1 ? '#4c5046' : '#1d2b38');
  g.fillStyle = surface;
  g.fill();
  g.strokeStyle = side === 1 ? '#a49c82' : '#8a9da9';
  g.lineWidth = 1;
  g.stroke();
  for (const offset of [-1, 1]) {
    g.fillStyle = 'rgba(12, 20, 24, 0.45)';
    g.fillRect(x - half * 0.65, y + offset * half * 0.63, half * 1.3, 0.8);
    for (const dx of [-1, 1]) {
      disc(g, x + dx * (half - 5), y + offset * (half - 5), 1, '#202a2c');
    }
    glow(g, x, y + offset * (half + 4), color, 0.8, 2.1);
  }
}

function bayNumber(g: Ctx, side: Side, pad: HelipadZone, label: string): void {
  g.font = '700 7px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(226, 220, 200, 0.5)';
  g.fillText(label, sx(side, DECK_EDGE - 16), pad.center.y - padHalf(pad) - 4);
}

function station(g: Ctx, world: Scene['world'], rng: Rng, side: Side, pads: readonly HelipadZone[]): void {
  const color = pads[0] === undefined ? '#d9d9d9' : zoneColor(world, pads[0]);
  if (side === 1) rebelStation(g, rng, color);
  else empireStation(g, rng, color);
  deckSlab(g, side, color, pads);
  const prefix = side === 1 ? 'R' : 'E';
  pads.forEach((pad, i) => {
    bay(g, side, pad, color);
    plate(g, side, pad, color);
    bayNumber(g, side, pad, `${prefix}${i + 1}`);
  });
}

export function hangarBay(g: Ctx, { world, rng }: Scene): void {
  space(g, rng);
  battleStation(g, rng);
  distantCruiser(g);
  planet(g, rng);
  const sorted = [...world.helipads].sort((a, b) => a.center.y - b.center.y);
  station(g, world, rng, 1, sorted.filter((p) => p.center.x < WORLD_WIDTH / 2));
  station(g, world, rng, -1, sorted.filter((p) => p.center.x >= WORLD_WIDTH / 2));
}
