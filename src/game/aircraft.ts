import type { MapDef } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { Point } from './geometry';
import type { LandingZone } from './world';

export const SPEED_FACTOR = 0.015;
export const DEFAULT_TURN_RATE = 10;

export interface PathPoint extends Point {
  drawnAt?: number;
}

export type AircraftBehaviour = 'flying' | 'landing' | 'taxiing' | 'parked';

export interface AircraftFlags {
  crashed: boolean;
  landedLocked: boolean;
  active: boolean;
  danger: boolean;
  selectable: boolean;
  entering: boolean;
  dragged: boolean;
}

export interface Aircraft {
  stripIndex: number;
  type: number;
  variant: number;
  cameo?: string;
  position: Point;
  velocityDir: Point;
  heading: number;
  speed: number;
  radius: number;
  turnRate: number;
  path: PathPoint[];
  target: LandingZone | null;
  trail: Point[];
  behaviour: AircraftBehaviour;
  flags: AircraftFlags;
  landedAt?: number;
  fadeAt?: number;
  despawnAt?: number;
}

export function directionFromHeading(heading: number): Point {
  const angle = (heading * Math.PI) / 180;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function createAircraft(
  map: MapDef,
  stripIndex: number,
  position: Point,
  heading: number,
  variant = 0,
): Aircraft {
  const strip = map.strips[stripIndex];
  if (strip === undefined) throw new Error(`${map.id}: no strip ${stripIndex}`);
  return {
    stripIndex,
    type: strip.type,
    variant,
    position: { ...position },
    velocityDir: directionFromHeading(heading),
    heading,
    speed: SPEED_FACTOR * strip.speed * (map.worldScale ?? 1),
    radius: strip.radius,
    turnRate: strip.turnRate ?? DEFAULT_TURN_RATE,
    path: [],
    target: null,
    trail: [],
    behaviour: 'flying',
    flags: {
      crashed: false,
      landedLocked: false,
      active: true,
      danger: false,
      selectable: false,
      entering: true,
      dragged: false,
    },
  };
}

export function isAirborne(a: Aircraft): boolean {
  return a.flags.active && !a.flags.crashed && a.behaviour === 'flying';
}

export function fullyInside(a: Aircraft): boolean {
  const { x, y } = a.position;
  const r = a.radius;
  return x >= r && x <= WORLD_WIDTH - r && y >= r && y <= WORLD_HEIGHT - r;
}
