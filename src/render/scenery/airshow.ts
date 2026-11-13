import { AIRSHOW_SITE } from '../../config/maps';
import { locate, type Point } from '../../game/geometry';
import {
  building,
  disc,
  fillView,
  runway,
  strokeLine,
  scatter,
  shadowed,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
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
import { inFrame, runwayStrip, treeClumps } from './shared';

const SITE = AIRSHOW_SITE;
const LATTICE = { frame: SITE, cw: 64, ch: 52 };
const FIELDS = ['#9ea468', '#939b60', '#a9a770', '#b2a976', '#8a9459'];
const FIELD_EDGE = 'rgba(98, 104, 64, 0.5)';
const TREES = ['#59633a', '#656d3f', '#505a34'];
const WOOD = '#79824f';
const TURF = '#aab474';
const MOWN = '#b6bf82';
const EARTH = '#bdb383';
const ROAD = '#c4af82';
const GRASS_STRIP: RunwayStyle = {
  surface: '#c3cb92',
  edge: 'rgba(244, 242, 236, 0.9)',
  center: 'rgba(244, 242, 236, 0.9)',
  markers: true,
};
const HANGARS: Span[] = [
  { u: -18, v: -150, w: 38, h: 40 },
  { u: -18, v: -104, w: 38, h: 40 },
];
const APRON: Span = { u: 20, v: -152, w: 30, h: 112 };
const CLUBHOUSE: Span = { u: -14, v: -56, w: 28, h: 14 };
const SHED: Span = { u: 372, v: -262, w: 184, h: 50 };
const WINDSOCK = { u: 150, v: -48 };
const PERIMETER: Point[] = [{ x: -42, y: -182 }, { x: 214, y: -264 }, { x: 294, y: -264 }, { x: 340, y: -284 }, { x: 568, y: -284 }, { x: 568, y: 24 }, { x: -42, y: 24 }];
const ROADS: Vertex[][] = [
  [
    [-9, 1],
    [15, 1],
  ],
  [
    [-1, -9],
    [-1, 6],
  ],
  [
    [9, -9],
    [9, 6],
  ],
];
const VILLAGE: Span = { u: -260, v: -40, w: 180, h: 200 };
const ROOFS = ['#a8734f', '#8f6a4c', '#b8a682'];
const MOORING_BLOCKS = 16;

function hangar(g: Ctx, r: Span): void {
  building(g, r.u, r.v, r.w, r.h, '#a89e86', 10);
  g.fillStyle = '#8a816c';
  g.fillRect(r.u + r.w - 5, r.v + 3, 5, r.h - 6);
}

function airshipShed(g: Ctx, r: Span): void {
  building(g, r.u, r.v, r.w, r.h, '#a89e86', 24);
  g.fillStyle = 'rgba(17, 21, 26, 0.1)';
  for (let u = r.u + 12; u < r.u + r.w - 6; u += 12) g.fillRect(u, r.v, 1, r.h);
  g.fillStyle = '#8a816c';
  g.fillRect(r.u, r.v + 4, 6, r.h - 8);
  g.fillStyle = 'rgba(244, 242, 236, 0.35)';
  g.fillRect(r.u, r.v + r.h / 2 - 0.75, r.w, 1.5);
}

function windsock(g: Ctx, u: number, v: number): void {
  g.strokeStyle = 'rgba(17, 21, 26, 0.26)';
  g.lineWidth = 1.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(u, v);
  g.lineTo(u + 9, v + 12);
  g.stroke();
  g.fillStyle = '#e07a3a';
  g.beginPath();
  g.moveTo(u, v - 2.5);
  g.lineTo(u + 14, v - 1);
  g.lineTo(u + 14, v + 1);
  g.lineTo(u, v + 2.5);
  g.closePath();
  g.fill();
  disc(g, u, v, 1.5, '#43382c');
}

function mooringField(g: Ctx, center: Point, radius: number): void {
  const { x, y } = center;
  disc(g, x, y, radius, MOWN);
  g.strokeStyle = 'rgba(98, 104, 64, 0.45)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, y, radius * 0.72, 0, Math.PI * 2);
  g.stroke();
  disc(g, x, y, radius * 0.3, '#c1c98e');
  for (let i = 0; i < MOORING_BLOCKS; i++) {
    const a = (i / MOORING_BLOCKS) * Math.PI * 2;
    const bx = x + Math.cos(a) * radius * 0.72;
    const by = y + Math.sin(a) * radius * 0.72;
    g.fillStyle = '#8a816c';
    g.fillRect(bx - 1.6, by - 1.6, 3.2, 3.2);
  }
  g.strokeStyle = 'rgba(17, 21, 26, 0.26)';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + 26, y + 34);
  g.stroke();
  g.fillStyle = '#62523f';
  g.beginPath();
  g.roundRect(x - 5, y - 5, 10, 10, 2);
  g.fill();
  disc(g, x, y, 3, '#d3be86');
}

