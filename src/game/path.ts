import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { Aircraft, PathPoint } from './aircraft';
import {
  angleDiff,
  distance,
  headingDeg,
  lerpPoint,
  pointToSegmentDistance,
  type Point,
} from './geometry';
import { accepts, runwayFrame, type HelipadZone, type RunwayZone, type World } from './world';

export const SUBDIVIDE_MAX = 90;
export const SUBDIVIDE_PIECES = 10;
export const MIN_SEGMENT = 4;
export const RUNWAY_SNAP_ANGLE = 80;
export const RUNWAY_SNAP_DISTANCE = 28;
export const RUNWAY_SNAP_LOOKBACK = 40;
export const RUNWAY_SNAP_BEFORE = 12;
export const RUNWAY_SNAP_AFTER = 40;
export const RUNWAY_SNAP_SAMPLE = 4;
const SNAP_EPSILON = 1e-7;

export type ExtendResult = 'appended' | 'dropped' | 'snapped';

export interface RunwaySnap {
  zone: RunwayZone;
  hit: Point;
}

export interface RunwayStroke {
  points: Point[];
  length: number;
}

export function createRunwayStroke(origin: Point): RunwayStroke {
  return { points: [{ ...origin }], length: 0 };
}

export function anchorOf(a: Aircraft): Point {
  return a.path[a.path.length - 1] ?? a.position;
}

export function clampToWorld(p: Point): Point {
  return {
    x: Math.min(WORLD_WIDTH, Math.max(0, p.x)),
    y: Math.min(WORLD_HEIGHT, Math.max(0, p.y)),
  };
}

export function shouldDrop(anchor: Point, p: Point): boolean {
  return distance(anchor, p) < MIN_SEGMENT;
}

export function subdivide(anchor: Point, p: Point, now: number): PathPoint[] {
  const pieces = Math.min(SUBDIVIDE_PIECES, Math.max(1, Math.ceil(distance(anchor, p) / SUBDIVIDE_MAX)));
  const points: PathPoint[] = [];
  for (let i = 1; i < pieces; i++) points.push({ ...lerpPoint(anchor, p, i / pieces), drawnAt: now });
  points.push({ x: p.x, y: p.y, drawnAt: now });
  return points;
}

export function snapHelipad(world: World, a: Aircraft, anchor: Point, p: Point): HelipadZone | null {
  return (
    world.helipads.find((pad) => {
      if (!accepts(pad, a.stripIndex)) return false;
      const d = pointToSegmentDistance(anchor, p, pad.center);
      return d <= pad.radius && d < distance(anchor, pad.center);
    }) ?? null
  );
}

function lookbackPoint(stroke: RunwayStroke, p: Point): Point {
  let remaining = RUNWAY_SNAP_LOOKBACK;
  let end = p;
  for (let i = stroke.points.length - 1; i >= 0; i--) {
    const pt = stroke.points[i]!;
    const length = distance(pt, end);
    if (length >= remaining) return lerpPoint(end, pt, remaining / length);
    remaining -= length;
    end = pt;
  }
  return end;
}

function entranceInterval(zone: RunwayZone, anchor: Point, p: Point): [number, number] | null {
  const from = runwayFrame(zone, anchor);
  const to = runwayFrame(zone, p);
  let entry = -Infinity;
  let exit = Infinity;
  for (const [start, end, low, high] of [
    [from.along, to.along, -RUNWAY_SNAP_BEFORE, Math.min(RUNWAY_SNAP_AFTER, zone.length)],
    [from.lateral, to.lateral, -RUNWAY_SNAP_DISTANCE, RUNWAY_SNAP_DISTANCE],
  ] as const) {
    const delta = end - start;
    if (Math.abs(delta) <= SNAP_EPSILON) {
      if (start < low - SNAP_EPSILON || start > high + SNAP_EPSILON) return null;
      continue;
    }
    const a = (low - start) / delta;
    const b = (high - start) / delta;
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
  }
  if (entry > exit + SNAP_EPSILON || exit < -SNAP_EPSILON || entry > 1 + SNAP_EPSILON) return null;
  return [entry, exit];
}

