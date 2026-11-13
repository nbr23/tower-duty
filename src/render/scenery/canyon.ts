import type { Point } from '../../game/geometry';
import {
  between,
  building,
  fillView,
  helipad,
  patches,
  pick,
  polylineDistance,
  runway,
  scatter,
  shadowed,
  strokeLine,
  taxiway, taxiMarkings,
  zoneClear,
  type Ctx,
  type Scene,
} from '../art';
import {
  DESERT_RUNWAY,
  DUNE_LIT,
  DUNE_SHADE,
  SAND,
  SAND_SCRUB,
  SAND_TONES,
  along,
  crescents,
  inRect,
  palm,
  scrub,
  tower,
  type Rect,
} from './shared';

const RIVER: Point[] = [
  { x: 560, y: -120 },
  { x: 585, y: 0 },
  { x: 640, y: 90 },
  { x: 720, y: 170 },
  { x: 700, y: 270 },
  { x: 760, y: 350 },
  { x: 820, y: 430 },
  { x: 880, y: 520 },
  { x: 1000, y: 600 },
];
const DR_HANGAR: Rect = { x: 206, y: 280, w: 108, h: 18 };
const DR_TOWER: Point = { x: 334, y: 306 };
const DR_APRON: Rect = { x: 206, y: 300, w: 108, h: 53 };
const DR_ROAD: Point[] = [
  { x: 290, y: 280 },
  { x: 300, y: 220 },
  { x: 350, y: 150 },
  { x: 440, y: 110 },
  { x: 540, y: 112 },
  { x: 580, y: 112 },
  { x: 580, y: -120 },
];
const DR_TOWN: Rect = { x: 500, y: 60, w: 110, h: 130 };
const DR_PLOTS = ['#8fae5c', '#a4b86a', '#7f9f52', '#b3bd72'];
const DR_ROOFS = ['#efe6d2', '#e2d2b0', '#d6c49c', '#f4eee0'];
const APRON_SAND = '#bdb198';

export function canyon(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  fillView(g, SAND);
  const dry = (p: Point): boolean => polylineDistance(p, RIVER) > 40;
  patches(g, rng, SAND_TONES, 18, [90, 220], dry);
  crescents(
    g,
    rng,
    22,
    (p) => polylineDistance(p, RIVER) > 110 && zoneClear(world, p, 34) && !inRect(p, DR_APRON, 30) && !inRect(p, DR_TOWN, 40) && polylineDistance(p, DR_ROAD) > 34,
    DUNE_LIT,
    DUNE_SHADE,
  );

  strokeLine(g, RIVER, 76, '#c6b97e');
  strokeLine(g, RIVER, 52, '#83a35a');
  strokeLine(g, RIVER, 30, '#3f8ab5');
  strokeLine(g, RIVER, 9, '#4c97c0');

  along(RIVER.slice(1, 6), 25, (p, n) => {
    for (const k of [0, 1]) {
      const c = { x: p.x + n.x * (50 + k * 13), y: p.y + n.y * (50 + k * 13) };
      if (rng() < 0.2 || polylineDistance(c, RIVER) < 46 || !zoneClear(world, c, 40) || inRect(c, DR_TOWN, 6)) continue;
      g.save();
      g.translate(c.x, c.y);
      g.rotate(Math.atan2(n.y, n.x));
      g.fillStyle = pick(rng, DR_PLOTS);
      g.fillRect(-5.5, -10, 11, 20);
      g.fillStyle = 'rgba(55, 95, 57, 0.25)';
      for (let row = -7; row < 10; row += 4) g.fillRect(-5, row, 10, 1);
      g.fillStyle = '#7b9e91';
      g.fillRect(-7, -11, 1, 23);
      g.restore();
    }
  });
  strokeLine(g, DR_ROAD, 9, '#c9ab72');
  strokeLine(g, DR_ROAD, 6, '#b9a888');
  g.fillStyle = APRON_SAND;
  g.fillRect(DR_APRON.x, DR_APRON.y, DR_APRON.w, DR_APRON.h);
  for (const r of world.runways) taxiway(g, r, APRON_SAND);
  taxiMarkings(g, [
    [{ x: 280, y: 398 }, { x: 265, y: 398 }, { x: 258, y: 384 }, { x: 260, y: 344 }],
    [{ x: 128, y: 319 }, { x: 138, y: 336 }, { x: 160, y: 344 }, { x: 294, y: 344 }],
    ...[226, 260, 294].map((x) => [{ x, y: 344 }, { x, y: 318 }]),
  ]);
  for (const r of world.runways) runway(g, r, DESERT_RUNWAY);
  for (const h of world.helipads) helipad(g, h, '#b8ac93');
  building(g, DR_HANGAR.x, DR_HANGAR.y, DR_HANGAR.w, DR_HANGAR.h, '#d6d0c2', 8);
  tower(g, DR_TOWER, 5.5);
  for (const y of [76, 150, 182]) {
    strokeLine(g, [{ x: 580, y: 112 }, { x: 580, y }, { x: 500, y }], 4, '#baa580', false);
    for (const x of [510, 540, 570]) {
      const cy = y - 17;
      g.fillStyle = '#d6bd90';
      g.fillRect(x - 11, cy - 11, 24, 25);
      g.strokeStyle = '#baa580';
      g.lineWidth = 1;
      g.strokeRect(x - 11, cy - 11, 24, 25);
      strokeLine(g, [{ x, y }, { x, y: cy + 4 }], 3, '#baa580', false);
      building(g, x - 8, cy - 8, 15, 11, pick(rng, DR_ROOFS), 4);
      g.fillStyle = '#b29b75';
      g.fillRect(x + 4, cy + 6, 6, 4);
    }
  }

  for (let i = 0; i < 70; i++) {
    const segment = Math.floor(rng() * (RIVER.length - 1));
    const a = RIVER[segment]!;
    const b = RIVER[segment + 1]!;
    const t = rng();
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const side = rng() < 0.5 ? -1 : 1;
    const offset = between(rng, 20, 34) * side;
    const p = {
      x: a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * offset,
      y: a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * offset,
    };
    if (polylineDistance(p, RIVER) > 18 && zoneClear(world, p, 12)) palm(g, rng, p.x, p.y, between(rng, 5, 8));
  }

  const open = (p: Point): boolean =>
    dry(p) &&
    !inRect(p, DR_HANGAR, 8) &&
    !inRect(p, DR_APRON, 8) &&
    !inRect(p, DR_TOWN, 10) &&
    polylineDistance(p, DR_ROAD) > 12 &&
    polylineDistance(p, RIVER) > 96 &&
    Math.hypot(p.x - DR_TOWER.x, p.y - DR_TOWER.y) > 14 &&
    zoneClear(world, p, 16);
  for (const p of scatter(rng, 26, open)) {
    const r = between(rng, 2, 6);
    shadowed(g, r, 0.22, () => {
      g.beginPath();
      g.ellipse(p.x, p.y, r, r * 0.7, 0, 0, Math.PI * 2);
    });
    g.fillStyle = pick(rng, ['#a48a6c', '#937b60', '#b09877']);
    g.beginPath();
    g.ellipse(p.x, p.y, r, r * 0.7, 0, 0, Math.PI * 2);
    g.fill();
  }
  scrub(g, rng, 50, open, SAND_SCRUB);
}
