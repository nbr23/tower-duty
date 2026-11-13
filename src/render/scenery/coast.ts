import { COAST_ASSAULT_SHIP, COAST_CARRIER } from '../../config/maps';
import type { Point } from '../../game/geometry';
import {
  between,
  building,
  disc,
  fillView,
  helipad,
  patches,
  polylineDistance,
  runway,
  scatter,
  smoothPath,
  strokeLine,
  zoneClear,
  type Ctx,
  type Scene,
} from '../art';
import { CARRIER_DECK, SUPPORT_DECK, deckSpot, deckEquipment, wake, bowWave, elevator, framed, hull, island, landingArea, stretch } from './ships';
import {
  DESERT_RUNWAY,
  DUNE_LIT,
  DUNE_SHADE,
  SAND,
  SAND_SCRUB,
  SAND_TONES,
  SWELL,
  crescents,
  inFrame,
  inRect,
  insidePolygon,
  jetty,
  palm,
  rectClear,
  road,
  sailboat,
  scrub,
  swells,
  tower,
  type Rect,
} from './shared';

const COAST: Point[] = [
  { x: 380, y: -110 },
  { x: 400, y: 0 },
  { x: 450, y: 90 },
  { x: 540, y: 205 },
  { x: 650, y: 262 },
  { x: 760, y: 286 },
  { x: 1020, y: 310 },
];
const LAND: Point[] = [...COAST, { x: 1020, y: -110 }];
const DECK = stretch(CARRIER_DECK, 0.82, 0.98);
const ANGLED_DECK = 1;
const CARRIER_PAD = 1;
const SHIP_PAD = 0;
const BASE_PAD = 2;
const APRON: Rect = { x: 714, y: 92, w: 92, h: 76 };
const LINKS: Point[][] = [
  [{ x: 640, y: 108 }, { x: 666, y: 96 }, { x: 714, y: 96 }],
  [
    { x: 730, y: 64 },
    { x: 746, y: 74 },
    { x: 750, y: 96 },
  ],
  [
    { x: 696, y: 118 },
    { x: 708, y: 112 },
    { x: 720, y: 112 },
  ],
];
const HANGARS: Rect[] = [
  { x: 716, y: 176, w: 40, h: 18 },
  { x: 762, y: 176, w: 38, h: 18 },
  { x: 596, y: 100, w: 44, h: 18 },
];
const TOWER: Point = { x: 700, y: 152 };
const TANKS: Point[] = [
  { x: 822, y: 150 },
  { x: 836, y: 150 },
  { x: 829, y: 162 },
];
const ROAD: Point[] = [
  { x: 806, y: 118 },
  { x: 860, y: 96 },
  { x: 930, y: 40 },
  { x: 1016, y: -40 },
];
const TRACK: Point[] = [
  { x: 720, y: 270 },
  { x: 742, y: 226 },
  { x: 810, y: 210 },
  { x: 850, y: 180 },
  { x: 850, y: 100 },
];
const PIER = { from: { x: 718, y: 272 }, to: { x: 704, y: 312 } };
const BOATS: readonly [x: number, y: number, angle: number, size: number][] = [
  [560, 380, 0.5, 6],
  [690, 420, -0.3, 5],
  [330, 60, 2.4, 5],
  [60, 300, 0.2, 6],
];
const CONCRETE = '#bdb198';

