import type { MapDef } from '../config/maps';
import { isAirborne, type Aircraft } from './aircraft';
import { distance, type Point } from './geometry';

export const WARNING_MARGIN = (25 / 320) * 480;
export const WARNING_THROTTLE_MS = 1500;
export const CRASH_GRACE_MS = 500;
export const CRASH_GRACE_NEAR_BEST_MS = 4000;
export const NEAR_BEST_POINTS = 100;

export interface Circle {
  center: Point;
  r: number;
}

export interface Collisions {
  danger: Set<Aircraft>;
  crashes: [Aircraft, Aircraft][];
}

export function worldSlots(map: MapDef, a: Aircraft): Circle[] {
  const strip = map.strips[a.stripIndex];
  const slots = strip?.parkSlots ?? [{ cx: 0, cy: 0, r: a.radius }];
  const scale = strip?.parkSlotScale ?? 1;
  const angle = (a.heading * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return slots.map(({ cx, cy, r }) => ({
    center: {
      x: a.position.x + (cx * cos - cy * sin) * scale,
      y: a.position.y + (cx * sin + cy * cos) * scale,
    },
    r: r * scale,
  }));
}

export function inWarning(a: Aircraft, b: Aircraft): boolean {
  return distance(a.position, b.position) < WARNING_MARGIN + a.radius + b.radius;
}

export function slotsOverlap(map: MapDef, a: Aircraft, b: Aircraft): boolean {
  const slotsB = worldSlots(map, b);
  return worldSlots(map, a).some((ca) => slotsB.some((cb) => distance(ca.center, cb.center) <= ca.r + cb.r));
}

export function isGrounded(a: Aircraft): boolean {
  return a.flags.active && !a.flags.crashed && a.flags.landedLocked && a.behaviour !== 'flying';
}

export function inParkedWarning(map: MapDef, margin: number, a: Aircraft, b: Aircraft): boolean {
  return distance(a.position, b.position) < margin + a.radius + b.radius && slotsOverlap(map, a, b);
}

function parkedDanger(map: MapDef, aircraft: readonly Aircraft[], danger: Set<Aircraft>): void {
  const margin = map.parkedWarningMargin;
  if (margin === undefined) return;
  const grounded = aircraft.filter(isGrounded);
  for (let i = 0; i < grounded.length; i++) {
    for (let j = i + 1; j < grounded.length; j++) {
      const a = grounded[i]!;
      const b = grounded[j]!;
      if (!inParkedWarning(map, margin, a, b)) continue;
      danger.add(a);
      danger.add(b);
    }
  }
}

export function inCrash(map: MapDef, a: Aircraft, b: Aircraft): boolean {
  return distance(a.position, b.position) <= a.radius + b.radius && slotsOverlap(map, a, b);
}

export function graceMs(score: number, personalBest: number): number {
  return personalBest > 0 && score >= personalBest - NEAR_BEST_POINTS ? CRASH_GRACE_NEAR_BEST_MS : CRASH_GRACE_MS;
}

export function detectCollisions(map: MapDef, aircraft: readonly Aircraft[]): Collisions {
  const live = aircraft.filter(isAirborne);
  const danger = new Set<Aircraft>();
  const crashes: [Aircraft, Aircraft][] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]!;
      const b = live[j]!;
      if (!inWarning(a, b)) continue;
      danger.add(a);
      danger.add(b);
      if (inCrash(map, a, b)) crashes.push([a, b]);
    }
  }
  parkedDanger(map, aircraft, danger);
  return { danger, crashes };
}
