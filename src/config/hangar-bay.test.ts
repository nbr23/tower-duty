import { describe, expect, it } from 'vitest';
import { AIRSHOW, HANGAR_BAY, MAP_SELECTOR } from './maps';
import { WORLD_WIDTH } from './world';
import { createAircraft } from '../game/aircraft';
import { createGame, updateGame } from '../game/game';
import { findCapture } from '../game/landing';
import { mulberry32 } from '../game/rng';
import { createDirector, tickSpawn } from '../game/spawn';
import { buildWorld } from '../game/world';
import { spriteFor } from '../render/aircraft';
import { layoutIssues } from '../render/footprint';
import { PAINTERS } from '../render/scenery';

const world = buildWorld(HANGAR_BAY);

describe('Hangar Bay', () => {
  it('integrates with map selection, scenery, and pacing', () => {
    expect(MAP_SELECTOR[13]).toBe(HANGAR_BAY);
    expect(PAINTERS[HANGAR_BAY.background]).toBeTypeOf('function');
    expect(HANGAR_BAY.clouds).toBe(false);
    for (const key of ['planesPerLevel', 'intervals', 'levelUpPause', 'intervalDecay', 'pauseDecay'] as const) {
      expect(HANGAR_BAY[key]).toEqual(AIRSHOW[key]);
    }
    expect(layoutIssues(world)).toEqual([]);
    expect(world.runways).toEqual([]);
    expect(world.helipads).toHaveLength(8);
    for (const pad of world.helipads) expect(pad.mark).toBe('target');
  });

  it.each(HANGAR_BAY.strips.map((strip, index) => ({ ...strip, index })))('captures and clears $name only at its destinations', ({ index }) => {
    const zones = [...world.runways, ...world.helipads];
    const expected = HANGAR_BAY.strips[index]!.color === 1 ? [0, 1, 2, 3] : [4, 5, 6, 7];
    for (const [zoneIndex, zone] of zones.entries()) {
      const a = createAircraft(HANGAR_BAY, index, zone.kind === 'runway' ? zone.start : zone.center, zone.kind === 'runway' ? zone.heading : 0);
      expect(findCapture(world, a)).toBe(expected.includes(zoneIndex) ? zone : null);
      if (!expected.includes(zoneIndex)) continue;
      const game = createGame(HANGAR_BAY, 7);
      game.director.nextSpawnAt = Infinity;
      game.aircraft.push(a);
      updateGame(game, 0);
      expect(game.score).toBe(1);
      for (let t = 0; t < 60000 && game.aircraft.length > 0; t += 16) updateGame(game, 16);
      expect(game.aircraft).toEqual([]);
      expect(game.score).toBe(1);
    }
  });

  it('docks each faction at its own station, rebels left and empire right', () => {
    expect(HANGAR_BAY.colors).toHaveLength(2);
    for (const [index, strip] of HANGAR_BAY.strips.entries()) {
      const destinations = world.helipads.filter((zone) => zone.filter.has(index));
      expect(destinations).toHaveLength(4);
      for (const destination of destinations) {
        expect(destination.center.x < WORLD_WIDTH / 2).toBe(strip.color === 1);
        const first = [...destination.filter][0]!;
        expect(strip.color).toBe(HANGAR_BAY.strips[first]!.color);
      }
    }
  });

  it('sizes every pad the same so both factions get matching marks', () => {
    expect(new Set(world.helipads.map((pad) => pad.radius)).size).toBe(1);
  });

  it('provides distinct ship sprites and two freighter variants', () => {
    const fallback = spriteFor(HANGAR_BAY, '', 0);
    const sprites = HANGAR_BAY.strips.flatMap((strip) => Array.from({ length: strip.variants ?? 1 }, (_, variant) => {
      const sprite = spriteFor(HANGAR_BAY, strip.name, variant);
      expect(sprite).not.toBe(fallback);
      expect(sprite.rotors).toBeUndefined();
      return sprite;
    }));
    expect(new Set(sprites).size).toBe(9);
  });

  it('announces single couriers from level three, recurring every four or five levels', () => {
    const d = createDirector(HANGAR_BAY, mulberry32(42));
    const levels: number[] = [];
    for (let i = 0; i < 300 && levels.length < 3; i++) {
      const level = d.level;
      const count = d.spawnedThisLevel;
      const result = tickSpawn(d, d.nextSpawnAt, [], true)!;
      if (!result.special) {
        expect(result.aircraft.stripIndex).not.toBe(4);
        continue;
      }
      expect(result.aircraft.stripIndex).toBe(4);
      expect(result.event).toBe('fastplanewarn');
      expect(d.spawnedThisLevel).toBe(count);
      expect(d.flight).toBeNull();
      levels.push(level);
    }
    expect(levels).toHaveLength(3);
    expect(levels[0]).toBe(3);
    for (let i = 1; i < levels.length; i++) expect([4, 5]).toContain(levels[i]! - levels[i - 1]!);
  });

  it('spawns the full regular roster only after each ship unlocks', () => {
    const d = createDirector(HANGAR_BAY, mulberry32(7));
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const level = d.level;
      const result = tickSpawn(d, d.nextSpawnAt, [], true)!;
      if (result.special) continue;
      expect(result.aircraft.type).toBeLessThanOrEqual(level);
      seen.add(result.aircraft.stripIndex);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 5, 6, 7]);
  });
});