export function coast(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const carrier = framed(COAST_CARRIER, DECK);
  const ship = framed(COAST_ASSAULT_SHIP, SUPPORT_DECK);
  const onLand = (p: Point): boolean => insidePolygon(p, LAND);
  const offHulls = (p: Point): boolean =>
    [carrier, ship].every((h) => !insidePolygon(p, h) && !insidePolygon({ x: p.x - 8, y: p.y - 10 }, h));
  const openSea = (p: Point): boolean => !onLand(p) && polylineDistance(p, COAST) > 60 && offHulls(p);

  fillView(g, '#217fa9');
  patches(g, rng, ['#2482ab', '#207ba5'], 14, [120, 240], (p) => !onLand(p));
  swells(g, rng, 46, openSea, SWELL);
  strokeLine(g, COAST, 96, '#3597b9');
  strokeLine(g, COAST, 54, '#5db7c6');
  strokeLine(g, COAST, 26, '#a6dcd9');

  g.fillStyle = SAND;
  smoothPath(g, LAND, true);
  g.fill();
  strokeLine(g, COAST, 12, '#ecdcae');
  const dryLand = (p: Point): boolean => onLand(p) && polylineDistance(p, COAST) > 20;
  patches(g, rng, SAND_TONES, 8, [70, 160], (p) => onLand(p) && polylineDistance(p, COAST) > 90);
  const offBase = (p: Point, margin: number): boolean =>
    !inRect(p, APRON, margin) &&
    HANGARS.every((h) => !inRect(p, h, margin)) &&
    LINKS.every((route) => polylineDistance(p, route) > 9 + margin) &&
    polylineDistance(p, ROAD) > 5 + margin &&
    polylineDistance(p, TRACK) > 3 + margin &&
    TANKS.every((t) => Math.hypot(p.x - t.x, p.y - t.y) > 7 + margin) &&
    zoneClear(world, p, margin);
  crescents(g, rng, 12, (p) => dryLand(p) && polylineDistance(p, COAST) > 50 && offBase(p, 34), DUNE_LIT, DUNE_SHADE);

  strokeLine(g, TRACK, 4, '#cdb47c');
  jetty(g, PIER.from, PIER.to);
  road(g, ROAD, '#b3a586', 9);
  for (const route of [
    [{ x: 850, y: 180 }, { x: 810, y: 202 }, { x: 728, y: 202 }, { x: 728, y: 194 }],
    [{ x: 810, y: 202 }, { x: 782, y: 202 }, { x: 782, y: 194 }],
    [{ x: 850, y: 100 }, { x: 844, y: 155 }],
  ]) road(g, route, '#b3a586', 4);
  g.fillStyle = '#c8bfa8';
  g.fillRect(590, 94, 56, 32);
  g.fillRect(816, 140, 27, 30);
  g.fillStyle = CONCRETE;
  g.beginPath();
  g.roundRect(APRON.x, APRON.y, APRON.w, APRON.h, 4);
  g.fill();
  for (const route of LINKS) strokeLine(g, route, 16, CONCRETE, false);
  for (const route of LINKS.slice(1)) strokeLine(g, route, 0.8, '#c6b675', false);
  for (const r of world.runways.slice(2)) runway(g, r, DESERT_RUNWAY);
  helipad(g, world.helipads[BASE_PAD]!, '#a89f8b');
  for (const h of HANGARS) if (rectClear(world, h)) building(g, h.x, h.y, h.w, h.h, '#cdc8ba', 8);
  for (const t of TANKS) {
    disc(g, t.x + 2, t.y + 2.5, 5.5, 'rgba(17, 21, 26, 0.22)');
    disc(g, t.x, t.y, 5.5, '#e4e0d4');
    disc(g, t.x - 1.2, t.y - 1.2, 3, '#f4f1e8');
  }
  tower(g, TOWER, 5.5);
  const scrubOk = (p: Point): boolean => dryLand(p) && offBase(p, 14);
  for (const p of scatter(rng, 30, scrubOk)) palm(g, rng, p.x, p.y, between(rng, 4, 7));
  scrub(g, rng, 40, scrubOk, SAND_SCRUB);

  for (const [x, y, angle, size] of BOATS) sailboat(g, x, y, angle, size);

  wake(g, COAST_ASSAULT_SHIP, -112, 22, 400);
  bowWave(g, COAST_ASSAULT_SHIP, 116, 28);
  hull(g, ship, 14);
  inFrame(g, COAST_ASSAULT_SHIP, () => {
    g.fillStyle = 'rgba(244, 242, 236, 0.5)';
    for (let u = -14; u < 96; u += 14) g.fillRect(u, -9, 8, 1.4);
    elevator(g, { x: 52, y: 10, w: 24, h: 18 });
  });
  deckSpot(g, world.helipads[SHIP_PAD]!);
  inFrame(g, COAST_ASSAULT_SHIP, () => island(g, { x: -4, y: 12, w: 44, h: 14 }));

  wake(g, COAST_CARRIER, -222, 34, 600);
  bowWave(g, COAST_CARRIER, 223, 40);
  hull(g, carrier, 20);
  inFrame(g, COAST_CARRIER, () => {
    deckEquipment(g, -90, -52, 4);
    deckEquipment(g, 108, -26, 3);
    elevator(g, { x: -124, y: 24, w: 30, h: 18 });
    elevator(g, { x: 30, y: 37, w: 30, h: 18 });
    elevator(g, { x: 54, y: -66, w: 26, h: 18 });
  });
  world.runways.slice(0, 2).forEach((r, i) => landingArea(g, r, i === ANGLED_DECK));
  deckSpot(g, world.helipads[CARRIER_PAD]!);
  inFrame(g, COAST_CARRIER, () => island(g, { x: -54, y: 36, w: 60, h: 16 }));
}
