import { describe, expect, it } from 'vitest';
import { LOST_VALLEY, MEADOW } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { createAircraft } from './aircraft';
import { createFlocks, flockRoute, isActive, SCATTER_MS, tickFlocks, type Flock } from './flocks';
import { createGame, updateGame, type Game } from './game';
import { mulberry32 } from './rng';

const DEF = LOST_VALLEY.flocks!;
const STEP = 16;

function inside(p: { x: number; y: number }, pad = 0): boolean {
  return p.x >= -pad && p.x <= WORLD_WIDTH + pad && p.y >= -pad && p.y <= WORLD_HEIGHT + pad;
}

function quietGame(seed = 3): Game {
  const game = createGame(LOST_VALLEY, seed);
  game.director.nextSpawnAt = Infinity;
  game.director.level = DEF.fromLevel;
  game.flocks.nextAt = Infinity;
  return game;
}

function parkedFlock(game: Game, x: number, y: number): Flock {
  const flock: Flock = {
    route: [
      { x, y },
      { x: x + 1, y },
    ],
    length: 1e6,
    travelled: 0,
    position: { x, y },
    heading: 0,
    velocityDir: { x: 1, y: 0 },
    speed: 0,
    radius: DEF.radius,
    birds: DEF.birds,
    seed: 1,
    danger: false,
  };
  game.flocks.list.push(flock);
  return flock;
}

describe('flock routes', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('start and end off the world and cross it (seed %i)', (seed) => {
    const route = flockRoute(mulberry32(seed), DEF.radius);
    expect(inside(route[0]!, DEF.radius)).toBe(false);
    expect(inside(route.at(-1)!, DEF.radius)).toBe(false);
    const visible = route.filter((p) => inside(p));
    expect(visible.length).toBeGreaterThan(route.length / 3);
  });
});

describe('flock schedule', () => {
  it('stays empty on maps without flocks', () => {
    const state = createFlocks(MEADOW, 1);
    for (let clock = 0; clock < 120000; clock += 100) expect(tickFlocks(state, clock, 100, 5, [], true)).toBe(false);
    expect(state.list).toEqual([]);
  });

  it('waits for the first flock level', () => {
    const state = createFlocks(LOST_VALLEY, 1);
    for (let clock = 0; clock < 120000; clock += 100) tickFlocks(state, clock, 100, DEF.fromLevel - 1, [], true);
    expect(state.list).toEqual([]);
  });

  it('caps active flocks and replays the same flocks for the same seed', () => {
    const run = (): Flock[] => {
      const state = createFlocks(LOST_VALLEY, 9);
      const seen: Flock[] = [];
      for (let clock = 0; clock < 600000; clock += 100) {
        if (tickFlocks(state, clock, 100, DEF.fromLevel, [], true)) seen.push(state.list.at(-1)!);
        expect(state.list.filter(isActive).length).toBeLessThanOrEqual(DEF.maxActive);
      }
      return seen;
    };
    const first = run();
    expect(first.length).toBeGreaterThan(3);
    expect(run().map((f) => f.route[0])).toEqual(first.map((f) => f.route[0]));
  });

  it('flies a flock across the map and removes it once it leaves', () => {
    const state = createFlocks(LOST_VALLEY, 4);
    state.nextAt = 0;
    tickFlocks(state, 0, 0, DEF.fromLevel, [], true);
    const [flock] = state.list;
    let seenInside = false;
    for (let clock = 0; state.list.includes(flock!); clock += STEP) {
      tickFlocks(state, clock, STEP, DEF.fromLevel, [], false);
      seenInside ||= inside(flock!.position);
      expect(clock).toBeLessThan(300000);
    }
    expect(seenInside).toBe(true);
    expect(inside(flock!.position, DEF.radius)).toBe(false);
  });

  it('announces each flock with the bird cue', () => {
    const game = createGame(LOST_VALLEY, 5);
    game.director.nextSpawnAt = Infinity;
    game.director.level = DEF.fromLevel;
    game.flocks.nextAt = 0;
    updateGame(game, STEP);
    expect(game.flocks.list).toHaveLength(1);
    expect(game.events.map((e) => e.name)).toContain('flock_inbound');
  });
});

describe('flock hazards', () => {
  it('warns a plane that gets close', () => {
    const game = quietGame();
    const flock = parkedFlock(game, 400, 240);
    const a = createAircraft(LOST_VALLEY, 0, { x: 400 - DEF.radius - 12 - 30, y: 240 }, 180);
    a.flags.entering = false;
    game.aircraft.push(a);
    updateGame(game, 0);
    expect(a.flags.danger).toBe(true);
    expect(flock.danger).toBe(true);
    expect(a.flags.crashed).toBe(false);
    expect(game.events.map((e) => e.name)).toContain('proximity_warning');
  });

  it('crashes a plane that flies into it and starts the game-over grace', () => {
    const game = quietGame();
    const flock = parkedFlock(game, 400, 240);
    const a = createAircraft(LOST_VALLEY, 0, { x: 400 - DEF.radius - 10, y: 240 }, 0);
    a.flags.entering = false;
    game.aircraft.push(a);
    updateGame(game, 0);
    expect(a.flags.crashed).toBe(true);
    expect(flock.struckAt).toBe(game.clock);
    expect(game.crashes).toHaveLength(1);
    expect(game.gameOverAt).toBeDefined();
    expect(game.events.map((e) => e.name)).toContain('crashland');
    game.gameOverAt = Infinity;
    for (let t = 0; t <= SCATTER_MS + STEP; t += STEP) updateGame(game, STEP);
    expect(game.flocks.list).not.toContain(flock);
  });

  it('ignores planes that are already landing', () => {
    const game = quietGame();
    parkedFlock(game, 400, 240);
    const a = createAircraft(LOST_VALLEY, 0, { x: 400, y: 240 }, 0);
    a.behaviour = 'landing';
    a.flags.landedLocked = true;
    a.path = [{ x: 400, y: 240 }];
    game.aircraft.push(a);
    updateGame(game, 0);
    expect(a.flags.crashed).toBe(false);
    expect(a.flags.danger).toBe(false);
  });

  it('ignores flocks still off the map', () => {
    const game = quietGame();
    parkedFlock(game, -80, 240);
    const a = createAircraft(LOST_VALLEY, 0, { x: -80, y: 240 }, 0);
    game.aircraft.push(a);
    updateGame(game, 0);
    expect(a.flags.crashed).toBe(false);
  });

  it('stops sending flocks after a crash', () => {
    const game = quietGame();
    game.crashedAt = 0;
    game.gameOverAt = Infinity;
    game.flocks.nextAt = 0;
    for (let t = 0; t < 60000; t += STEP) updateGame(game, STEP);
    expect(game.flocks.list).toEqual([]);
  });
});