function recordStroke(stroke: RunwayStroke, p: Point): void {
  const length = distance(stroke.points[stroke.points.length - 1]!, p);
  if (length <= SNAP_EPSILON) return;
  stroke.length += length;
  stroke.points.push(p);
  let retained = 0;
  for (let i = stroke.points.length - 2; i >= 0; i--) {
    retained += distance(stroke.points[i]!, stroke.points[i + 1]!);
    if (retained >= RUNWAY_SNAP_LOOKBACK) {
      stroke.points.splice(0, i);
      break;
    }
  }
}

export function snapRunway(
  world: World,
  stripIndex: number,
  stroke: RunwayStroke,
  p: Point,
  final = false,
): RunwaySnap | null {
  const anchor = stroke.points[stroke.points.length - 1]!;
  const length = distance(anchor, p);
  const from = length > SNAP_EPSILON ? anchor : stroke.points[stroke.points.length - 2];
  if (from === undefined) return null;
  const samples: number[] = [];
  if (length > SNAP_EPSILON) {
    const first = (Math.floor((stroke.length + SNAP_EPSILON) / RUNWAY_SNAP_SAMPLE) + 1) * RUNWAY_SNAP_SAMPLE;
    for (let at = first; at <= stroke.length + length + SNAP_EPSILON; at += RUNWAY_SNAP_SAMPLE) {
      samples.push((at - stroke.length) / length);
    }
  }
  if (final) samples.push(1);
  let best: RunwaySnap | null = null;
  let bestT = Infinity;
  for (const zone of world.runways) {
    if (!accepts(zone, stripIndex)) continue;
    if (runwayFrame(zone, p).along <= runwayFrame(zone, from).along + SNAP_EPSILON) continue;
    const interval = entranceInterval(zone, anchor, p);
    if (interval === null) continue;
    const [entry, exit] = interval;
    const candidates = [...samples, entry, exit].sort((a, b) => a - b);
    for (const t of candidates) {
      if (!Number.isFinite(t) || t < -SNAP_EPSILON || t > 1 + SNAP_EPSILON || t >= bestT) continue;
      if (t < entry - SNAP_EPSILON || t > exit + SNAP_EPSILON) continue;
      const hit = lerpPoint(anchor, p, Math.max(0, Math.min(1, t)));
      const back = lookbackPoint(stroke, hit);
      if (distance(back, hit) <= SNAP_EPSILON) continue;
      if (Math.abs(angleDiff(zone.heading, headingDeg(back, hit))) > RUNWAY_SNAP_ANGLE + SNAP_EPSILON) continue;
      best = { zone, hit };
      bestT = t;
      break;
    }
  }
  return best;
}

export function extendPath(
  world: World,
  a: Aircraft,
  input: Point,
  now: number,
  stroke: RunwayStroke,
  final = false,
): ExtendResult {
  const p = clampToWorld(input);
  const anchor = anchorOf(a);

  const pad = snapHelipad(world, a, anchor, p);
  if (pad !== null) {
    a.path.push(...subdivide(anchor, pad.center, now));
    a.target = pad;
    return 'snapped';
  }

  const runway = snapRunway(world, a.stripIndex, stroke, p, final);
  recordStroke(stroke, p);
  if (runway !== null) {
    const { zone, hit } = runway;
    const along = Math.max(0, Math.min(zone.length, runwayFrame(zone, hit).along));
    const join = lerpPoint(zone.start, zone.end, along / zone.length);
    if (distance(anchor, join) > SNAP_EPSILON) a.path.push(...subdivide(anchor, join, now));
    a.path.push({ x: zone.end.x, y: zone.end.y, drawnAt: now });
    a.target = zone;
    return 'snapped';
  }

  if (shouldDrop(anchor, p)) return 'dropped';
  a.path.push(...subdivide(anchor, p, now));
  return 'appended';
}
