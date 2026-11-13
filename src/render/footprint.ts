import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { distance, type Point } from '../game/geometry';
import { runwayFrame, type RunwayZone, type World } from '../game/world';
import { RUNWAY_HALF_WIDTH, RUNWAY_OVERRUN, TAXI_HALF_WIDTH, padHalf, polylineDistance, taxiRoutes } from './art';

export const MIN_GAP = 12;
export const MIN_EDGE = 28;
export const MIN_RUNWAY = 100;
export const RUNWAY_PER_RADIUS = 4.5;
export const MIN_STAND_SPACING = 34;
const SAMPLE_STEP = 3;

export interface Footprint {
  id: string;
  runway?: number;
  taxi?: boolean;
  outline: Point[][];
  distance(p: Point): number;
}

function sampled(points: readonly Point[], closed: boolean): Point[] {
  const out: Point[] = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const steps = Math.max(1, Math.ceil(distance(a, b) / SAMPLE_STEP));
    for (let s = 0; s < steps; s++) out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
  }
  if (!closed) out.push(points[points.length - 1]!);
  return out;
}

function slab(r: RunwayZone): Point[] {
  const ux = (r.end.x - r.start.x) / r.length;
  const uy = (r.end.y - r.start.y) / r.length;
  const corner = (along: number, lateral: number): Point => ({
    x: r.start.x + ux * along - uy * lateral,
    y: r.start.y + uy * along + ux * lateral,
  });
  return [
    corner(-RUNWAY_OVERRUN, -RUNWAY_HALF_WIDTH),
    corner(r.length + RUNWAY_OVERRUN, -RUNWAY_HALF_WIDTH),
    corner(r.length + RUNWAY_OVERRUN, RUNWAY_HALF_WIDTH),
    corner(-RUNWAY_OVERRUN, RUNWAY_HALF_WIDTH),
  ];
}

function slabDistance(r: RunwayZone, p: Point): number {
  const { along, lateral } = runwayFrame(r, p);
  const dx = Math.max(-RUNWAY_OVERRUN - along, 0, along - r.length - RUNWAY_OVERRUN);
  const dy = Math.max(Math.abs(lateral) - RUNWAY_HALF_WIDTH, 0);
  return Math.hypot(dx, dy);
}

function offsetRoute(route: readonly Point[], offset: number): Point[] {
  return route.map((p, i) => {
    const a = route[Math.max(0, i - 1)]!;
    const b = route[Math.min(route.length - 1, i + 1)]!;
    const len = distance(a, b) || 1;
    return { x: p.x - ((b.y - a.y) / len) * offset, y: p.y + ((b.x - a.x) / len) * offset };
  });
}

export function footprints(world: World): Footprint[] {
  const out: Footprint[] = [];
  world.runways.forEach((r, i) => {
    out.push({ id: `R${i + 1}`, runway: i, outline: [[...slab(r), slab(r)[0]!]], distance: (p) => slabDistance(r, p) });
    const routes = taxiRoutes(r);
    if (routes.length === 0) return;
    out.push({
      id: `R${i + 1} taxi`,
      runway: i,
      taxi: true,
      outline: routes.flatMap((route) => [offsetRoute(route, TAXI_HALF_WIDTH), offsetRoute(route, -TAXI_HALF_WIDTH)]),
      distance: (p) => Math.max(0, Math.min(...routes.map((route) => polylineDistance(p, route))) - TAXI_HALF_WIDTH),
    });
  });
  world.helipads.forEach((h, i) => {
    const half = padHalf(h);
    const { x, y } = h.center;
    out.push({
      id: `H${i + 1}`,
      outline: [
        [
          { x: x - half, y: y - half },
          { x: x + half, y: y - half },
          { x: x + half, y: y + half },
          { x: x - half, y: y + half },
          { x: x - half, y: y - half },
        ],
      ],
      distance: (p) => Math.hypot(Math.max(Math.abs(p.x - x) - half, 0), Math.max(Math.abs(p.y - y) - half, 0)),
    });
  });
  return out;
}

function related(a: Footprint, b: Footprint): boolean {
  if (a.taxi && b.taxi) return true;
  return (a.taxi || b.taxi) === true && a.runway !== undefined && a.runway === b.runway;
}

function stands(world: World): Point[] {
  const out: Point[] = [];
  for (const r of world.runways) {
    for (const path of r.taxiPaths) {
      const last = path[path.length - 1];
      if (last !== undefined && out.every((p) => distance(p, last) > 1)) out.push(last);
    }
  }
  return out;
}

export function layoutIssues(world: World): string[] {
  const issues: string[] = [];
  const shapes = footprints(world).map((f) => ({ f, points: f.outline.flatMap((line) => sampled(line, false)) }));

  for (let i = 0; i < shapes.length; i++) {
    const a = shapes[i]!;
    const edge = Math.min(...a.points.map((p) => Math.min(p.x, p.y, WORLD_WIDTH - p.x, WORLD_HEIGHT - p.y)));
    if (edge < MIN_EDGE) issues.push(`${a.f.id} is ${edge.toFixed(0)} from the edge (min ${MIN_EDGE})`);
    for (let j = i + 1; j < shapes.length; j++) {
      const b = shapes[j]!;
      if (related(a.f, b.f)) continue;
      const gap = Math.min(...a.points.map((p) => b.f.distance(p)), ...b.points.map((p) => a.f.distance(p)));
      if (gap < MIN_GAP) issues.push(`${a.f.id} to ${b.f.id} gap ${gap.toFixed(0)} (min ${MIN_GAP})`);
    }
  }

  world.runways.forEach((r, i) => {
    const largest = Math.max(0, ...[...r.filter].map((s) => world.map.strips[s]?.radius ?? 0));
    const need = Math.max(MIN_RUNWAY, RUNWAY_PER_RADIUS * largest);
    if (r.length < need) issues.push(`R${i + 1} is ${r.length.toFixed(0)} long (min ${need.toFixed(0)})`);
  });

  const parking = stands(world);
  for (let i = 0; i < parking.length; i++) {
    for (let j = i + 1; j < parking.length; j++) {
      const d = distance(parking[i]!, parking[j]!);
      if (d < MIN_STAND_SPACING - 0.5) issues.push(`stands ${i + 1} and ${j + 1} are ${d.toFixed(0)} apart (min ${MIN_STAND_SPACING})`);
    }
  }
  return issues;
}
