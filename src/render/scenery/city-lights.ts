import type { Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import {
  between,
  building,
  disc,
  fillView,
  glow,
  helipad,
  patches,
  pick,
  polylineDistance,
  runway,
  shadowed,
  strokeLine,
  taxiway, taxiMarkings,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
import { along, inRect, rectClear, type Rect } from './shared';

const CL_RIVER: Point[] = [
  { x: 600, y: -120 },
  { x: 590, y: 0 },
  { x: 560, y: 110 },
  { x: 540, y: 230 },
  { x: 548, y: 330 },
  { x: 575, y: 450 },
  { x: 600, y: 600 },
];
const CL_HIGHWAYS: Point[][] = [
  [
    { x: -170, y: 80 },
    { x: 200, y: 88 },
    { x: 450, y: 84 },
    { x: 560, y: 62 },
    { x: 700, y: 36 },
    { x: 1030, y: 16 },
  ],
  [
    { x: -170, y: 420 },
    { x: 250, y: 400 },
    { x: 480, y: 410 },
    { x: 600, y: 430 },
    { x: 800, y: 440 },
    { x: 1030, y: 450 },
  ],
];
const CL_GRID = { x0: -182, y0: -100, x1: 1014, y1: 580, cell: 34, street: 7 };
const CL_DOWNTOWN: Point = { x: 720, y: 180 };
const CL_ESTATE: Rect = { x: 90, y: 104, w: 408, h: 238 };
const CL_APRON: Rect = { x: 184, y: 181, w: 264, h: 114 };
const CL_ACCESS: Point[] = [
  { x: 448, y: 237 },
  { x: 498, y: 237 },
  { x: 548, y: 237 },
  { x: 634, y: 237 },
  { x: 634, y: 49 },
];
const CL_PARK = '#12201b';
const CL_TURF = '#111c18';
const CL_TERMINAL: Rect = { x: 250, y: 226, w: 140, h: 22 };
const CL_TOWER: Point = { x: 470, y: 206 };
const CL_ROOFS = ['#1d2433', '#222a3b', '#1a202d', '#252c39'];
const CL_GROUND = '#131924';
const CL_WINDOWS = ['255, 214, 130', '200, 225, 255', '255, 236, 190'];
const NIGHT_RUNWAY: RunwayStyle = {
  surface: '#2c3038',
  shoulder: '#0e1219',
  edge: 'rgba(244, 242, 236, 0.4)',
  center: 'rgba(244, 242, 236, 0.5)',
  lights: { edge: '#fff1c9', threshold: '#4dff88', end: '#ff4b4b', approach: '#ffffff' },
};

function litWindows(g: Ctx, rng: Rng, r: Rect, density: number): void {
  g.fillStyle = `rgb(${pick(rng, CL_WINDOWS)})`;
  for (let y = r.y + 3; y < r.y + r.h - 2; y += 5) {
    for (let x = r.x + 3; x < r.x + r.w - 2; x += 5) {
      if (rng() > density * 0.7) continue;
      g.globalAlpha = between(rng, 0.35, 0.7);
      g.fillRect(x, y, 1.5, 1);
    }
  }
  g.globalAlpha = 1;
}

function cityBlock(g: Ctx, rng: Rng, block: Rect, density: number): void {
  const parts: Rect[] =
    rng() < 0.4
      ? [block]
      : rng() < 0.5
        ? [
            { ...block, w: block.w / 2 - 1 },
            { ...block, x: block.x + block.w / 2 + 1, w: block.w / 2 - 1 },
          ]
        : [
            { ...block, h: block.h / 2 - 1 },
            { ...block, y: block.y + block.h / 2 + 1, h: block.h / 2 - 1 },
          ];
  for (const r of parts) {
    building(g, r.x, r.y, r.w, r.h, pick(rng, CL_ROOFS), between(rng, 4, 4 + density * 14));
    litWindows(g, rng, r, density);
  }
}

function cityGrid(g: Ctx, rng: Rng, ok: (p: Point) => boolean): void {
  const { x0, y0, x1, y1, cell, street } = CL_GRID;
  const corners: Point[] = [];
  for (let y = y0; y < y1; y += cell) {
    for (let x = x0; x < x1; x += cell) {
      const block = { x: x + street / 2, y: y + street / 2, w: cell - street, h: cell - street };
      const points = [
        { x: block.x, y: block.y },
        { x: block.x + block.w, y: block.y },
        { x: block.x, y: block.y + block.h },
        { x: block.x + block.w, y: block.y + block.h },
      ];
      if (!points.every(ok)) continue;
      const near = Math.hypot(x - CL_DOWNTOWN.x, y - CL_DOWNTOWN.y);
      const density = Math.max(0.14, 0.85 - near / 480);
      corners.push({ x, y });
      g.fillStyle = '#242b35';
      g.fillRect(x, y, cell, cell);
      g.fillStyle = '#353b44';
      g.fillRect(block.x - 1, block.y - 1, block.w + 2, block.h + 2);
      if (density < 0.3 && rng() < 0.28) {
        g.fillStyle = CL_PARK;
        g.fillRect(block.x, block.y, block.w, block.h);
        continue;
      }
      cityBlock(g, rng, block, density);
    }
  }
  for (const c of corners) glow(g, c.x, c.y, 'rgba(255, 180, 90, 0.9)', 0.9);
}

function headlights(g: Ctx, rng: Rng, road: readonly Point[]): void {
  along(road, 17, (p, n) => {
    if (rng() < 0.45) glow(g, p.x + n.x * 2.2, p.y + n.y * 2.2, '#fff6dc', 0.7, 1.8);
    if (rng() < 0.45) glow(g, p.x - n.x * 2.2, p.y - n.y * 2.2, '#ff4040', 0.7, 1.8);
  });
}

function obstructionLights(g: Ctx, r: Rect): void {
  for (const [x, y] of [
    [r.x + 2, r.y + 2],
    [r.x + r.w - 2, r.y + 2],
    [r.x + 2, r.y + r.h - 2],
    [r.x + r.w - 2, r.y + r.h - 2],
  ] as const) {
    glow(g, x, y, '#ff3030', 1);
  }
}

export function cityLights(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const [rooftop, hospital] = world.helipads;
  const towers: Rect[] = [
    { x: rooftop!.center.x - 24, y: rooftop!.center.y - 24, w: 48, h: 48 },
    { x: hospital!.center.x - 30, y: hospital!.center.y - 22, w: 60, h: 44 },
  ];

  fillView(g, CL_GROUND);
  patches(g, rng, ['#171e2b', '#10151e'], 12, [100, 220]);
  strokeLine(g, CL_RIVER, 44, '#0d2538');
  strokeLine(g, CL_RIVER, 34, '#12344f');

  const blockOk = (p: Point): boolean =>
    !inRect(p, CL_ESTATE, 3) &&
    polylineDistance(p, CL_ACCESS) > 8 &&
    polylineDistance(p, CL_RIVER) > 30 &&
    CL_HIGHWAYS.every((road) => polylineDistance(p, road) > 10) &&
    towers.every((t) => !inRect(p, t, 6)) &&
    zoneClear(world, p, 6);
  g.save();
  g.beginPath();
  g.rect(-160, -100, 1174, 680);
  g.rect(CL_ESTATE.x, CL_ESTATE.y, CL_ESTATE.w, CL_ESTATE.h);
  g.clip('evenodd');
  for (const bank of [
    { x: -160, y: -100, w: 674, h: 680 },
    { x: 620, y: -100, w: 394, h: 680 },
  ]) {
    g.save();
    g.beginPath();
    g.rect(bank.x, bank.y, bank.w, bank.h);
    g.clip();
    for (let x = CL_GRID.x0; x < CL_GRID.x1; x += CL_GRID.cell) {
      strokeLine(g, [{ x, y: -100 }, { x, y: 580 }], 5, '#242b35', false);
    }
    for (let y = CL_GRID.y0; y < CL_GRID.y1; y += CL_GRID.cell) {
      strokeLine(g, [{ x: bank.x, y }, { x: bank.x + bank.w, y }], 5, '#242b35', false);
    }
    g.restore();
  }
  g.restore();
  cityGrid(g, rng, blockOk);

  for (const road of CL_HIGHWAYS) {
    strokeLine(g, road, 12, '#0a0d14', false);
    strokeLine(g, road, 9, '#232a38', false);
  }

  g.fillStyle = CL_TURF;
  g.fillRect(CL_ESTATE.x, CL_ESTATE.y, CL_ESTATE.w, CL_ESTATE.h);
  g.strokeStyle = 'rgba(244, 242, 236, 0.16)';
  g.lineWidth = 1;
  g.strokeRect(CL_ESTATE.x + 2, CL_ESTATE.y + 2, CL_ESTATE.w - 4, CL_ESTATE.h - 4);
  strokeLine(g, CL_ACCESS, 9, '#0a0d14', false);
  strokeLine(g, CL_ACCESS, 6, '#232a38', false);
  strokeLine(g, [{ x: 390, y: 237 }, { x: 448, y: 237 }], 6, '#232a38', false);
  for (const bridge of [
    [{ x: 538, y: 66 }, { x: 600, y: 55 }],
    [{ x: 546, y: 422 }, { x: 606, y: 431 }],
    [{ x: 516, y: 237 }, { x: 568, y: 237 }],
  ]) {
    g.lineCap = 'butt';
    g.lineWidth = 12;
    g.strokeStyle = '#626974';
    g.beginPath();
    g.moveTo(bridge[0]!.x, bridge[0]!.y);
    g.lineTo(bridge[1]!.x, bridge[1]!.y);
    g.stroke();
    g.lineWidth = 9;
    g.strokeStyle = '#303846';
    g.stroke();
  }
  g.fillStyle = '#1c222d';
  g.beginPath();
  g.roundRect(CL_APRON.x, CL_APRON.y, CL_APRON.w, CL_APRON.h, 6);
  g.fill();
  for (const r of world.runways) taxiway(g, r, '#24282f');
  taxiMarkings(g, [
    [{ x: 420, y: 310 }, { x: 438, y: 304 }, { x: 438, y: 286 }, { x: 290, y: 286 }],
    [{ x: 210, y: 160 }, { x: 194, y: 166 }, { x: 194, y: 190 }, { x: 350, y: 190 }],
    ...[290, 330, 370].map((x) => [{ x, y: 286 }, { x, y: 268 }]),
    ...[270, 310, 350].map((x) => [{ x, y: 190 }, { x, y: 208 }]),
  ]);
  for (const r of world.runways) runway(g, r, NIGHT_RUNWAY);
  for (const y of [190, 286]) {
    along([{ x: 205, y }, { x: 430, y }], 28, (p) => glow(g, p.x, p.y + (y === 190 ? -8 : 8), '#4d8dff', 0.65, 1.5));
  }

  if (rectClear(world, CL_TERMINAL)) {
    building(g, CL_TERMINAL.x, CL_TERMINAL.y, CL_TERMINAL.w, CL_TERMINAL.h, '#2b3140', 8);
    g.fillStyle = 'rgba(255, 214, 130, 0.75)';
    g.fillRect(CL_TERMINAL.x + 4, CL_TERMINAL.y + 1, CL_TERMINAL.w - 8, 1.5);
    g.fillRect(CL_TERMINAL.x + 4, CL_TERMINAL.y + CL_TERMINAL.h - 2.5, CL_TERMINAL.w - 8, 1.5);
  }
  g.fillStyle = '#3a4152';
  for (const r of world.runways) {
    for (const path of r.taxiPaths) {
      const gate = path[path.length - 1]!;
      const y = gate.y < CL_TERMINAL.y ? CL_TERMINAL.y - 8 : CL_TERMINAL.y + CL_TERMINAL.h;
      g.fillRect(gate.x - 2, y, 4, 8);
    }
  }
  if (zoneClear(world, CL_TOWER, 8)) {
    shadowed(g, 16, 0.4, () => {
      g.beginPath();
      g.arc(CL_TOWER.x, CL_TOWER.y, 6, 0, Math.PI * 2);
    });
    disc(g, CL_TOWER.x, CL_TOWER.y, 6, '#3a4152');
    glow(g, CL_TOWER.x, CL_TOWER.y, '#9fe3ff', 3.2, 6);
    glow(g, CL_TOWER.x + 3, CL_TOWER.y - 3, '#4dff88', 0.9);
  }

  towers.forEach((t, i) => {
    building(g, t.x, t.y, t.w, t.h, i === 0 ? '#272e3d' : '#2f3544', i === 0 ? 16 : 8);
    obstructionLights(g, t);
  });
  g.fillStyle = '#ff4b5c';
  const cross = { x: towers[1]!.x + towers[1]!.w - 10, y: towers[1]!.y + 4 };
  g.fillRect(cross.x - 1.5, cross.y, 3, 8);
  g.fillRect(cross.x - 4, cross.y + 2.5, 8, 3);
  for (const h of world.helipads) helipad(g, h, '#3a4050', 'rgba(255, 255, 255, 0.7)');

  for (const road of [...CL_HIGHWAYS, CL_ACCESS]) headlights(g, rng, road);
  for (let i = 0; i < 80; i++) {
    const segment = Math.floor(rng() * (CL_RIVER.length - 1));
    const a = CL_RIVER[segment]!;
    const b = CL_RIVER[segment + 1]!;
    const t = rng();
    const x = a.x + (b.x - a.x) * t + between(rng, 0, 14);
    const y = a.y + (b.y - a.y) * t;
    g.fillStyle = `rgba(${pick(rng, CL_WINDOWS)}, ${between(rng, 0.12, 0.3)})`;
    g.beginPath();
    g.ellipse(x, y, between(rng, 2, 6), 0.8, 0, 0, Math.PI * 2);
    g.fill();
  }
}
