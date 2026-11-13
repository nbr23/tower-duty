import type { Frame, Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import type { HelipadZone, RunwayZone, World } from '../../game/world';
import {
  between,
  disc,
  helipad,
  pick,
  scatter,
  shadowed,
  strokeLine,
  tree,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';

export type Painter = (g: Ctx, scene: Scene) => void;

export function helipadIn(g: Ctx, f: Frame, pad: HelipadZone, surface?: string, marking?: string): void {
  g.save();
  g.translate(pad.center.x, pad.center.y);
  g.rotate((f.angle * Math.PI) / 180);
  g.translate(-pad.center.x, -pad.center.y);
  helipad(g, pad, surface, marking);
  g.restore();
}

export function inFrame(g: Ctx, f: Frame, draw: () => void): void {
  g.save();
  g.translate(f.origin.x, f.origin.y);
  g.rotate((f.angle * Math.PI) / 180);
  draw();
  g.restore();
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function inRect(p: Point, r: Rect, margin: number): boolean {
  return p.x > r.x - margin && p.x < r.x + r.w + margin && p.y > r.y - margin && p.y < r.y + r.h + margin;
}

export function rectClear(world: World, r: Rect): boolean {
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x, y: r.y + r.h },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x + r.w / 2, y: r.y + r.h / 2 },
  ];
  return corners.every((p) => zoneClear(world, p, 2));
}

export function road(g: Ctx, points: readonly Point[], surface: string, width: number): void {
  strokeLine(g, points, width, surface);
}

export function tower(g: Ctx, p: Point, r: number): void {
  shadowed(g, 16, 0.26, () => {
    g.beginPath();
    g.arc(p.x, p.y, r, 0, Math.PI * 2);
  });
  disc(g, p.x, p.y, r, '#e3e1da');
  disc(g, p.x, p.y, r * 0.55, '#4f6f8c');
}

export function treeClumps(
  g: Ctx,
  scene: Scene,
  count: number,
  colors: readonly string[],
  size: [number, number],
  ok: (p: Point) => boolean,
): void {
  const { world, rng } = scene;
  const clear = (p: Point, margin: number): boolean => zoneClear(world, p, margin) && ok(p);
  for (const center of scatter(rng, count, (p) => clear(p, 30))) {
    const n = 2 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const p = { x: center.x + between(rng, -16, 16), y: center.y + between(rng, -12, 12) };
      const r = between(rng, size[0], size[1]);
      if (clear(p, r + 4)) tree(g, rng, p.x, p.y, r, colors);
    }
  }
}

export function swells(g: Ctx, rng: Rng, count: number, ok: (p: Point) => boolean, color: string): void {
  g.lineCap = 'round';
  g.strokeStyle = color;
  for (const p of scatter(rng, count, ok)) {
    const len = between(rng, 14, 40);
    g.lineWidth = between(rng, 0.6, 1.4);
    g.beginPath();
    g.moveTo(p.x - len / 2, p.y);
    g.quadraticCurveTo(p.x, p.y - 2, p.x + len / 2, p.y);
    g.stroke();
  }
}

export function crescents(g: Ctx, rng: Rng, count: number, ok: (p: Point) => boolean, lit: string, shade: string): void {
  g.lineCap = 'round';
  for (const p of scatter(rng, count, ok)) {
    const r = between(rng, 26, 70);
    const a = between(rng, -0.3, 0.3);
    const width = between(rng, 4, 8);
    g.lineWidth = width;
    g.strokeStyle = shade;
    g.beginPath();
    g.arc(p.x, p.y + r + width * 0.8, r, Math.PI * 1.3 + a, Math.PI * 1.7 + a);
    g.stroke();
    g.strokeStyle = lit;
    g.beginPath();
    g.arc(p.x, p.y + r, r, Math.PI * 1.3 + a, Math.PI * 1.7 + a);
    g.stroke();
  }
}

export function scrub(g: Ctx, rng: Rng, count: number, ok: (p: Point) => boolean, color: string): void {
  for (const p of scatter(rng, count, ok)) disc(g, p.x, p.y, between(rng, 1.5, 3), color);
}

export function hullShape(g: Ctx, hull: readonly Point[], height: number, deck: string, side: string): void {
  shadowed(g, height, 0.28, () => tracePolygon(g, hull));
  g.fillStyle = side;
  g.save();
  g.translate(0, 3);
  tracePolygon(g, hull);
  g.fill();
  g.restore();
  g.fillStyle = deck;
  tracePolygon(g, hull);
  g.fill();
}

export const GRASS = ['#82996a', '#77905f', '#91a578', '#9dac7d', '#b0ad7a', '#718b60'];
export const FIELD_EDGE = 'rgba(52, 76, 44, 0.28)';
export const TREES = ['#3f6e36', '#48783b', '#396430'];
export const SAND_SCRUB = '#96a05c';

