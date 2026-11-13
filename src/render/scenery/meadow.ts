import { MEADOW_APRON, MEADOW_SITE } from '../../config/maps';
import type { Point } from '../../game/geometry';
import { building, fillView, strokeLine, runway, taxiway, taxiMarkings, type Ctx, type Scene } from '../art';
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
  tower,
  treeClumps,
} from './shared';

const LATTICE = { frame: MEADOW_SITE, cw: 60, ch: 50 };
const { lane, park, stands } = MEADOW_APRON;
const APRON: Span = { u: stands[0]! - 18, v: lane - 9, w: stands[stands.length - 1]! - stands[0]! + 36, h: park - lane + 25 };
const TERMINAL: Span = { u: APRON.u + 4, v: APRON.v + APRON.h, w: APRON.w - 8, h: 14 };
const CAR_PARK: Span = { u: 104, v: 112, w: 78, h: 22 };
const HANGARS: Span[] = [
  { u: 226, v: 96, w: 32, h: 18 },
  { u: 264, v: 96, w: 30, h: 18 },
];
const TOWER = { u: 214, v: 110 };
const PERIMETER: Point[] = [{ x: -32, y: -36 }, { x: 230, y: -36 }, { x: 300, y: 22 }, { x: 300, y: 142 }, { x: 60, y: 142 }, { x: -16, y: 194 }, { x: -70, y: 164 }, { x: -70, y: 122 }, { x: -10, y: 54 }];
const ROADS: Vertex[][] = [
  [
    [-12, -2],
    [14, -2],
  ],
  [
    [6, -8],
    [6, 8],
  ],
  [
    [-1, 3],
    [6, 3],
  ],
];
const ROAD = '#d0c3a0';
const WOOD = '#5d8a48';
const ASPHALT_LIGHT = '#9a9da2';

export function meadow(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const land = layoutLand(rng, {
    lattice: LATTICE,
    perimeter: PERIMETER,
    roads: ROADS,
  });
  const farmland = (p: Point, margin: number): boolean => clearOfEstate(land, p, margin) && roadDistance(land, p) > 7 + margin;

  fillView(g, GRASS[0]!);
  paintFields(g, rng, land, { colors: GRASS, hedge: FIELD_EDGE, wood: WOOD });
  paintRoads(g, land, ROAD, 8, FIELD_EDGE);
  paintEstate(g, land, { grass: AIRFIELD_GRASS, hedge: BOUNDARY_HEDGE, track: PERIMETER_TRACK, fence: FENCE });

  for (const r of world.runways) runwayStrip(g, r, 24, 20);
  inFrame(g, MEADOW_SITE, () => {
    g.fillStyle = ASPHALT_LIGHT;
    g.fillRect(APRON.u, APRON.v, APRON.w, APRON.h);
    g.fillStyle = ROAD;
    g.fillRect(CAR_PARK.u + CAR_PARK.w / 2 - 3, CAR_PARK.v + CAR_PARK.h, 6, 150 - CAR_PARK.v - CAR_PARK.h);
    carPark(g, rng, { x: CAR_PARK.u, y: CAR_PARK.v, w: CAR_PARK.w, h: CAR_PARK.h });
  });
  for (const r of world.runways) taxiway(g, r, ASPHALT_LIGHT);
  inFrame(g, MEADOW_SITE, () => {
    taxiMarkings(g, [
      [{ x: 186, y: 0 }, { x: 203, y: 18 }, { x: 200, y: 40 }, { x: 74, y: 40 }, { x: 60, y: 58 }],
      ...stands.map((u) => [{ x: u, y: lane }, { x: u, y: park }]),
    ]);
    strokeLine(g, [{ x: 300, y: 150 }, { x: 300, y: 126 }, { x: 230, y: 126 }, { x: 230, y: 115 }], 5, ROAD, false);
  });
  for (const r of world.runways) runway(g, r);
  for (const h of world.helipads) helipadIn(g, MEADOW_SITE, h);
  inFrame(g, MEADOW_SITE, () => {
    building(g, TERMINAL.u, TERMINAL.v, TERMINAL.w, TERMINAL.h, '#cfd2d6', 8);
    for (const h of HANGARS) building(g, h.u, h.v, h.w, h.h, '#b4b9bf', 9);
    tower(g, { x: TOWER.u, y: TOWER.v }, 6);
  });


  hamlet(g, rng, land, { u: -420, v: -210, w: 820, h: 100 }, 7, ['#a66d50', '#b17b59'], true);
  hamlet(g, rng, land, { u: 330, v: -60, w: 180, h: 400 }, 5, ['#a66d50', '#b17b59'], true);
  hedgerowTrees(g, rng, land, 0.3, TREES, (p, r) => farmland(p, r + 3));
  woodlots(g, rng, land, TREES, (p, r) => farmland(p, r + 2));
  treeClumps(g, scene, 12, TREES, [4.5, 7.5], (p) => farmland(p, 24));
}
