import type { Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import type { HelipadZone } from '../../game/world';
import {
  between,
  building,
  disc,
  fillView,
  glow,
  padHalf,
  patches,
  pick,
  polylineDistance,
  runway,
  scaled,
  scatter,
  smoothPath,
  smoothPoints,
  strokeLine,
  tree,
  wobblyBlob,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
import { along, crescents, inRect, insidePolygon, runwayStrip, swells, tower, type Rect } from './shared';

const FIRE_FRONT: Point[] = [
  { x: 640, y: -110 }, { x: 660, y: -20 }, { x: 700, y: 30 }, { x: 745, y: 62 },
  { x: 770, y: 110 }, { x: 815, y: 140 }, { x: 880, y: 150 }, { x: 1020, y: 170 },
];
const BURN: Point[] = [...FIRE_FRONT, { x: 1020, y: -110 }];
const LAKE: Point[] = [
  { x: 1100, y: 760 }, { x: 380, y: 760 }, { x: 410, y: 600 }, { x: 432, y: 480 },
  { x: 442, y: 420 }, { x: 456, y: 370 }, { x: 445, y: 320 }, { x: 455, y: 285 },
  { x: 500, y: 255 }, { x: 570, y: 262 }, { x: 650, y: 285 }, { x: 730, y: 300 },
  { x: 830, y: 292 }, { x: 1100, y: 270 },
];
const LAKE_CENTER: Point = { x: 740, y: 480 };
const LAKE_BANKS: readonly (readonly [number, string])[] = [
  [20, '#6d8a58'],
  [10, '#a9a682'],
];
const ROAD: Point[] = [
  { x: 196, y: 252 }, { x: 170, y: 190 }, { x: 96, y: 128 }, { x: 20, y: 96 }, { x: -170, y: 60 },
];
const APRON: Rect = { x: 168, y: 250, w: 84, h: 36 };
const BASE: Rect = { x: 160, y: 222, w: 112, h: 68 };
const HANGARS: readonly Rect[] = [
  { x: 172, y: 230, w: 30, h: 16 },
  { x: 208, y: 234, w: 20, h: 12 },
];
const TOWER: Point = { x: 242, y: 240 };
const TANKS: readonly Point[] = [{ x: 258, y: 262 }, { x: 258, y: 274 }];
const POND = 13;
const CLEARING_HALF = 44;
const FLOOR = ['rgba(104, 140, 84, 0.3)', 'rgba(52, 88, 54, 0.3)', 'rgba(128, 146, 88, 0.22)'];
const CONIFERS = ['#2f5a36', '#37653b', '#28502f', '#3f6f40'];
const SCORCHED = ['#6b5a3c', '#7a6240', '#5a4c38'];
const CHAR = '#3a332f';
const CHAR_TONES = ['#2e2826', '#463c36'];
const SNAG = '#1f1b1a';
const FLAMES = ['#ff7a1f', '#ffab2e', '#ffd257', '#f2481d'];
const CLEARING = '#8ea268';
const DIRT = '#b7a67e';
const WATER = '#4a8aa6';
const BUOY = '#ff8a2a';
const SMOKE_RGB = '96, 90, 86';
const WATER_LANE: RunwayStyle = {
  surface: 'rgba(255, 255, 255, 0.07)',
  edge: BUOY,
  center: BUOY,
  markers: true,
};

function dipPad(g: Ctx, rng: Rng, pad: HelipadZone): void {
  const { x, y } = pad.center;
  const r = padHalf(pad) + POND;
  const shore = wobblyBlob(rng, pad.center, r, r * 0.9, 0.08, 16);
  for (const [k, color] of [[1.12, '#a9a682'], [1, WATER]] as const) {
    smoothPath(g, scaled(shore, pad.center, k), true);
    g.fillStyle = color;
    g.fill();
  }
  g.strokeStyle = 'rgba(244, 242, 236, 0.85)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, y, pad.radius + 1, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    glow(g, x + Math.cos(a) * (pad.radius + 6), y + Math.sin(a) * (pad.radius + 6), BUOY, 1.2);
  }
}

function tankerBase(g: Ctx): void {
  g.fillStyle = '#8f9297';
  g.fillRect(APRON.x, APRON.y, APRON.w, APRON.h);
  for (const [i, h] of HANGARS.entries()) building(g, h.x, h.y, h.w, h.h, i === 0 ? '#b4b9bf' : '#a8875a', 8 - i * 3);
  tower(g, TOWER, 5);
  for (const t of TANKS) {
    disc(g, t.x + 1.5, t.y + 2, 5, 'rgba(17, 21, 26, 0.25)');
    disc(g, t.x, t.y, 5, '#c9482f');
    disc(g, t.x - 1, t.y - 1, 2.6, '#de6a4c');
  }
}

function smokeColumn(g: Ctx, from: Point, heading: number): void {
  const a = (heading * Math.PI) / 180;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const d = t * 170;
    disc(g, from.x + Math.cos(a) * d, from.y + Math.sin(a) * d, 18 + t * 46, `rgba(${SMOKE_RGB}, ${0.5 - t * 0.42})`);
  }
}

