import { describe, expect, it } from 'vitest';
import { AIRSHOW, LOST_VALLEY, MAP_SELECTOR } from './maps';
import { WORLD_WIDTH } from './world';
import { synthesize } from '../audio/synth';
import { createAircraft } from '../game/aircraft';
import { createGame, updateGame } from '../game/game';
import { findCapture } from '../game/landing';
import { tickSpawn } from '../game/spawn';
import { buildWorld } from '../game/world';
import { layoutIssues } from '../render/footprint';
import { PAINTERS } from '../render/scenery';

const world = buildWorld(LOST_VALLEY);
const AIRSHIP = 4;

describe('Lost Valley', () => {
  it('is selectable with scenery and Airshow pacing', () => {
    expect(MAP_SELECTOR.at(-1)).toBe(LOST_VALLEY);
    expect(PAINTERS[LOST_VALLEY.background]).toBeTypeOf('function');
    for (const key of ['planesPerLevel', 'intervals', 'levelUpPause', 'intervalDecay', 'pauseDecay'] as const) {
      expect(LOST_VALLEY[key]).toEqual(AIRSHOW[key]);
    }
  });

  it('has clear landing zones', () => {
    expect(layoutIssues(world)).toEqual([]);
  });

  it.each([
    { name: 'bush plane', index: 0 },
    { name: 'floatplane', index: 1 },
    { name: 'cargo transport', index: 2 },
    { name: 'heli', index: 3 },
    { name: 'expedition airship', index: AIRSHIP },
  ])('captures $name only at its own zone', ({ name, index }) => {
    expect(LOST_VALLEY.strips[index]!.name).toBe(name);
    const all = [...world.runways, ...world.helipads];
    expect(all.filter((zone) => zone.filter.has(index))).toHaveLength(1);
    for (const zone of all) {
      const position = zone.kind === 'runway' ? zone.start : zone.center;
      const a = createAircraft(LOST_VALLEY, index, position, zone.kind === 'runway' ? zone.heading : 0);
      expect(findCapture(world, a)).toBe(zone.filter.has(index) ? zone : null);
    }
  });

  it('keeps the airship collision shape inside its hull', () => {
    const strip = LOST_VALLEY.strips[AIRSHIP]!;
    for (const { cx, cy, r } of strip.parkSlots!) expect(Math.hypot(cx, cy) + r).toBeLessThanOrEqual(strip.radius + 4);
  });

  it('rolls the waterfall mist across the plateau', () => {
    const { plume, weather } = LOST_VALLEY;
    expect(weather).toBe('mist');
    expect(plume!.x).toBeLessThan(WORLD_WIDTH / 4);
    expect(Math.cos((plume!.heading * Math.PI) / 180)).toBeGreaterThan(0.8);
  });

  it('schedules recurring airship arrivals with the zeppelin cue', () => {
    const game = createGame(LOST_VALLEY, 42);
    const director = game.director;
    const arrivals: number[] = [];
    for (let step = 0; step < 400 && arrivals.length < 2; step++) {
      if (director.specialPending) {
        const level = director.level;
        game.clock = director.nextSpawnAt;
        updateGame(game, 0);
        expect(game.events.map((e) => e.name)).toContain('zeppelin_arriving');
        expect(game.aircraft.at(-1)?.stripIndex).toBe(AIRSHIP);
        arrivals.push(level);
        game.aircraft = [];
      } else {
        const spawn = tickSpawn(director, director.nextSpawnAt, [], false);
        expect(spawn?.aircraft.stripIndex).not.toBe(AIRSHIP);
      }
    }
    expect(arrivals[0]).toBe(3);
    expect(arrivals).toHaveLength(2);
    expect(arrivals[1]! - arrivals[0]!).toBeGreaterThanOrEqual(5);
    expect(arrivals[1]! - arrivals[0]!).toBeLessThanOrEqual(6);
  });

  it('synthesizes an audible flock cue', () => {
    const samples = synthesize('flock_inbound', 8000);
    expect(samples.length).toBe(Math.round(0.7 * 8000));
    expect(Math.max(...samples.map(Math.abs))).toBeCloseTo(0.9, 5);
  });
});
