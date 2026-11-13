import { VIEW } from '../config/world';
import type { Point } from '../game/geometry';
import type { Rng } from '../game/rng';
import type { HelipadZone, RunwayZone, World } from '../game/world';

export type Ctx = CanvasRenderingContext2D;

export interface Scene {
  world: World;
  rng: Rng;
}

export const RUNWAY_HALF_WIDTH = 11;
export const RUNWAY_OVERRUN = 8;
export const TAXI_HALF_WIDTH = 9;
const SHADOW = { x: 0.35, y: 0.45 };
const INK = '17, 21, 26';
const LIT = 'rgba(255, 255, 255, 0.16)';

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function fillView(g: Ctx, style: string | CanvasGradient): void {
  g.fillStyle = style;
  g.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
}

export function randomPoint(rng: Rng): Point {
  return { x: between(rng, VIEW.x, VIEW.x + VIEW.w), y: between(rng, VIEW.y, VIEW.y + VIEW.h) };
}

export function smoothPath(g: Ctx, points: readonly Point[], closed: boolean): void {
  g.beginPath();
  const n = points.length;
  if (n < 2) return;
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (closed) {
    const start = mid(points[n - 1]!, points[0]!);
    g.moveTo(start.x, start.y);
    for (let i = 0; i < n; i++) {
      const p = points[i]!;
      const m = mid(p, points[(i + 1) % n]!);
      g.quadraticCurveTo(p.x, p.y, m.x, m.y);
    }
    g.closePath();
    return;
  }
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < n - 1; i++) {
    const p = points[i]!;
    const m = mid(p, points[i + 1]!);
    g.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  g.lineTo(points[n - 1]!.x, points[n - 1]!.y);
}

export function smoothPoints(points: readonly Point[], steps = 8): Point[] {
  const n = points.length;
  if (n < 3) return [...points];
  const out: Point[] = [points[0]!];
  let from = points[0]!;
  for (let i = 1; i < n - 1; i++) {
    const c = points[i]!;
    const next = points[i + 1]!;
    const to = { x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 };
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push({ x: u * u * from.x + 2 * u * t * c.x + t * t * to.x, y: u * u * from.y + 2 * u * t * c.y + t * t * to.y });
    }
    from = to;
  }
  out.push(points[n - 1]!);
  return out;
}

export function wobblyBlob(rng: Rng, center: Point, rx: number, ry: number, wobble: number, count = 18): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const k = 1 + between(rng, -wobble, wobble);
    return { x: center.x + Math.cos(angle) * rx * k, y: center.y + Math.sin(angle) * ry * k };
  });
}

export function strokeLine(g: Ctx, points: readonly Point[], width: number, color: string, smooth = true): void {
  g.lineWidth = width;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (smooth) smoothPath(g, points, false);
  else {
    g.beginPath();
    points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  }
  g.stroke();
}

export function shadowed(g: Ctx, height: number, alpha: number, trace: () => void): void {
  const t = g.getTransform();
  const k = Math.hypot(t.a, t.b) || 1;
  const cos = t.a / k;
  const sin = t.b / k;
  const x = height * SHADOW.x;
  const y = height * SHADOW.y;
  g.save();
  g.translate(x * cos + y * sin, y * cos - x * sin);
  trace();
  g.fillStyle = `rgba(${INK}, ${alpha})`;
  g.fill();
  g.restore();
}

export function disc(g: Ctx, x: number, y: number, r: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

export function tree(g: Ctx, rng: Rng, x: number, y: number, r: number, colors: readonly string[]): void {
  shadowed(g, r, 0.22, () => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
  });
  disc(g, x, y, r, pick(rng, colors));
  disc(g, x - r * 0.24, y - r * 0.28, r * 0.65, LIT);
  disc(g, x + r * 0.32, y + r * 0.12, r * 0.4, 'rgba(17, 40, 22, 0.12)');
}

