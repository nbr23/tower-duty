import type { FlockDef, MapDef } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { directionFromHeading, isAirborne, SPEED_FACTOR, type Aircraft } from './aircraft';
import { WARNING_MARGIN, worldSlots } from './collision';
import { distance, headingDeg, lerpPoint, type Point, type Polyline } from './geometry';
import { mulberry32, type Rng } from './rng';
import { CENTER, PERIMETER, perimeterPoint, SPAWN_OFFSET } from './spawn';

const FLOCK_SEED_SALT = 0x27d4eb2f;
export const SCATTER_MS = 1200;
const ROUTE_SAMPLES = 48;
const START_CANDIDATES = 4;
const OPPOSITE_JITTER = 0.12;
const BEND = { x: WORLD_WIDTH * 0.28, y: WORLD_HEIGHT * 0.28 };

export interface Flock {
  route: Polyline;
  length: number;
  travelled: number;
  position: Point;
  heading: number;
  velocityDir: Point;
  speed: number;
  radius: number;
  birds: number;
  seed: number;
  danger: boolean;
  struckAt?: number;
}

export interface FlockState {
  def?: FlockDef;
  speed: number;
  rng: Rng;
  nextAt?: number;
  list: Flock[];
}

export interface FlockHits {
  danger: Set<Aircraft>;
  alarmed: Set<Flock>;
  strikes: [Aircraft, Flock][];
}

export function createFlocks(map: MapDef, seed: number): FlockState {
  const def = map.flocks;
  return {
    def,
    speed: SPEED_FACTOR * (def?.speed ?? 0) * (map.worldScale ?? 1),
    rng: mulberry32(seed ^ FLOCK_SEED_SALT),
    list: [],
  };
}

function outside(t: number, margin: number): Point {
  const { point, normal } = perimeterPoint(t);
  return { x: point.x + normal.x * margin, y: point.y + normal.y * margin };
}

function quadratic(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function routeLength(route: Polyline): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += distance(route[i - 1]!, route[i]!);
  return total;
}

function startFarthestFrom(rng: Rng, aircraft: readonly Aircraft[], margin: number): number {
  const live = aircraft.filter(isAirborne);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < START_CANDIDATES; i++) {
    const t = rng() * PERIMETER;
    const p = outside(t, margin);
    const score = Math.min(Infinity, ...live.map((a) => distance(p, a.position)));
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function flockRoute(rng: Rng, radius: number, aircraft: readonly Aircraft[] = []): Polyline {
  const margin = SPAWN_OFFSET + radius;
  const t = startFarthestFrom(rng, aircraft, margin);
  const from = outside(t, margin);
  const to = outside(t + PERIMETER * (0.5 + (rng() * 2 - 1) * OPPOSITE_JITTER), margin);
  const bend = { x: CENTER.x + (rng() * 2 - 1) * BEND.x, y: CENTER.y + (rng() * 2 - 1) * BEND.y };
  return Array.from({ length: ROUTE_SAMPLES + 1 }, (_, i) => quadratic(from, bend, to, i / ROUTE_SAMPLES));
}

export function moveFlock(f: Flock, dt: number): void {
  f.travelled = Math.min(f.length, f.travelled + f.speed * dt);
  let rest = f.travelled;
  for (let i = 1; i < f.route.length; i++) {
    const a = f.route[i - 1]!;
    const b = f.route[i]!;
    const seg = distance(a, b);
    if (rest <= seg || i === f.route.length - 1) {
      f.position = lerpPoint(a, b, seg === 0 ? 1 : Math.min(1, rest / seg));
      f.heading = headingDeg(a, b);
      f.velocityDir = directionFromHeading(f.heading);
      return;
    }
    rest -= seg;
  }
}

function spawnFlock(state: FlockState, def: FlockDef, aircraft: readonly Aircraft[]): Flock {
  const route = flockRoute(state.rng, def.radius, aircraft);
  const flock: Flock = {
    route,
    length: routeLength(route),
    travelled: 0,
    position: { ...route[0]! },
    heading: 0,
    velocityDir: { x: 1, y: 0 },
    speed: state.speed,
    radius: def.radius,
    birds: def.birds,
    seed: Math.floor(state.rng() * 0x7fffffff),
    danger: false,
  };
  moveFlock(flock, 0);
  return flock;
}

function nextGap(state: FlockState, [min, max]: FlockDef['gap']): number {
  return min + state.rng() * (max - min);
}

export function isActive(f: Flock): boolean {
  return f.struckAt === undefined;
}

export function tickFlocks(
  state: FlockState,
  clock: number,
  dt: number,
  level: number,
  aircraft: readonly Aircraft[],
  spawning: boolean,
): boolean {
  for (const f of state.list) moveFlock(f, dt);
  state.list = state.list.filter(
    (f) => f.travelled < f.length && (f.struckAt === undefined || clock < f.struckAt + SCATTER_MS),
  );
  const { def } = state;
  if (def === undefined || !spawning || level < def.fromLevel) return false;
  if (state.nextAt === undefined) {
    state.nextAt = clock + nextGap(state, def.gap) / 2;
    return false;
  }
  if (clock < state.nextAt || state.list.filter(isActive).length >= def.maxActive) return false;
  state.list.push(spawnFlock(state, def, aircraft));
  state.nextAt = clock + nextGap(state, def.gap);
  return true;
}

export function overWorld(f: Flock): boolean {
  const { x, y } = f.position;
  return x >= -f.radius && x <= WORLD_WIDTH + f.radius && y >= -f.radius && y <= WORLD_HEIGHT + f.radius;
}

export function flockHits(map: MapDef, aircraft: readonly Aircraft[], flocks: readonly Flock[]): FlockHits {
  const hits: FlockHits = { danger: new Set(), alarmed: new Set(), strikes: [] };
  const live = flocks.filter((f) => isActive(f) && overWorld(f));
  for (const a of aircraft) {
    if (!isAirborne(a)) continue;
    for (const f of live) {
      const gap = distance(a.position, f.position);
      if (gap >= WARNING_MARGIN + a.radius + f.radius) continue;
      hits.danger.add(a);
      hits.alarmed.add(f);
      const touching = gap <= a.radius + f.radius && worldSlots(map, a).some((c) => distance(c.center, f.position) <= c.r + f.radius);
      if (touching) hits.strikes.push([a, f]);
    }
  }
  return hits;
}
