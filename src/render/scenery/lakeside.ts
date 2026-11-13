import { LAKESIDE_APRON, LAKESIDE_SITE } from '../../config/maps';
import { locate, place, type Point } from '../../game/geometry';
import { building, fillView, strokeLine, runway, shadowed, taxiway, taxiMarkings, type Ctx, type Scene } from '../art';
import {
  clearOfEstate,
  hamlet,
  hedgerowTrees,
  layoutLand,
  paintEstate,
  paintFields,
  paintRoads,
  roadDistance,
  woodlots,
  type Span,
  type Vertex,
} from './land';
import {
  AIRFIELD_GRASS,
  BOUNDARY_HEDGE,
  FENCE,
  FIELD_EDGE,
  GRASS,
  PERIMETER_TRACK,
  TREES,
  carPark,
  helipadIn,
  inFrame,
  runwayStrip,
  sailboat,
  swells,
  tower,
  tracePolygon,
  treeClumps,
} from './shared';

const SITE = LAKESIDE_SITE;
const LATTICE = { frame: SITE, cw: 60, ch: 44 };
const { lane, park, stands } = LAKESIDE_APRON;
const PIER_PAD = 0;
const APRON: Span = { u: 88, v: park - 12, w: stands[stands.length - 1]! + 18 - 88, h: lane + 9 - (park - 12) };
const TERMINAL: Span = { u: stands[0]! - 14, v: park - 30, w: stands[stands.length - 1]! - stands[0]! + 28, h: 14 };
const CAR_PARK: Span = { u: 148, v: -120, w: 66, h: 20 };
const HANGARS: Span[] = [
  { u: 36, v: -98, w: 40, h: 18 },
  { u: 36, v: -70, w: 40, h: 18 },
];
const TOWER = { u: 258, v: -84 };
const PERIMETER: Point[] = [{ x: -30, y: -140 }, { x: 290, y: -140 }, { x: 302, y: -192 }, { x: 360, y: -192 }, { x: 372, y: -18 }, { x: 276, y: 48 }, { x: -30, y: 40 }];
const ROADS: Vertex[][] = [
  [
    [-12, -5],
    [16, -5],
  ],
  [
    [3, -5],
    [3, -3],
  ],
  [
    [8, -5],
    [8, 1],
  ],
];
const VILLAGE: Span = { u: 380, v: -300, w: 220, h: 200 };
const BOATHOUSE: Span = { u: 126, v: 50, w: 20, h: 12 };
const SLIPWAY = { u: 480, v: 44 };
const BOATS: readonly [u: number, v: number, angle: number, size: number][] = [
  [-80, 150, -0.2, 6],
  [30, 230, 0.5, 5],
  [250, 150, -0.4, 7],
  [400, 220, 2.7, 5],
  [520, 108, 0.3, 4],
  [548, 116, 0.2, 4],
];
const SHORE_BANDS: readonly (readonly [offset: number, color: string])[] = [
  [-22, '#86b062'],
  [-6, '#dccb98'],
  [0, '#5fa9c8'],
  [16, '#4796bd'],
  [44, '#3b88b1'],
  [84, '#337ba4'],
];
const ROAD = '#d0c3a0';
const WOOD = '#5d8a48';
const ASPHALT_LIGHT = '#9a9da2';
const TIMBER = '#94744d';
const ROOFS = ['#b0664a', '#99573f', '#c2bbad', '#cc956a'];

function shore(u: number): number {
  return 70 + 9 * Math.sin(u / 85) + 5 * Math.sin(u / 33 + 1.3);
}

function lakeDepth(p: Point): number {
  const q = locate(SITE, p);
  return q.y - shore(q.x);
}

function lakeOutline(offset: number): Point[] {
  const points: Point[] = [];
  for (let u = -480; u <= 840; u += 24) points.push(place(SITE, u, shore(u) + offset));
  points.push(place(SITE, 840, 700), place(SITE, -480, 700));
  return points;
}

