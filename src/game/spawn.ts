import type { MapDef, SpecialEvent } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { createAircraft, isAirborne, type Aircraft } from './aircraft';
import { distance, headingDeg, type Point } from './geometry';
import { randomInt, weightedPick, type Rng } from './rng';

export const SPAWN_SLOTS = 10;
export const RECENT_SLOT_MEMORY = 2;
export const SPAWN_OFFSET = WORLD_HEIGHT / 8;
const BEGINNER_BEST = 100;
const PERIMETER = 2 * (WORLD_WIDTH + WORLD_HEIGHT);
const CENTER: Point = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

export type SpawnEvent = SpecialEvent;

export interface SpawnResult {
  aircraft: Aircraft;
  slot: number;
  special: boolean;
  event?: SpawnEvent;
}

export interface SpawnDirector {
  map: MapDef;
  rng: Rng;
  level: number;
  spawnedThisLevel: number;
  quota: number;
  interval: number;
  pause: number;
  nextSpawnAt: number;
  holding: boolean;
  beginnerAid: boolean;
  specialPending: boolean;
  specialDueLevel: number | null;
  recentSlots: number[];
  serial: number;
}

function quotaFor(map: MapDef, level: number): number {
  return map.planesPerLevel[Math.min(level, map.planesPerLevel.length - 1)]!;
}

function checkSpecialDue(d: SpawnDirector): void {
  const special = d.map.special;
  if (special === undefined || d.level !== d.specialDueLevel) return;
  const strip = d.map.strips[special.stripIndex]!;
  d.specialPending = true;
  d.specialDueLevel =
    d.level + randomInt(d.rng, special.recurRandom ?? strip.weight) + (special.recurBase ?? 1);
}

export function createDirector(map: MapDef, rng: Rng, personalBest = 0): SpawnDirector {
  const specialStrip = map.special === undefined ? undefined : map.strips[map.special.stripIndex];
  const d: SpawnDirector = {
    map,
    rng,
    level: 0,
    spawnedThisLevel: 0,
    quota: quotaFor(map, 0),
    interval: map.intervals[0]!,
    pause: map.levelUpPause[0]!,
    nextSpawnAt: 0,
    holding: false,
    beginnerAid: personalBest < BEGINNER_BEST,
    specialPending: false,
    specialDueLevel: specialStrip?.type ?? null,
    recentSlots: [],
    serial: 0,
  };
  checkSpecialDue(d);
  return d;
}

function levelUp(d: SpawnDirector): void {
  const { map } = d;
  d.level++;
  d.spawnedThisLevel = 0;
  d.quota = quotaFor(map, d.level);
  d.interval = map.intervals[d.level] ?? Math.max(1, d.interval - map.intervalDecay);
  d.pause = map.levelUpPause[d.level] ?? Math.max(0, d.pause - map.pauseDecay);
  d.nextSpawnAt += d.pause;
  d.holding = d.beginnerAid;
  checkSpecialDue(d);
}

export function perimeterPoint(t: number): { point: Point; normal: Point } {
  const s = ((t % PERIMETER) + PERIMETER) % PERIMETER;
  if (s < WORLD_WIDTH) return { point: { x: s, y: 0 }, normal: { x: 0, y: -1 } };
  if (s < WORLD_WIDTH + WORLD_HEIGHT) {
    return { point: { x: WORLD_WIDTH, y: s - WORLD_WIDTH }, normal: { x: 1, y: 0 } };
  }
  if (s < 2 * WORLD_WIDTH + WORLD_HEIGHT) {
    return {
      point: { x: 2 * WORLD_WIDTH + WORLD_HEIGHT - s, y: WORLD_HEIGHT },
      normal: { x: 0, y: 1 },
    };
  }
  return { point: { x: 0, y: PERIMETER - s }, normal: { x: -1, y: 0 } };
}

interface Placement {
  slot: number;
  position: Point;
  heading: number;
}

function place(d: SpawnDirector, aircraft: readonly Aircraft[], offset: number): Placement {
  const live = aircraft.filter((a) => a.flags.active && !a.flags.crashed);
  let best: { slot: number; point: Point; normal: Point }[] = [];
  let bestScore = -Infinity;
  for (let slot = 0; slot < SPAWN_SLOTS; slot++) {
    const t = ((slot + d.rng()) * PERIMETER) / SPAWN_SLOTS;
    if (d.recentSlots.includes(slot)) continue;
    const { point, normal } = perimeterPoint(t);
    const score = Math.min(Infinity, ...live.map((a) => distance(point, a.position)));
    if (score > bestScore) {
      bestScore = score;
      best = [{ slot, point, normal }];
    } else if (score === bestScore) {
      best.push({ slot, point, normal });
    }
  }
  const chosen = best[randomInt(d.rng, best.length)]!;
  d.recentSlots.push(chosen.slot);
  if (d.recentSlots.length > RECENT_SLOT_MEMORY) d.recentSlots.shift();
  const position = {
    x: chosen.point.x + chosen.normal.x * offset,
    y: chosen.point.y + chosen.normal.y * offset,
  };
  return { slot: chosen.slot, position, heading: headingDeg(position, CENTER) };
}

function pickStrip(d: SpawnDirector): number {
  const specialIndex = d.map.special?.stripIndex;
  const eligible = d.map.strips
    .map((strip, index) => ({ strip, index }))
    .filter(({ strip, index }) => index !== specialIndex && strip.type <= d.level);
  const picked = weightedPick(d.rng, eligible, ({ strip }) => strip.weight);
  if (picked === undefined) throw new Error(`${d.map.id}: no strip unlocked at level ${d.level}`);
  return picked.index;
}

function emit(
  d: SpawnDirector,
  stripIndex: number,
  aircraft: readonly Aircraft[],
): Omit<SpawnResult, 'special'> {
  const strip = d.map.strips[stripIndex]!;
  const offset = d.serial === 0 ? strip.radius : SPAWN_OFFSET;
  const { slot, position, heading } = place(d, aircraft, offset);
  const variant = d.serial++ % (strip.variants ?? 1);
  return { aircraft: createAircraft(d.map, stripIndex, position, heading, variant), slot };
}

export function tickSpawn(
  d: SpawnDirector,
  clock: number,
  aircraft: readonly Aircraft[],
  fastForward: boolean,
): SpawnResult | null {
  if (clock < d.nextSpawnAt) return null;

  if (d.holding) {
    const airborne = aircraft.filter(isAirborne).length;
    if (!fastForward && airborne > d.level + 2) return null;
    d.holding = false;
  }

  if (d.specialPending && d.map.special !== undefined) {
    const { stripIndex, event = 'fastplanewarn' } = d.map.special;
    d.specialPending = false;
    d.nextSpawnAt = clock + 2 * d.interval;
    return { ...emit(d, stripIndex, aircraft), special: true, event };
  }

  const result = emit(d, pickStrip(d), aircraft);
  d.spawnedThisLevel++;
  d.nextSpawnAt = clock + d.interval;
  if (d.spawnedThisLevel === d.quota) levelUp(d);
  return { ...result, special: false };
}
