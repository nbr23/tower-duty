import type { MapDef } from '../config/maps';
import { directionFromHeading, type Aircraft } from './aircraft';
import { angleDiff, distance, headingDeg, type Polyline } from './geometry';
import { randomInt, type Rng } from './rng';
import { accepts, runwayFrame, type HelipadZone, type LandingZone, type RunwayZone, type World } from './world';

export const RUNWAY_CAPTURE_HALF_WIDTH = 10.5;
export const RUNWAY_CAPTURE_ANGLE = 10;
export const ZEPPELIN_STEER_FACTOR = 0.04;
export const HELIPAD_FADE_MS = 6000;
export const RUNWAY_FADE_MS = 1000;
export const TAXI_SCORE_LIMIT = 100;
export const TAXI_CHANCE = 0.1;
export const TOUCHDOWN_MS = 1200;

export function inRunwayCapture(zone: RunwayZone, a: Aircraft): boolean {
  const { along, lateral } = runwayFrame(zone, a.position);
  return (
    along >= 0 &&
    along <= zone.length &&
    Math.abs(lateral) <= RUNWAY_CAPTURE_HALF_WIDTH &&
    Math.abs(angleDiff(a.heading, zone.heading)) <= RUNWAY_CAPTURE_ANGLE
  );
}

export function inHelipadCapture(pad: HelipadZone, a: Aircraft): boolean {
  return distance(a.position, pad.center) <= pad.captureRadius;
}

function inCapture(zone: LandingZone, a: Aircraft): boolean {
  return zone.kind === 'runway' ? inRunwayCapture(zone, a) : inHelipadCapture(zone, a);
}

export function findCapture(world: World, a: Aircraft): LandingZone | null {
  for (const zone of [...world.runways, ...world.helipads]) {
    if (!inCapture(zone, a)) continue;
    if (accepts(zone, a.stripIndex)) return zone;
    if (a.target === zone) a.target = null;
  }
  return null;
}

export function steerZeppelin(a: Aircraft, map: MapDef): void {
  if (a.target?.kind !== 'helipad' || map.special?.stripIndex !== a.stripIndex) return;
  const center = a.target.center;
  const desired = headingDeg(a.position, center);
  const angleError = Math.abs(angleDiff(a.heading, desired));
  if (distance(a.position, center) / a.speed > angleError / (a.turnRate * ZEPPELIN_STEER_FACTOR)) return;
  a.heading = desired;
  a.velocityDir = directionFromHeading(desired);
  a.path = [{ ...center }];
}

export function chooseTaxi(rng: Rng, enabled: boolean, score: number, runway: RunwayZone): Polyline | null {
  if (!enabled || runway.taxiPaths.length === 0) return null;
  if (score >= TAXI_SCORE_LIMIT && rng() >= TAXI_CHANCE) return null;
  const path = runway.taxiPaths[randomInt(rng, runway.taxiPaths.length)]!;
  return path.map((p) => ({ ...p }));
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function altitude(a: Aircraft, clock: number): number {
  if (a.behaviour === 'flying') return 1;
  if (a.landedAt === undefined) return 0;
  const t = Math.max(0, Math.min(1, (clock - a.landedAt) / TOUCHDOWN_MS));
  return 1 - smoothstep(t);
}

export function fadeAlpha(a: Aircraft, clock: number): number {
  if (a.fadeAt === undefined || a.despawnAt === undefined || clock <= a.fadeAt) return 1;
  const span = a.despawnAt - a.fadeAt;
  return span <= 0 ? 0 : Math.max(0, (a.despawnAt - clock) / span);
}
