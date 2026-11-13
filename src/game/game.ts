import type { MapDef } from '../config/maps';
import { isAirborne, type Aircraft } from './aircraft';
import { detectCollisions, graceMs, WARNING_THROTTLE_MS } from './collision';
import { chooseTaxi, findCapture, HELIPAD_FADE_MS, RUNWAY_FADE_MS, steerZeppelin } from './landing';
import { lerpPoint, type Point } from './geometry';
import { advance, bounceOffEdges, followPath, recordTrail } from './movement';
import { mulberry32, type Rng } from './rng';
import { createDirector, tickSpawn, type SpawnDirector, type SpawnEvent } from './spawn';
import { buildWorld, type LandingZone, type World } from './world';

export const FAST_FORWARD_SCALE = 2;
const LANDING_SEED_SALT = 0x9e3779b9;
const CAMEO_SEED_SALT = 0x85ebca6b;

export type GameEventName = SpawnEvent | 'plane' | 'runway' | 'landed' | 'proximity_warning' | 'crashland';

export interface GameEvent {
  name: GameEventName;
  at: number;
}

export interface Crash {
  at: Point;
  time: number;
}

export interface Game {
  world: World;
  director: SpawnDirector;
  aircraft: Aircraft[];
  clock: number;
  fastForward: boolean;
  seed: number;
  rng: Rng;
  score: number;
  taxi: boolean;
  personalBest: number;
  lastWarningAt: number;
  crashes: Crash[];
  crashedAt?: number;
  gameOverAt?: number;
  gameOver: boolean;
  flightTimeMs: number;
  maxInAir: number;
  events: GameEvent[];
  lastEvent?: GameEvent;
}

export interface GameOptions {
  personalBest?: number;
  taxi?: boolean;
  fastForward?: boolean;
}

export function createGame(
  map: MapDef,
  seed: number,
  { personalBest = 0, taxi = true, fastForward = false }: GameOptions = {},
): Game {
  return {
    world: buildWorld(map),
    director: createDirector(map, mulberry32(seed), personalBest, mulberry32(seed ^ CAMEO_SEED_SALT)),
    aircraft: [],
    clock: 0,
    fastForward,
    seed,
    rng: mulberry32(seed ^ LANDING_SEED_SALT),
    score: 0,
    taxi,
    personalBest,
    lastWarningAt: -Infinity,
    crashes: [],
    gameOver: false,
    flightTimeMs: 0,
    maxInAir: 0,
    events: [],
  };
}

export function updateGame(game: Game, dt: number): void {
  const scaled = dt * (game.fastForward ? FAST_FORWARD_SCALE : 1);
  game.clock += scaled;
  if (game.gameOver) return;
  game.flightTimeMs += dt;

  if (game.crashedAt === undefined) {
    const spawned = tickSpawn(game.director, game.clock, game.aircraft, game.fastForward);
    if (spawned !== null) {
      game.aircraft.push(spawned.aircraft);
      if (spawned.event !== undefined) emit(game, spawned.event);
    }
  }

  for (const a of game.aircraft) {
    if (a.flags.crashed) continue;
    if (a.behaviour === 'flying') fly(game, a, scaled);
    else if (a.behaviour !== 'parked') {
      followPath(a, scaled);
      if (a.path.length === 0) arrive(game, a);
    }
    recordTrail(a);
    a.flags.selectable = isAirborne(a) && !a.flags.entering;
  }

  game.aircraft = game.aircraft.filter((a) => a.despawnAt === undefined || game.clock < a.despawnAt);
  game.maxInAir = Math.max(game.maxInAir, game.aircraft.filter(isAirborne).length);
  collide(game);
  if (game.gameOverAt !== undefined && game.clock >= game.gameOverAt) game.gameOver = true;
}

function collide(game: Game): void {
  const { danger, crashes } = detectCollisions(game.world.map, game.aircraft);
  for (const a of game.aircraft) a.flags.danger = danger.has(a);
  if (danger.size > 0 && game.clock - game.lastWarningAt >= WARNING_THROTTLE_MS) {
    game.lastWarningAt = game.clock;
    emit(game, 'proximity_warning');
  }
  for (const [a, b] of crashes) {
    crash(a);
    crash(b);
    game.crashes.push({ at: lerpPoint(a.position, b.position, 0.5), time: game.clock });
    emit(game, 'crashland');
  }
  if (crashes.length > 0 && game.crashedAt === undefined) {
    game.crashedAt = game.clock;
    game.gameOverAt = game.clock + graceMs(game.score, game.personalBest);
  }
}

function crash(a: Aircraft): void {
  a.flags.crashed = true;
  a.flags.danger = false;
  a.flags.selectable = false;
  a.path = [];
  a.target = null;
}

function fly(game: Game, a: Aircraft, dt: number): void {
  steerZeppelin(a, game.world.map);
  if (a.path.length > 0) {
    followPath(a, dt);
  } else {
    advance(a, dt);
    bounceOffEdges(a);
  }
  const zone = findCapture(game.world, a);
  if (zone !== null) land(game, a, zone);
}

function land(game: Game, a: Aircraft, zone: LandingZone): void {
  a.behaviour = 'landing';
  a.target = zone;
  a.flags.landedLocked = true;
  a.landedAt = game.clock;
  game.score++;
  emit(game, 'landed');
  if (zone.kind === 'runway') {
    a.path = [{ ...zone.end }];
  } else {
    a.path = [{ ...zone.center }];
    a.fadeAt = game.clock;
    a.despawnAt = game.clock + HELIPAD_FADE_MS;
  }
}

function arrive(game: Game, a: Aircraft): void {
  const zone = a.target;
  if (zone?.kind === 'runway' && a.behaviour === 'landing') {
    const taxi = chooseTaxi(game.rng, game.taxi, game.score, zone);
    if (taxi !== null) {
      a.behaviour = 'taxiing';
      a.path = taxi;
      a.turnRate /= 2;
      return;
    }
  }
  a.behaviour = 'parked';
  if (zone?.kind === 'runway') {
    a.fadeAt = game.clock + game.world.map.landedHoldMs;
    a.despawnAt = a.fadeAt + RUNWAY_FADE_MS;
  }
}

export function emit(game: Game, name: GameEventName): void {
  const event = { name, at: game.clock };
  game.events.push(event);
  game.lastEvent = event;
}

export function drainEvents(game: Game): GameEvent[] {
  const { events } = game;
  game.events = [];
  return events;
}
