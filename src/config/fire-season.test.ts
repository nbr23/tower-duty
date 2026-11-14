import { describe, expect, it } from 'vitest';
import { FIRE_SEASON, MAP_SELECTOR, MEADOW } from './maps';
import { VIEW, WORLD_HEIGHT, WORLD_WIDTH } from './world';
import { synthesize } from '../audio/synth';
import { createAircraft } from '../game/aircraft';
import { createGame, updateGame } from '../game/game';
import { findCapture } from '../game/landing';
import { rankFor } from '../game/ranks';
import { tickSpawn } from '../game/spawn';
import { buildWorld, type RunwayZone } from '../game/world';
import { layoutIssues } from '../render/footprint';

const world = buildWorld(FIRE_SEASON);
const LEAD_PLANE = 4;

function approachCrossing(a: RunwayZone, b: RunwayZone): { x: number; y: number; alongA: number; alongB: number } {
  const da = { x: a.start.x - a.end.x, y: a.start.y - a.end.y };
  const db = { x: b.start.x - b.end.x, y: b.start.y - b.end.y };
  const det = da.x * db.y - da.y * db.x;
  const ox = b.start.x - a.start.x;
  const oy = b.start.y - a.start.y;
  const alongA = (ox * db.y - oy * db.x) / det;
  const alongB = (ox * da.y - oy * da.x) / det;
  return { x: a.start.x + da.x * alongA, y: a.start.y + da.y * alongA, alongA, alongB };
}

describe('Fire Season', () => {
  it('is selectable with Meadow pacing and ranks', () => {
    expect(MAP_SELECTOR).toContain(FIRE_SEASON);
    for (const key of ['planesPerLevel', 'intervals', 'levelUpPause', 'intervalDecay', 'pauseDecay'] as const) {
      expect(FIRE_SEASON[key]).toEqual(MEADOW[key]);
    }
    expect(rankFor(FIRE_SEASON.id, 179)).toBe(rankFor(MEADOW.id, 179));
  });

  it('has clear landing zones', () => {
    expect(layoutIssues(world)).toEqual([]);
  });

  it.each([
    { name: 'water scooper', index: 0, zones: 1 },
    { name: 'heavy tanker', index: 1, zones: 1 },
    { name: 'spotter plane', index: 2, zones: 1 },
    { name: 'bucket heli', index: 3, zones: 2 },
    { name: 'lead plane', index: LEAD_PLANE, zones: 1 },
  ])('captures $name only at its $zones destination(s)', ({ name, index, zones }) => {
    expect(FIRE_SEASON.strips[index]!.name).toBe(name);
    const all = [...world.runways, ...world.helipads];
    expect(all.filter((zone) => zone.filter.has(index))).toHaveLength(zones);
    for (const zone of all) {
      const position = zone.kind === 'runway' ? zone.start : zone.center;
      const a = createAircraft(FIRE_SEASON, index, position, zone.kind === 'runway' ? zone.heading : 0);
      expect(findCapture(world, a)).toBe(zone.filter.has(index) ? zone : null);
    }
  });

  it('crosses the base and lake approaches near the middle', () => {
    const crossing = approachCrossing(world.runways[0]!, world.runways[1]!);
    expect(crossing.alongA).toBeGreaterThan(0);
    expect(crossing.alongB).toBeGreaterThan(0);
    expect(Math.abs(crossing.x - WORLD_WIDTH / 2)).toBeLessThan(WORLD_WIDTH / 6);
    expect(Math.abs(crossing.y - WORLD_HEIGHT / 2)).toBeLessThan(WORLD_HEIGHT / 6);
  });

  it('lets scoopers skim the lake and fly off the map without fading', () => {
    const game = createGame(FIRE_SEASON, 7);
    game.director.nextSpawnAt = Infinity;
    const lane = game.world.runways[1]!;
    const a = createAircraft(FIRE_SEASON, 0, lane.start, lane.heading);
    game.aircraft.push(a);
    updateGame(game, 16);
    expect(a.behaviour).toBe('landing');
    expect(game.score).toBe(1);
    for (let t = 0; t < 120000 && game.aircraft.length > 0; t += 16) updateGame(game, 16);
    expect(game.aircraft).toEqual([]);
    expect(a.behaviour).toBe('landing');
    expect(a.fadeAt).toBeUndefined();
    const outside = a.position.x - a.radius > VIEW.x + VIEW.w || a.position.y - a.radius > VIEW.y + VIEW.h;
    expect(outside).toBe(true);
  });

  it('weights the smoky side above the base and keeps them on opposite halves', () => {
    const { plume, strips } = FIRE_SEASON;
    const weight = (indices: number[]): number => indices.reduce((sum, i) => sum + strips[i]!.weight, 0);
    expect(weight([0, 3])).toBeGreaterThan(2 * weight([1, 2]));
    const smoky = [world.runways[1]!.end, ...world.helipads.map((h) => h.center), plume!];
    for (const p of smoky) expect(p.x).toBeGreaterThan(WORLD_WIDTH / 2);
    expect(world.runways[0]!.start.x).toBeLessThan(WORLD_WIDTH / 2);
    expect(world.runways[0]!.end.x).toBeLessThan(WORLD_WIDTH / 2);
  });

  it('schedules recurring lead plane arrivals with the tanker cue', () => {
    const game = createGame(FIRE_SEASON, 42);
    const director = game.director;
    const arrivals: number[] = [];
    for (let step = 0; step < 400 && arrivals.length < 2; step++) {
      if (director.specialPending) {
        const level = director.level;
        game.clock = director.nextSpawnAt;
        updateGame(game, 0);
        expect(game.events.at(-1)?.name).toBe('tanker_inbound');
        expect(game.aircraft.at(-1)?.stripIndex).toBe(LEAD_PLANE);
        arrivals.push(level);
        game.aircraft = [];
      } else {
        const spawn = tickSpawn(director, director.nextSpawnAt, [], false);
        expect(spawn?.aircraft.stripIndex).not.toBe(LEAD_PLANE);
      }
    }
    expect(arrivals[0]).toBe(3);
    expect(arrivals).toHaveLength(2);
    expect(arrivals[1]! - arrivals[0]!).toBeGreaterThanOrEqual(4);
    expect(arrivals[1]! - arrivals[0]!).toBeLessThanOrEqual(5);
  });

  it('synthesizes an audible tanker cue', () => {
    const samples = synthesize('tanker_inbound', 8000);
    expect(samples.length).toBe(Math.round(1.3 * 8000));
    expect(Math.max(...samples.map(Math.abs))).toBeCloseTo(0.9, 5);
  });
});
