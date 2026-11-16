import { describe, expect, it } from 'vitest';
import { HANGAR_BAY, MAP_SELECTOR, type MapDef } from '../config/maps';
import { WORLD_HEIGHT } from '../config/world';
import { createAircraft } from './aircraft';
import { detectCollisions, inWarning } from './collision';
import { createGame, updateGame } from './game';
import { advance } from './movement';
import { spriteFor } from '../render/aircraft';
import { mulberry32 } from './rng';
import { createDirector, tickSpawn, type SpawnResult } from './spawn';

const SPAWNS = 400;
const CAMEO_SALT = 0x51ed;

function run(map: MapDef, seed: number, cameoChance: number): SpawnResult[] {
  const director = createDirector(map, mulberry32(seed), 0, mulberry32(seed ^ CAMEO_SALT));
  director.cameoChance = cameoChance;
  const spawns: SpawnResult[] = [];
  while (spawns.length < SPAWNS) {
    const spawn = tickSpawn(director, director.nextSpawnAt, [], true);
    if (spawn !== null) spawns.push(spawn);
  }
  return spawns;
}

describe('cameos', () => {
  it.each(MAP_SELECTOR)('$id dresses only regular arrivals of strips that list cameos', (map) => {
    for (const { aircraft, special } of run(map, 7, 1)) {
      const cameos = map.strips[aircraft.stripIndex]!.cameos;
      if (special || cameos === undefined) expect(aircraft.cameo).toBeUndefined();
      else expect(cameos).toContain(aircraft.cameo);
    }
  });

  it.each(MAP_SELECTOR)('$id spawns identically whether or not cameos roll', (map) => {
    const plain = run(map, 11, 0).map(({ aircraft, slot }) => [aircraft.stripIndex, slot, aircraft.position, aircraft.variant]);
    const dressed = run(map, 11, 1).map(({ aircraft, slot }) => [aircraft.stripIndex, slot, aircraft.position, aircraft.variant]);
    expect(dressed).toEqual(plain);
  });

  it('stays rare at the default chance', () => {
    const director = createDirector(MAP_SELECTOR[0]!, mulberry32(3), 0, mulberry32(4));
    let dressed = 0;
    for (let i = 0; i < 4000; i++) {
      if (tickSpawn(director, director.nextSpawnAt, [], true)?.aircraft.cameo !== undefined) dressed++;
    }
    expect(dressed).toBeGreaterThan(0);
    expect(dressed).toBeLessThan(80);
  });

  it('has a sprite for every cameo a strip lists', () => {
    for (const map of MAP_SELECTOR) {
      const fallback = spriteFor(map, '', 0);
      for (const cameo of map.strips.flatMap((strip) => strip.cameos ?? [])) {
        expect(spriteFor(map, cameo, 0), `${map.id}: ${cameo}`).not.toBe(fallback);
      }
    }
  });
});

function flightMap(stripIndex = 0, quota = 12): MapDef {
  return {
    ...HANGAR_BAY,
    strips: [{ ...HANGAR_BAY.strips[stripIndex]!, type: 0 }],
    planesPerLevel: [quota],
    special: undefined,
  };
}

describe('formation arrivals', () => {
  it.each([0, 1, 6])('emits strip %i in safe trail from one placement', (index) => {
    const map = flightMap(index);
    const d = createDirector(map, mulberry32(7));
    const first = tickSpawn(d, 0, [], false)!;
    const position = { ...first.aircraft.position };
    const recent = [...d.recentSlots];
    const live = [first.aircraft];
    let clock = 0;
    for (let member = 1; member < map.strips[0]!.flightSize!; member++) {
      const due = d.nextSpawnAt;
      expect(tickSpawn(d, due - 1, live, false)).toBeNull();
      for (const a of live) advance(a, due - clock);
      const next = tickSpawn(d, due, live, false)!;
      expect(next.aircraft.position).toEqual(position);
      expect(next.aircraft.heading).toBe(first.aircraft.heading);
      expect(next.slot).toBe(first.slot);
      expect(d.recentSlots).toEqual(recent);
      for (const a of live) expect(inWarning(a, next.aircraft)).toBe(false);
      live.push(next.aircraft);
      clock = due;
    }
    expect(d.flight).toBeNull();
    expect(d.spawnedThisLevel).toBe(map.strips[0]!.flightSize);
    expect(d.nextSpawnAt).toBe(clock + d.interval);
    expect(detectCollisions(map, live).crashes).toEqual([]);
    live[1]!.position = { ...live[0]!.position };
    expect(detectCollisions(map, live).crashes).toContainEqual([live[0], live[1]]);
  });

  it.each([1, 2, 3, 4])('counts exactly %i ships before advancing the level', (quota) => {
    const d = createDirector(flightMap(0, quota), mulberry32(11));
    for (let i = 0; i < quota; i++) {
      expect(d.level).toBe(0);
      const at = d.nextSpawnAt;
      expect(tickSpawn(d, at, [], false)).not.toBeNull();
      if (i === quota - 1) expect(d.nextSpawnAt).toBe(at + 6000 + 3000);
      else expect(d.spawnedThisLevel).toBe(i + 1);
    }
    expect(d.level).toBe(1);
    expect(d.spawnedThisLevel).toBe(0);
    expect(d.flight).toBeNull();
    expect(d.holding).toBe(true);
  });

  it('finishes a flight before a pending special or beginner hold', () => {
    const d = createDirector(HANGAR_BAY, () => 0);
    expect(tickSpawn(d, 0, [], false)!.aircraft.stripIndex).toBe(0);
    d.specialPending = true;
    d.holding = true;
    const traffic = Array.from({ length: 8 }, () => createAircraft(HANGAR_BAY, 3, { x: 200, y: 200 }, 0));
    for (let i = 0; i < 2; i++) {
      expect(tickSpawn(d, d.nextSpawnAt, traffic, false)!.special).toBe(false);
    }
    expect(d.specialPending).toBe(true);
    expect(tickSpawn(d, d.nextSpawnAt, traffic, false)).toBeNull();
    const at = d.nextSpawnAt;
    const special = tickSpawn(d, at, traffic, true)!;
    expect(special.special).toBe(true);
    expect(special.event).toBe('fastplanewarn');
    expect(special.aircraft.stripIndex).toBe(4);
    expect(d.nextSpawnAt).toBe(at + 2 * d.interval);
    expect(d.flight).toBeNull();
  });

  it('keeps all regular and special arrivals on exposed perimeter slots', () => {
    for (let seed = 0; seed < 12; seed++) {
      const d = createDirector(HANGAR_BAY, mulberry32(seed));
      for (let i = 0; i < 150; i++) {
        const spawn = tickSpawn(d, d.nextSpawnAt, [], true)!;
        expect(HANGAR_BAY.spawnSlots).toContain(spawn.slot);
        const { y } = spawn.aircraft.position;
        expect(y < 0 || y > WORLD_HEIGHT).toBe(true);
      }
    }
  });

  it('advances flight timing through the same simulation clock in fast-forward', () => {
    const map = flightMap();
    const normal = createGame(map, 7);
    const fast = createGame(map, 7, { fastForward: true });
    updateGame(normal, 0);
    updateGame(fast, 0);
    for (let i = 0; i < 230; i++) {
      updateGame(normal, 16);
      updateGame(fast, 8);
    }
    expect(normal.aircraft).toHaveLength(3);
    expect(fast.aircraft).toEqual(normal.aircraft);
    expect(fast.director.nextSpawnAt).toBe(normal.director.nextSpawnAt);
    expect(normal.crashes).toEqual([]);
  });
});