export const SEA = '#22689a';
export const SEA_TONES = ['#276fa1', '#1e6091'];
export const SWELL = 'rgba(255, 255, 255, 0.13)';
export const DECK_GREY = '#636a72';
export const HULL_SIDE = '#3c4249';

export function tracePolygon(g: Ctx, points: readonly Point[]): void {
  g.beginPath();
  points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  g.closePath();
}

export function insidePolygon(p: Point, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function sailboat(g: Ctx, x: number, y: number, angle: number, size: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = 'rgba(255, 255, 255, 0.22)';
  g.beginPath();
  g.moveTo(-size * 0.8, 0);
  g.lineTo(-size * 3.2, -size * 0.9);
  g.lineTo(-size * 3.2, size * 0.9);
  g.closePath();
  g.fill();
  g.fillStyle = '#e9e5da';
  g.beginPath();
  g.ellipse(0, 0, size, size * 0.38, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(size * 0.4, -size * 0.1);
  g.lineTo(-size * 0.8, -size * 1.1);
  g.lineTo(-size * 0.8, -size * 0.1);
  g.closePath();
  g.fill();
  g.restore();
}

export function jetty(g: Ctx, from: Point, to: Point): void {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  g.fillStyle = '#94744d';
  g.save();
  g.translate(from.x, from.y);
  g.rotate(Math.atan2(to.y - from.y, to.x - from.x));
  g.fillRect(-4, -2.5, length, 5);
  g.fillRect(length - 8, -8, 6, 16);
  g.restore();
}

export const DESERT_RUNWAY: RunwayStyle = {
  surface: '#55534f',
  shoulder: '#c9ab72',
  edge: 'rgba(244, 242, 236, 0.85)',
  center: 'rgba(244, 242, 236, 0.85)',
};
export const SAND = '#dcc088';
export const SAND_TONES = ['#e2c892', '#d5b77d'];
export const DUNE_LIT = 'rgba(255, 244, 214, 0.34)';
export const DUNE_SHADE = 'rgba(128, 90, 44, 0.13)';
export const PALMS = ['#4c7a38', '#58873c', '#436e32'];

export function palm(g: Ctx, rng: Rng, x: number, y: number, r: number): void {
  shadowed(g, r * 1.4, 0.22, () => {
    g.beginPath();
    g.arc(x, y, r * 0.8, 0, Math.PI * 2);
  });
  const fronds = 7;
  const turn = rng() * Math.PI;
  g.fillStyle = pick(rng, PALMS);
  for (let i = 0; i < fronds; i++) {
    const a = turn + (i / fronds) * Math.PI * 2;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.6, r * 0.2, a, 0, Math.PI * 2);
    g.fill();
  }
  disc(g, x, y, r * 0.18, '#86663e');
}

export const AIRFIELD_GRASS = '#94aa77';
export const RUNWAY_STRIP = 'rgba(255, 255, 255, 0.07)';
export const PERIMETER_TRACK = '#bdb79c';
export const FENCE = 'rgba(236, 238, 240, 0.75)';
export const BOUNDARY_HEDGE = 'rgba(46, 82, 38, 0.7)';
export const CARS = ['#d64545', '#3a6fb0', '#e8e8e8', '#2f3338', '#d9b23c', '#8a8f96'];


export function runwayStrip(g: Ctx, r: RunwayZone, half: number, beyond: number): void {
  g.save();
  g.translate(r.start.x, r.start.y);
  g.rotate((r.heading * Math.PI) / 180);
  g.fillStyle = RUNWAY_STRIP;
  g.fillRect(-beyond, -half, r.length + 2 * beyond, 2 * half);
  g.restore();
}

export function carPark(g: Ctx, rng: Rng, r: Rect): void {
  g.fillStyle = '#8f9297';
  g.fillRect(r.x, r.y, r.w, r.h);
  for (const y of [r.y + 2, r.y + r.h - 8]) {
    for (let x = r.x + 2; x < r.x + r.w - 4; x += 6) {
      g.fillStyle = 'rgba(244, 242, 236, 0.6)';
      g.fillRect(x, y, 0.8, 6);
      if (rng() < 0.6) {
        g.fillStyle = pick(rng, CARS);
        g.fillRect(x + 1.6, y + 0.8, 3, 4.6);
      }
    }
  }
}

export function along(points: readonly Point[], spacing: number, visit: (p: Point, normal: Point) => void): void {
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let d = carry;
    for (; d < len; d += spacing) visit({ x: a.x + ux * d, y: a.y + uy * d }, { x: -uy, y: ux });
    carry = d - len;
  }
}
