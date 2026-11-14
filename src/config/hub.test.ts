import { describe, expect, it } from 'vitest';
import { COAST, HUB, MAP_SELECTOR } from './maps';
import { createAircraft } from '../game/aircraft';
import { createGame, updateGame } from '../game/game';
import { distance } from '../game/geometry';
import { findCapture } from '../game/landing';
import { rankFor } from '../game/ranks';
import { tickSpawn } from '../game/spawn';
import { buildWorld } from '../game/world';
import { layoutIssues } from '../render/footprint';
import { scoreShareData } from '../ui/share';

const world = buildWorld(HUB);

describe('Hub', () => {
  it('has clear landing zones, taxi routes and stand spacing', () => {
    expect(layoutIssues(world)).toEqual([]);
  });

  it('keeps existing selections and uses Coast pacing and ranks', () => {
    expect(MAP_SELECTOR[11]).toBe(HUB);
    expect(MAP_SELECTOR.slice(0, 11).map((map) => map.id)).toEqual([
      'meadow', 'fleet', 'lakeside', 'airshow', 'canyon', 'coast',
      'arctic-outpost', 'volcano-island', 'city-lights', 'moon-base', 'altiport',
    ]);
    for (const key of ['planesPerLevel', 'intervals', 'levelUpPause', 'intervalDecay', 'pauseDecay'] as const) {
      expect(HUB[key]).toEqual(COAST[key]);
    }
    expect(rankFor(HUB.id, 151)).toBe(rankFor(COAST.id, 151));
    expect(scoreShareData(HUB, 151, false, 'https://example.com/').url).toBe('https://example.com/m/hub/');
  });

  it.each(HUB.strips.map((strip, index) => ({ name: strip.name, index })))('captures $name only at its destination', ({ index }) => {
    const zones = [...world.runways, ...world.helipads];
    expect(zones.filter((zone) => zone.filter.has(index))).toHaveLength(1);
    for (const zone of zones) {
      const position = zone.kind === 'runway' ? zone.start : zone.center;
      const a = createAircraft(HUB, index, position, zone.kind === 'runway' ? zone.heading : 0);
      expect(findCapture(world, a)).toBe(zone.filter.has(index) ? zone : null);
    }
  });

  const taxiCases = world.runways.flatMap((runway, runwayIndex) =>
    [...runway.filter].flatMap((strip) => runway.taxiPaths.map((path, pathIndex) => ({
      name: HUB.strips[strip]!.name, runwayIndex, strip, pathIndex, path,
    }))));

  it.each(taxiCases)('taxis $name to stand $pathIndex and despawns', ({ runwayIndex, strip, pathIndex, path }) => {
    const game = createGame(HUB, 42);
    game.director.nextSpawnAt = Infinity;
    const runway = game.world.runways[runwayIndex]!;
    game.rng = () => (pathIndex + 0.5) / runway.taxiPaths.length;
    const a = createAircraft(HUB, strip, runway.start, runway.heading);
    game.aircraft.push(a);
    const states = new Set<string>();
    for (let frame = 0; frame < 4000 && a.behaviour !== 'parked'; frame++) {
      updateGame(game, 16);
      states.add(a.behaviour);
    }
    expect(states).toEqual(new Set(['landing', 'taxiing', 'parked']));
    expect(game.score).toBe(1);
    expect(game.crashes).toEqual([]);
    expect(distance(a.position, path.at(-1)!)).toBeLessThan(40);
    expect(a.fadeAt).toBe(game.clock + HUB.landedHoldMs);
    updateGame(game, 3100);
    expect(game.aircraft).toEqual([]);
  });

  it('lands side-by-side traffic at different speeds without a collision', () => {
    const game = createGame(HUB, 42, { taxi: false });
    game.director.nextSpawnAt = Infinity;
    for (const [i, strip] of [[0, 1], [1, 0]] as const) {
      const r = game.world.runways[i]!;
      const a = createAircraft(HUB, strip, { x: r.start.x - 60, y: r.start.y }, r.heading);
      a.path = [{ ...r.end }];
      game.aircraft.push(a);
    }
    for (let frame = 0; frame < 400 && game.score < 2; frame++) updateGame(game, 16);
    expect(game.score).toBe(2);
    expect(game.crashes).toEqual([]);
    expect(game.aircraft.every((a) => !a.flags.danger)).toBe(true);
  });

  it('parks at the runway end when taxiing is disabled', () => {
    const game = createGame(HUB, 42, { taxi: false });
    game.director.nextSpawnAt = Infinity;
    const runway = game.world.runways[0]!;
    const a = createAircraft(HUB, 1, runway.start, runway.heading);
    game.aircraft.push(a);
    for (let frame = 0; frame < 2000 && a.behaviour !== 'parked'; frame++) updateGame(game, 16);
    expect(a.behaviour).toBe('parked');
    expect(distance(a.position, runway.end)).toBeLessThan(8);
    updateGame(game, 3100);
    expect(game.aircraft).toEqual([]);
  });

  it.each([0, 1])('lands and despawns helicopters at pad %i', (index) => {
    const game = createGame(HUB, 42);
    game.director.nextSpawnAt = Infinity;
    const pad = game.world.helipads[index]!;
    const a = createAircraft(HUB, [...pad.filter][0]!, pad.center, 0);
    game.aircraft.push(a);
    updateGame(game, 16);
    expect(a.target).toBe(pad);
    expect(a.behaviour).toBe('landing');
    expect(game.score).toBe(1);
    for (let frame = 0; frame < 400; frame++) updateGame(game, 16);
    expect(game.aircraft).toEqual([]);
  });

  it('schedules recurring medevac arrivals with the warning event', () => {
    const game = createGame(HUB, 42);
    const director = game.director;
    const arrivals: number[] = [];
    for (let step = 0; step < 150 && arrivals.length < 2; step++) {
      if (director.specialPending) {
        const level = director.level;
        game.clock = director.nextSpawnAt;
        updateGame(game, 0);
        expect(game.events.at(-1)?.name).toBe('fastplanewarn');
        expect(game.aircraft.at(-1)?.stripIndex).toBe(7);
        arrivals.push(level);
        game.aircraft = [];
      } else {
        const spawn = tickSpawn(director, director.nextSpawnAt, [], false);
        expect(spawn?.aircraft.stripIndex).not.toBe(7);
      }
    }
    expect(arrivals[0]).toBe(5);
    expect(arrivals).toHaveLength(2);
    expect(arrivals[1]! - arrivals[0]!).toBeGreaterThanOrEqual(1);
    expect(arrivals[1]! - arrivals[0]!).toBeLessThanOrEqual(2);
  });
});
