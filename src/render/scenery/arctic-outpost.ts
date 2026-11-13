import { ARCTIC_ICEBREAKER } from '../../config/maps';
import { place, type Frame, type Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import {
  between,
  building,
  disc,
  fillView,
  helipad,
  patches,
  polylineDistance,
  runway,
  scaled,
  scatter,
  shadowed,
  smoothPath,
  smoothPoints,
  strokeLine,
  wobblyBlob,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
import {
  along,
  helipadIn,
  hullShape,
  inRect,
  insidePolygon,
  rectClear,
  swells,
  tracePolygon,
  type Rect,
} from './shared';

const AO_EDGE: Point[] = [
  { x: 470, y: 600 },
  { x: 520, y: 520 },
  { x: 560, y: 470 },
  { x: 600, y: 400 },
  { x: 690, y: 320 },
  { x: 790, y: 310 },
  { x: 900, y: 285 },
  { x: 1030, y: 250 },
];
const AO_WATER: Point[] = [...AO_EDGE, { x: 1030, y: 600 }];
const AO_HULL: Point[] = [
  { x: 64, y: 0 },
  { x: 52, y: -14 },
  { x: 30, y: -20 },
  { x: -50, y: -20 },
  { x: -58, y: -16 },
  { x: -60, y: 0 },
  { x: -58, y: 16 },
  { x: -50, y: 20 },
  { x: 30, y: 20 },
  { x: 52, y: 14 },
];
const AO_HUTS: Rect[] = [
  { x: 408, y: 248, w: 34, h: 16 },
  { x: 428, y: 320, w: 26, h: 14 },
  { x: 500, y: 256, w: 30, h: 14 },
  { x: 504, y: 292, w: 18, h: 22 },
  { x: 534, y: 322, w: 24, h: 12 },
];
const AO_HUT_ROOFS = ['#d8452f', '#e8862b', '#c9ccd1', '#2f6fb5', '#d8452f'];
const AO_DRUMS: Point = { x: 544, y: 286 };
const AO_MAST: Point = { x: 452, y: 232 };
const AO_SNOWCATS: Rect[] = [
  { x: 470, y: 322, w: 9, h: 6 },
  { x: 484, y: 326, w: 9, h: 6 },
];
const AO_TRACKS: Point[][] = [
  [{ x: 425, y: 264 }, { x: 425, y: 276 }, { x: 454, y: 276 }],
  [{ x: 490, y: 280 }, { x: 494, y: 318 }, { x: 546, y: 318 }, { x: 546, y: 322 }],
  [{ x: 494, y: 318 }, { x: 442, y: 318 }, { x: 442, y: 320 }],
  [{ x: 513, y: 300 }, { x: 494, y: 300 }],
  [{ x: 544, y: 286 }, { x: 536, y: 286 }, { x: 530, y: 252 }],
  [
    { x: 414, y: 300 },
    { x: 432, y: 290 },
    { x: 452, y: 292 },
  ],
  [
    { x: 490, y: 280 },
    { x: 530, y: 252 },
    { x: 576, y: 236 },
    { x: 606, y: 226 },
  ],
  [
    { x: 440, y: 256 },
    { x: 400, y: 190 },
    { x: 320, y: 120 },
    { x: 200, y: 60 },
    { x: 40, y: 10 },
    { x: -170, y: -40 },
  ],
];
const BLUE_ICE: RunwayStyle = {
  surface: '#a9d0e5',
  shoulder: '#d3e3ee',
  edge: 'rgba(36, 78, 116, 0.75)',
  center: 'rgba(36, 78, 116, 0.75)',
};
const SKIWAY: RunwayStyle = {
  surface: '#fbfdff',
  shoulder: '#d3e3ee',
  edge: '#e8454f',
  center: '#e8454f',
  markers: true,
};
const SNOW = '#edf2f6';
const SNOW_TONES = ['#e3ebf2', '#f6f9fb'];
const DRIFT_BLUE = '#cfdeea';
const ARCTIC_SEA = '#1d5176';

function icebreaker(g: Ctx, f: Frame): void {
  hullShape(
    g,
    AO_HULL.map((p) => place(f, p.x, p.y)),
    12,
    '#b8423a',
    '#7a2a25',
  );
  g.fillStyle = '#cdd1d6';
  tracePolygon(g, AO_HULL.map((p) => place(f, p.x * 0.88, p.y * 0.78)));
  g.fill();
  const at = place(f, 8, 0);
  g.save();
  g.translate(at.x, at.y);
  g.rotate((f.angle * Math.PI) / 180);
  building(g, -14, -10, 30, 20, '#ecece7', 10);
  g.fillStyle = '#d8452f';
  g.fillRect(-10, -4, 8, 8);
  g.fillStyle = '#2b2b2b';
  g.fillRect(-8.5, -2.5, 5, 5);
  g.restore();
}

function iceFloe(g: Ctx, rng: Rng, p: Point, r: number): void {
  const blob = wobblyBlob(rng, p, r, r * between(rng, 0.6, 1), 0.25, 10);
  smoothPath(g, scaled(blob, p, 1.25), true);
  g.fillStyle = '#3f7fa3';
  g.fill();
  smoothPath(g, blob, true);
  g.fillStyle = '#eef5f9';
  g.fill();
}

function iceberg(g: Ctx, rng: Rng, p: Point, r: number): void {
  const blob = wobblyBlob(rng, p, r, r * between(rng, 0.7, 1), 0.3, 9);
  disc(g, p.x, p.y, r * 1.25, '#3f7fa3');
  shadowed(g, r * 0.8, 0.26, () => tracePolygon(g, blob));
  g.fillStyle = '#f7fbfd';
  tracePolygon(g, blob);
  g.fill();
  g.fillStyle = '#c3d8e6';
  g.beginPath();
  g.moveTo(p.x, p.y);
  for (const q of blob.slice(0, Math.ceil(blob.length / 2))) g.lineTo(q.x, q.y);
  g.closePath();
  g.fill();
}

function sastrugi(g: Ctx, rng: Rng, ok: (p: Point) => boolean): void {
  const angle = -0.35;
  g.lineCap = 'round';
  g.strokeStyle = DRIFT_BLUE;
  for (const p of scatter(rng, 60, ok)) {
    const len = between(rng, 14, 40);
    g.lineWidth = between(rng, 2, 4);
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
    g.stroke();
  }
}

export function arcticOutpost(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const ship = ARCTIC_ICEBREAKER;
  const hull = AO_HULL.map((p) => place(ship, p.x, p.y));
  const inWater = (p: Point): boolean => insidePolygon(p, AO_WATER);
  const onIce = (p: Point): boolean => !inWater(p) && polylineDistance(p, AO_EDGE) > 16;
  const offStation = (p: Point): boolean =>
    AO_HUTS.every((h) => !inRect(p, h, 10)) &&
    Math.hypot(p.x - AO_DRUMS.x, p.y - AO_DRUMS.y) > 16 &&
    AO_TRACKS.every((t) => polylineDistance(p, t) > 8);

  fillView(g, SNOW);
  patches(g, rng, SNOW_TONES, 16, [90, 220]);
  sastrugi(g, rng, (p) => onIce(p) && offStation(p) && zoneClear(world, p, 14));

  for (const k of [0.7, 1.5]) {
    const ridge = AO_EDGE.map((p) => ({ x: p.x - 38 * k + between(rng, -8, 8), y: p.y - 30 * k + between(rng, -6, 6) }));
    strokeLine(g, ridge, 3, DRIFT_BLUE);
  }
  g.fillStyle = '#e0e9ee';
  g.beginPath();
  g.roundRect(402, 244, 162, 96, 16);
  g.fill();
  for (const track of AO_TRACKS) {
    strokeLine(g, track, 6, '#c5d5df');
    strokeLine(g, track, 3, '#e5edf2');
    along(smoothPoints(track), 38, (p, n) => disc(g, p.x + n.x * 5, p.y + n.y * 5, 1.2, '#e8454f'));
  }

  smoothPath(g, AO_WATER, true);
  g.fillStyle = ARCTIC_SEA;
  g.fill();
  patches(g, rng, ['#215a82', '#19486b'], 8, [70, 150], (p) => inWater(p) && polylineDistance(p, AO_EDGE) > 80);
  swells(g, rng, 18, (p) => inWater(p) && polylineDistance(p, AO_EDGE) > 50 && !insidePolygon(p, hull), 'rgba(255, 255, 255, 0.12)');
  strokeLine(g, AO_EDGE, 18, '#8ec3dd');
  strokeLine(g, AO_EDGE, 6, '#ffffff');

  for (const p of scatter(rng, 40, (q) => inWater(q) && polylineDistance(q, AO_EDGE) < 70 && !insidePolygon(q, hull))) {
    iceFloe(g, rng, p, between(rng, 4, 13));
  }
  for (let i = 0; i < 26; i++) {
    const p = place(ship, -70 - i * 4 + between(rng, -4, 4), between(rng, -14, 14));
    if (inWater(p)) iceFloe(g, rng, p, between(rng, 2, 4));
  }
  const bergOk = (p: Point): boolean =>
    inWater(p) && polylineDistance(p, AO_EDGE) > 60 && hull.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 40);
  for (const p of scatter(rng, 7, bergOk)) iceberg(g, rng, p, between(rng, 10, 22));

  icebreaker(g, ship);
  helipadIn(g, ship, world.helipads[1]!, '#535960');

  runway(g, world.runways[0]!, BLUE_ICE);
  runway(g, world.runways[1]!, SKIWAY);
  helipad(g, world.helipads[0]!, '#a3aeb8');

  AO_HUTS.forEach((h, i) => {
    if (!rectClear(world, h)) return;
    g.fillStyle = '#c1cfd8';
    g.fillRect(h.x - 2, h.y - 2, h.w + 4, h.h + 4);
    building(g, h.x, h.y, h.w, h.h, AO_HUT_ROOFS[i % AO_HUT_ROOFS.length]!, 7);
    g.fillStyle = 'rgba(245, 249, 251, 0.7)';
    g.fillRect(h.x + 1, h.y + 1, h.w - 2, 2);
  });
  for (let i = 0; i < 9; i++) {
    const x = AO_DRUMS.x + (i % 3) * 5;
    const y = AO_DRUMS.y + Math.floor(i / 3) * 5;
    g.fillStyle = i % 4 === 0 ? '#2f6fb5' : '#d8452f';
    g.beginPath();
    g.arc(x, y, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  for (const c of AO_SNOWCATS) building(g, c.x, c.y, c.w, c.h, '#f09a1e', 3);
  g.strokeStyle = 'rgba(60, 70, 80, 0.5)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (const [dx, dy] of [[-14, 8], [14, 8], [0, -16]] as const) {
    g.moveTo(AO_MAST.x, AO_MAST.y);
    g.lineTo(AO_MAST.x + dx, AO_MAST.y + dy);
  }
  g.stroke();
  shadowed(g, 20, 0.22, () => {
    g.beginPath();
    g.arc(AO_MAST.x, AO_MAST.y, 2.5, 0, Math.PI * 2);
  });
  disc(g, AO_MAST.x, AO_MAST.y, 2.5, '#d8452f');
}