export function fireSeason(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const base = world.runways[0]!;
  const lane = world.runways[1]!;
  const front = smoothPoints(FIRE_FRONT);
  const burnt = (p: Point): boolean => insidePolygon(p, BURN);
  const forest = (p: Point, margin: number): boolean =>
    zoneClear(world, p, margin) &&
    !burnt(p) &&
    !insidePolygon(p, LAKE) &&
    polylineDistance(p, LAKE) > 12 + margin &&
    polylineDistance(p, [base.start, base.end]) > CLEARING_HALF + margin &&
    polylineDistance(p, ROAD) > 4 + margin &&
    !inRect(p, BASE, margin + 2) &&
    world.helipads.every((h) => Math.hypot(p.x - h.center.x, p.y - h.center.y) > padHalf(h) + POND + 6 + margin);

  fillView(g, '#4d7445');
  patches(g, rng, FLOOR, 70, [40, 130]);
  crescents(g, rng, 16, (p) => !burnt(p), 'rgba(196, 214, 142, 0.14)', 'rgba(16, 36, 22, 0.16)');

  strokeLine(g, FIRE_FRONT, 46, 'rgba(104, 84, 52, 0.55)');
  smoothPath(g, BURN, true);
  g.fillStyle = CHAR;
  g.fill();
  patches(g, rng, CHAR_TONES, 18, [20, 60], burnt);

  strokeLine(g, ROAD, 8, 'rgba(40, 62, 40, 0.4)');
  strokeLine(g, ROAD, 5, DIRT);

  for (const [width, color] of LAKE_BANKS) strokeLine(g, LAKE, width, color);
  for (const [k, color] of [[1, WATER], [0.84, '#3f7c99']] as const) {
    smoothPath(g, scaled(LAKE, LAKE_CENTER, k), true);
    g.fillStyle = color;
    g.fill();
  }
  swells(g, rng, 70, (p) => insidePolygon(p, scaled(LAKE, LAKE_CENTER, 0.9)), 'rgba(255, 255, 255, 0.14)');
  for (const pad of world.helipads) dipPad(g, rng, pad);

  strokeLine(g, [base.start, base.end], CLEARING_HALF * 2, CLEARING, false);
  g.fillStyle = CLEARING;
  g.beginPath();
  g.roundRect(BASE.x, BASE.y, BASE.w, BASE.h, 12);
  g.fill();
  runwayStrip(g, base, 22, 18);
  tankerBase(g);
  runway(g, base);
  runway(g, lane, WATER_LANE);

  for (const center of scatter(rng, 520, (p) => forest(p, 6))) {
    const scorched = polylineDistance(center, front) < 46;
    for (let i = 0; i < 9; i++) {
      const p = { x: center.x + between(rng, -24, 24), y: center.y + between(rng, -18, 18) };
      const r = between(rng, 3, 6.5);
      if (forest(p, r + 2)) tree(g, rng, p.x, p.y, r, scorched ? SCORCHED : CONIFERS);
    }
  }
  for (const p of scatter(rng, 260, burnt)) {
    strokeLine(g, [p, { x: p.x + 2.4, y: p.y + 3.2 }], 0.8, 'rgba(17, 21, 26, 0.3)', false);
    disc(g, p.x, p.y, between(rng, 0.8, 1.6), SNAG);
  }

  along(front, 6, (p, normal) => {
    if (rng() > 0.8) return;
    const drift = between(rng, -7, 3);
    glow(g, p.x + normal.x * drift, p.y + normal.y * drift, pick(rng, FLAMES), between(rng, 1.1, 2.6));
  });
  for (const p of scatter(rng, 36, (q) => burnt(q) && polylineDistance(q, front) < 70)) glow(g, p.x, p.y, pick(rng, FLAMES), between(rng, 0.6, 1.3));

  const { plume } = world.map;
  if (plume === undefined) return;
  smokeColumn(g, plume, plume.heading);
  const haze = g.createRadialGradient(plume.x, plume.y, 40, plume.x, plume.y, 560);
  haze.addColorStop(0, 'rgba(150, 118, 86, 0.3)');
  haze.addColorStop(0.55, 'rgba(150, 124, 96, 0.12)');
  haze.addColorStop(1, 'rgba(150, 124, 96, 0)');
  fillView(g, haze);
}