export function building(g: Ctx, x: number, y: number, w: number, h: number, roof: string, height = 6): void {
  shadowed(g, height, 0.26, () => {
    g.beginPath();
    g.rect(x, y, w, h);
  });
  g.fillStyle = roof;
  g.fillRect(x, y, w, h);
  g.fillStyle = LIT;
  if (w >= h) g.fillRect(x, y, w, h / 2);
  else g.fillRect(x, y, w / 2, h);
  g.strokeStyle = 'rgba(17, 21, 26, 0.18)';
  g.lineWidth = 0.6;
  g.strokeRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6);
  g.fillStyle = 'rgba(17, 21, 26, 0.16)';
  if (w >= h) g.fillRect(x + 1, y + h / 2, w - 2, 0.7);
  else g.fillRect(x + w / 2, y + 1, 0.7, h - 2);
  if (w > 24 && h > 12) {
    g.fillStyle = 'rgba(210, 226, 230, 0.3)';
    for (let u = x + 6; u < x + w - 5; u += 12) g.fillRect(u, y + 3, 5, 2);
  }
}

export function scaled(points: readonly Point[], center: Point, kx: number, ky = kx): Point[] {
  return points.map((p) => ({ x: center.x + (p.x - center.x) * kx, y: center.y + (p.y - center.y) * ky }));
}

export function patches(
  g: Ctx,
  rng: Rng,
  colors: readonly string[],
  count: number,
  size: readonly [number, number],
  ok: (p: Point) => boolean = () => true,
): void {
  for (const p of scatter(rng, count, ok)) {
    const rx = between(rng, size[0], size[1]);
    smoothPath(g, wobblyBlob(rng, p, rx, rx * between(rng, 0.3, 0.55), 0.16, 12), true);
    g.fillStyle = pick(rng, colors);
    g.fill();
  }
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function polylineDistance(p: Point, points: readonly Point[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, segmentDistance(p, points[i - 1]!, points[i]!));
  return best;
}

function runwayAxis(r: RunwayZone): [Point, Point] {
  const ux = (r.end.x - r.start.x) / r.length;
  const uy = (r.end.y - r.start.y) / r.length;
  const pad = RUNWAY_OVERRUN + 6;
  return [
    { x: r.start.x - ux * pad, y: r.start.y - uy * pad },
    { x: r.end.x + ux * pad, y: r.end.y + uy * pad },
  ];
}

export function taxiRoutes(r: RunwayZone): Point[][] {
  return r.taxiPaths.map((path) => [r.end, ...path]);
}

export function zoneClear(world: World, p: Point, margin: number): boolean {
  for (const r of world.runways) {
    if (polylineDistance(p, runwayAxis(r)) < RUNWAY_HALF_WIDTH + margin) return false;
    for (const route of taxiRoutes(r)) if (polylineDistance(p, route) < TAXI_HALF_WIDTH + 6 + margin) return false;
  }
  for (const h of world.helipads) if (Math.hypot(p.x - h.center.x, p.y - h.center.y) < padHalf(h) * 1.45 + margin) return false;
  return true;
}

export function scatter(rng: Rng, count: number, ok: (p: Point) => boolean, attempts = count * 20): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < attempts && out.length < count; i++) {
    const p = randomPoint(rng);
    if (ok(p)) out.push(p);
  }
  return out;
}

export interface RunwayLights {
  edge: string;
  threshold: string;
  end: string;
  approach: string;
}

export interface RunwayStyle {
  surface: string;
  shoulder?: string;
  edge: string;
  center: string;
  markers?: boolean;
  lights?: RunwayLights;
}

export const ASPHALT: RunwayStyle = {
  surface: '#454a52',
  edge: 'rgba(244, 242, 236, 0.85)',
  center: 'rgba(244, 242, 236, 0.85)',
};