export function lakeside(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const pier = world.helipads[PIER_PAD]!;
  const airport = { ...world, helipads: world.helipads.filter((h) => h !== pier) };
  const land = layoutLand(rng, {
    lattice: LATTICE,
    perimeter: PERIMETER,
    roads: ROADS,
  });
  const dry = (p: Point, margin: number): boolean => lakeDepth(p) < -26 - margin;
  const farmland = (p: Point, margin: number): boolean =>
    clearOfEstate(land, p, margin) && roadDistance(land, p) > 7 + margin && dry(p, margin);

  fillView(g, GRASS[0]!);
  paintFields(g, rng, land, { colors: GRASS, hedge: FIELD_EDGE, wood: WOOD });
  paintRoads(g, land, ROAD, 8, FIELD_EDGE);
  paintEstate(g, land, { grass: AIRFIELD_GRASS, hedge: BOUNDARY_HEDGE, track: PERIMETER_TRACK, fence: FENCE });

  for (const [offset, color] of SHORE_BANDS) {
    tracePolygon(g, lakeOutline(offset));
    g.fillStyle = color;
    g.fill();
  }
  swells(g, rng, 26, (p) => lakeDepth(p) > 30, 'rgba(255, 255, 255, 0.14)');

  for (const r of world.runways) runwayStrip(g, r, 24, 20);
  inFrame(g, SITE, () => {
    g.fillStyle = ASPHALT_LIGHT;
    g.fillRect(APRON.u, APRON.v, APRON.w, APRON.h);
    g.fillStyle = ROAD;
    g.fillRect(177, -132, 6, 14);
    g.fillRect(SLIPWAY.u - 4, SLIPWAY.v, 8, shore(SLIPWAY.u) - SLIPWAY.v + 8);
    carPark(g, rng, { x: CAR_PARK.u, y: CAR_PARK.v, w: CAR_PARK.w, h: CAR_PARK.h });
  });
  for (const r of world.runways) taxiway(g, r, ASPHALT_LIGHT);
  inFrame(g, SITE, () => {
    taxiMarkings(g, [
      [{ x: 236, y: 0 }, { x: 250, y: -18 }, { x: 244, y: lane }, { x: 150, y: lane }],
      [{ x: 330, y: -40 }, { x: 218, y: lane }],
      ...stands.map((u) => [{ x: u, y: lane }, { x: u, y: park }]),
    ]);
    strokeLine(g, [{ x: 180, y: -132 }, { x: 180, y: -104 }, { x: 76, y: -104 }], 4, ROAD, false);
    strokeLine(g, [{ x: 480, y: 44 }, { x: 480, y: 58 }], 7, ROAD, false);
    strokeLine(g, [{ x: 126, y: 56 }, { x: 110, y: 56 }, { x: 110, y: 68 }], 3, TIMBER, false);
  });
  for (const r of world.runways) runway(g, r);
  for (const h of airport.helipads) helipadIn(g, SITE, h);

  const deck = locate(SITE, pier.center);
  const half = pier.radius + 9;
  inFrame(g, SITE, () => {
    g.fillStyle = TIMBER;
    g.fillRect(deck.x - 3, shore(deck.x) - 8, 6, deck.y - half - shore(deck.x) + 10);
    shadowed(g, 3, 0.22, () => {
      g.beginPath();
      g.rect(deck.x - half, deck.y - half, half * 2, half * 2);
    });
    g.fillRect(deck.x - half, deck.y - half, half * 2, half * 2);
    g.fillStyle = 'rgba(17, 21, 26, 0.12)';
    for (let v = deck.y - half + 4; v < deck.y + half; v += 5) g.fillRect(deck.x - half, v, half * 2, 1);
  });
  helipadIn(g, SITE, pier, '#b9a988');

  inFrame(g, SITE, () => {
    building(g, TERMINAL.u, TERMINAL.v, TERMINAL.w, TERMINAL.h, '#cfd2d6', 8);
    for (const h of HANGARS) building(g, h.u, h.v, h.w, h.h, '#b4b9bf', 9);
    tower(g, { x: TOWER.u, y: TOWER.v }, 6);
    building(g, BOATHOUSE.u, BOATHOUSE.v, BOATHOUSE.w, BOATHOUSE.h, '#99573f', 5);
  });
  for (const [u, v, angle, size] of BOATS) {
    const p = place(SITE, u, v);
    sailboat(g, p.x, p.y, angle, size);
  }

  hamlet(g, rng, land, VILLAGE, 12, ROOFS);
  hamlet(g, rng, land, { u: -380, v: -300, w: 650, h: 90 }, 5, ROOFS, true);

  hedgerowTrees(g, rng, land, 0.3, TREES, (p, r) => farmland(p, r + 3));
  woodlots(g, rng, land, TREES, (p, r) => farmland(p, r + 2));
  treeClumps(g, scene, 16, TREES, [4, 7.5], (p) => farmland(p, 22));
  treeClumps(g, scene, 10, TREES, [4, 7], (p) => clearOfEstate(land, p, 10) && lakeDepth(p) < -12 && lakeDepth(p) > -30);
}