export function airshow(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const [mast] = world.helipads;
  const strips = { ...world, helipads: [] };
  const nearMast = (p: Point, margin: number): boolean =>
    mast !== undefined && Math.hypot(p.x - mast.center.x, p.y - mast.center.y) < mast.radius + margin;
  const land = layoutLand(rng, {
    lattice: LATTICE,
    perimeter: PERIMETER,
    roads: ROADS,
  });
  const farmland = (p: Point, margin: number): boolean => clearOfEstate(land, p, margin) && roadDistance(land, p) > 6 + margin;

  fillView(g, FIELDS[0]!);
  paintFields(g, rng, land, { colors: FIELDS, hedge: FIELD_EDGE, wood: WOOD });
  paintRoads(g, land, ROAD, 6, FIELD_EDGE);
  paintEstate(g, land, { grass: TURF, hedge: 'rgba(86, 92, 56, 0.7)', track: '#c2b98c', fence: 'rgba(244, 242, 236, 0.55)' });

  for (const r of world.runways) runwayStrip(g, r, 26, 22);
  if (mast !== undefined) mooringField(g, mast.center, mast.radius);
  inFrame(g, SITE, () => {
    strokeLine(g, [{ x: -64, y: -48 }, { x: -32, y: -48 }, { x: -32, y: -168 }, { x: 32, y: -168 }, { x: 32, y: -150 }], 5, ROAD, false);
    strokeLine(g, [{ x: 576, y: -236 }, { x: 560, y: -236 }], 6, ROAD, false);
    strokeLine(g, [{ x: 464, y: -212 }, { x: 464, y: -196 }], 20, EARTH, false);
    g.fillStyle = EARTH;
    g.fillRect(APRON.u, APRON.v, APRON.w, APRON.h);
  });
  for (const r of world.runways) runway(g, r, GRASS_STRIP);
  inFrame(g, SITE, () => {
    for (const h of HANGARS) hangar(g, h);
    building(g, CLUBHOUSE.u, CLUBHOUSE.v, CLUBHOUSE.w, CLUBHOUSE.h, '#a8734f', 6);
    airshipShed(g, SHED);
    windsock(g, WINDSOCK.u, WINDSOCK.v);
  });

  hamlet(g, rng, land, VILLAGE, 9, ROOFS);
  for (const p of scatter(rng, 36, (q) => farmland(q, 8))) {
    shadowed(g, 3, 0.22, () => {
      g.beginPath();
      g.arc(p.x, p.y, 3, 0, Math.PI * 2);
    });
    disc(g, p.x, p.y, 3, '#dcc885');
  }
  hedgerowTrees(g, rng, land, 0.3, TREES, (p, r) => farmland(p, r + 3));
  woodlots(g, rng, land, TREES, (p, r) => farmland(p, r + 2));
  treeClumps(g, scene, 18, TREES, [4, 7], (p) => farmland(p, 22));
  const inField = (p: Point): boolean => {
    const q = locate(SITE, p);
    return q.x > 60 && q.x < 360 && q.y < -30 && q.y > -200;
  };
  treeClumps(g, scene, 3, TREES, [4, 6], (p) => inField(p) && !clearOfEstate(land, p, 0) && !nearMast(p, 30) && zoneClear(strips, p, 44));
}