export function glow(g: Ctx, x: number, y: number, color: string, core: number, halo = core * 2.6): void {
  g.fillStyle = color;
  g.globalAlpha = 0.3;
  g.beginPath();
  g.arc(x, y, halo, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(x, y, core, 0, Math.PI * 2);
  g.fill();
}

function runwayLights(g: Ctx, len: number, lights: RunwayLights): void {
  const hw = RUNWAY_HALF_WIDTH;
  for (let x = 0; x <= len; x += 16) {
    glow(g, x, -hw - 1, lights.edge, 1);
    glow(g, x, hw + 1, lights.edge, 1);
  }
  for (let y = -hw + 2; y <= hw - 2; y += 4) {
    glow(g, -RUNWAY_OVERRUN + 1, y, lights.threshold, 1);
    glow(g, len + RUNWAY_OVERRUN - 1, y, lights.end, 1);
  }
  for (let x = -RUNWAY_OVERRUN - 10; x >= -RUNWAY_OVERRUN - 70; x -= 12) {
    glow(g, x, 0, lights.approach, 1.1);
    if (x > -RUNWAY_OVERRUN - 40) {
      glow(g, x, -6, lights.approach, 0.9);
      glow(g, x, 6, lights.approach, 0.9);
    }
  }
}

export function runway(g: Ctx, r: RunwayZone, style: RunwayStyle = ASPHALT): void {
  const hw = RUNWAY_HALF_WIDTH;
  const len = r.length;
  g.save();
  g.translate(r.start.x, r.start.y);
  g.rotate((r.heading * Math.PI) / 180);
  if (style.shoulder !== undefined) {
    g.fillStyle = style.shoulder;
    g.beginPath();
    g.roundRect(-RUNWAY_OVERRUN - 4, -hw - 4, len + 2 * RUNWAY_OVERRUN + 8, 2 * hw + 8, 5);
    g.fill();
  }
  g.fillStyle = style.surface;
  g.beginPath();
  g.roundRect(-RUNWAY_OVERRUN, -hw, len + 2 * RUNWAY_OVERRUN, 2 * hw, 2.5);
  g.fill();

  if (style.markers) {
    g.fillStyle = style.edge;
    for (let x = 0; x <= len; x += 18) {
      g.fillRect(x - 1.5, -hw - 1.5, 3, 3);
      g.fillRect(x - 1.5, hw - 1.5, 3, 3);
    }
    g.beginPath();
    g.moveTo(2, -hw + 3);
    g.lineTo(10, 0);
    g.lineTo(2, hw - 3);
    g.strokeStyle = style.edge;
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
    g.restore();
    return;
  }

  g.fillStyle = style.edge;
  const bar = (2 * hw - 6) / 7;
  for (let i = 0; i < 4; i++) g.fillRect(2, -hw + 3 + i * 2 * bar, 9, bar);
  g.fillStyle = style.center;
  for (let x = 20; x < len - 8; x += 18) g.fillRect(x, -0.9, 9, 1.8);
  if (style.lights !== undefined) runwayLights(g, len, style.lights);
  g.restore();
}

export function taxiway(g: Ctx, r: RunwayZone, surface: string): void {
  for (const route of taxiRoutes(r)) strokeLine(g, route, TAXI_HALF_WIDTH * 2, surface, false);
  g.fillStyle = 'rgba(244, 242, 236, 0.8)';
  for (const path of r.taxiPaths) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    if (last === undefined || prev === undefined) continue;
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    g.save();
    g.translate(last.x, last.y);
    g.rotate(angle);
    g.fillRect(6, -5, 1.5, 10);
    g.restore();
  }
}

export function taxiMarkings(g: Ctx, paths: readonly (readonly Point[])[]): void {
  g.save();
  g.strokeStyle = '#c6b675';
  g.lineWidth = 0.8;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  for (const path of paths) {
    path.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
  }
  g.stroke();
  g.restore();
}

export function padHalf(pad: HelipadZone): number {
  return pad.radius + 5;
}

export function helipad(g: Ctx, pad: HelipadZone, surface = '#a3a7ab', marking = 'rgba(244, 242, 236, 0.85)'): void {
  const half = padHalf(pad);
  const { x, y } = pad.center;
  shadowed(g, 2, 0.22, () => {
    g.beginPath();
    g.roundRect(x - half, y - half, half * 2, half * 2, 4);
  });
  g.fillStyle = surface;
  g.beginPath();
  g.roundRect(x - half, y - half, half * 2, half * 2, 4);
  g.fill();
  g.strokeStyle = marking;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, y, pad.radius + 1, 0, Math.PI * 2);
  g.stroke();
}
