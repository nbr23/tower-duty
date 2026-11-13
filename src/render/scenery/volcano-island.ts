import type { Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import {
  between,
  building,
  disc,
  fillView,
  helipad,
  padHalf,
  patches,
  polylineDistance,
  runway,
  scaled,
  scatter,
  smoothPath,
  strokeLine,
  wobblyBlob,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
import { SWELL, inRect, insidePolygon, jetty, palm, sailboat, swells, treeClumps, type Rect } from './shared';

const VI_COAST: Point[] = [
  { x: 330, y: 170 },
  { x: 365, y: 120 },
  { x: 440, y: 72 },
  { x: 530, y: 38 },
  { x: 620, y: 58 },
  { x: 700, y: 70 },
  { x: 770, y: 120 },
  { x: 786, y: 196 },
  { x: 815, y: 260 },
  { x: 790, y: 330 },
  { x: 730, y: 375 },
  { x: 640, y: 408 },
  { x: 540, y: 398 },
  { x: 440, y: 385 },
  { x: 370, y: 350 },
  { x: 338, y: 280 },
  { x: 312, y: 230 },
];
const VI_CENTER: Point = { x: 560, y: 228 };
const VI_INNER: Point[] = VI_COAST.map((p) => ({
  x: VI_CENTER.x + (p.x - VI_CENTER.x) * 0.9,
  y: VI_CENTER.y + (p.y - VI_CENTER.y) * 0.88,
}));
const VI_CONE = { x: 600, y: 200, r: 85 };
const VI_CRATER = 22;
const VI_JETTY = { from: { x: 322, y: 300 }, to: { x: 272, y: 318 } };
const VI_VILLAGE: Rect = { x: 588, y: 296, w: 88, h: 62 };
const VI_TRACKS: Point[][] = [
  [{ x: 386, y: 318 }, { x: 396, y: 374 }, { x: 584, y: 374 }, { x: 604, y: 340 }],
  [{ x: 604, y: 340 }, { x: 604, y: 300 }, { x: 670, y: 300 }],
  [
    { x: 324, y: 300 },
    { x: 352, y: 306 },
    { x: 386, y: 318 },
    { x: 414, y: 326 },
  ],
  [
    { x: 574, y: 344 },
    { x: 604, y: 340 },
    { x: 644, y: 334 },
    { x: 682, y: 336 },
  ],
  [
    { x: 452, y: 318 },
    { x: 440, y: 262 },
    { x: 408, y: 204 },
    { x: 416, y: 154 },
    { x: 428, y: 138 },
  ],
];
const VI_EARTH = '#b9a878';
const VI_BOATS: readonly [x: number, y: number, angle: number, size: number][] = [
  [140, 200, -0.4, 6],
  [60, 120, 0.3, 5],
  [860, 420, 2.8, 6],
  [880, 120, 2.2, 5],
  [470, 460, 0.1, 5],
];
const JUNGLE = ['#3a7436', '#42803a', '#356a32', '#4a8a40'];
const GRASS_STRIP: RunwayStyle = {
  surface: '#93b662',
  shoulder: '#6c9a4a',
  edge: 'rgba(244, 242, 236, 0.9)',
  center: 'rgba(244, 242, 236, 0.9)',
  markers: true,
};
const WATER_LANE: RunwayStyle = {
  surface: 'rgba(255, 255, 255, 0.07)',
  edge: '#ff8a2a',
  center: '#ff8a2a',
  markers: true,
};

function onCone(p: Point, grow = 1): boolean {
  return Math.hypot(p.x - VI_CONE.x, p.y - VI_CONE.y) < VI_CONE.r * grow;
}

const VI_SLOPES: readonly (readonly [number, string])[] = [
  [1, '#5f8244'],
  [0.84, '#6f6a48'],
  [0.66, '#665341'],
  [0.48, '#574438'],
];

function volcanoCone(g: Ctx, rng: Rng): void {
  const { x, y, r } = VI_CONE;
  const outline = wobblyBlob(rng, VI_CONE, r * 1.12, r, 0.22, 18);
  for (const [k, color] of VI_SLOPES) {
    smoothPath(g, scaled(outline, { x: x - 14, y: y - 12 }, k), true);
    g.fillStyle = color;
    g.fill();
  }
  disc(g, x, y, VI_CRATER, '#2f2420');
  disc(g, x, y, VI_CRATER * 0.74, '#c8421a');
  disc(g, x, y, VI_CRATER * 0.5, '#ff7426');
  disc(g, x, y, VI_CRATER * 0.26, '#ffd257');
}

function steam(g: Ctx, p: Point, r: number, alpha: number): void {
  disc(g, p.x, p.y, r, `rgba(244, 242, 236, ${alpha})`);
}

export function volcanoIsland(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const onIsland = (p: Point): boolean => insidePolygon(p, VI_COAST);
  const inland = (p: Point): boolean => insidePolygon(p, VI_INNER);

  fillView(g, '#1d76a4');
  patches(g, rng, ['#227ead', '#196b98'], 14, [120, 240], (p) => !onIsland(p));
  swells(g, rng, 44, (p) => !onIsland(p) && polylineDistance(p, VI_COAST) > 60, SWELL);

  for (const [k, color] of [
    [1.16, '#2f95b6'],
    [1.09, '#5cb9c6'],
    [1.03, '#f0e2b8'],
    [1, '#e6d4a0'],
  ] as const) {
    smoothPath(g, scaled(VI_COAST, VI_CENTER, k), true);
    g.fillStyle = color;
    g.fill();
  }
  smoothPath(g, VI_INNER, true);
  g.fillStyle = '#4f8240';
  g.fill();

  strokeLine(g, [world.runways[1]!.start, world.runways[1]!.end], 40, '#7fa955', false);
  for (const h of world.helipads) disc(g, h.center.x, h.center.y, padHalf(h) + 12, '#7fa955');
  for (const track of VI_TRACKS) strokeLine(g, track, 4, VI_EARTH);
  volcanoCone(g, rng);

  jetty(g, VI_JETTY.from, VI_JETTY.to);
  for (const [x, y, angle, size] of VI_BOATS) sailboat(g, x, y, angle, size);

  runway(g, world.runways[0]!, WATER_LANE);
  runway(g, world.runways[1]!, GRASS_STRIP);
  for (const h of world.helipads) helipad(g, h, '#aba092');

  const offTracks = (p: Point, margin: number): boolean => VI_TRACKS.every((t) => polylineDistance(p, t) > margin);
  const ground = (p: Point, margin: number): boolean => zoneClear(world, p, margin) && offTracks(p, margin * 0.6);
  for (const x of [624, 650, 676]) {
    const y = 316;
    g.fillStyle = '#9c9f6a';
    g.fillRect(x - 11, y - 11, 22, 27);
    strokeLine(g, [{ x, y: 300 }, { x, y: 312 }], 2.5, VI_EARTH, false);
    building(g, x - 7, y - 5, 14, 10, '#a8875a', 4);
    g.fillStyle = '#c3ad7a';
    g.fillRect(x - 6, y + 6, 12, 3);
  }
  g.fillStyle = '#b5a57c';
  g.fillRect(337, 299, 25, 16);
  building(g, 341, 300, 17, 9, '#8d7d64', 4);

  treeClumps(g, scene, 46, JUNGLE, [4, 8], (q) => inland(q) && !onCone(q, 0.72) && offTracks(q, 9) && !inRect(q, VI_VILLAGE, 4));
  const beach = (q: Point): boolean => onIsland(q) && !inland(q) && ground(q, 10) && polylineDistance(q, VI_COAST) > 6;
  for (const q of scatter(rng, 40, beach)) palm(g, rng, q.x, q.y, between(rng, 4, 7));

  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    steam(g, { x: VI_CONE.x + 8 + t * 100, y: VI_CONE.y - 12 - t * 64 }, 9 + t * 16, 0.3 - t * 0.14);
  }
}
