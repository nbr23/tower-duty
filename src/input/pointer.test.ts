import { afterEach, describe, expect, it, vi } from 'vitest';
import { HANGAR_BAY, MEADOW, type MapDef } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { createAircraft, fullyInside } from '../game/aircraft';
import { createGame, updateGame } from '../game/game';
import type { Point } from '../game/geometry';
import { createDragController, pointerDown, pointerMove, pointerUp } from './drag';
import { attachPointerInput } from './pointer';

const map: MapDef = {
  ...MEADOW,
  runways: [{ x1: 300, y1: 240, x2: 450, y2: 240, strips: [0], taxiPaths: [] }],
  helipads: [],
};

function setup(position: Point = { x: 240, y: 240 }, mapDef = map, heading = 0) {
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', doc);
  const canvas = Object.assign(new EventTarget(), { setPointerCapture: vi.fn() });
  const game = createGame(mapDef, 1);
  game.director.nextSpawnAt = Infinity;
  const a = createAircraft(mapDef, 0, position, heading);
  game.aircraft.push(a);
  updateGame(game, 0);
  const ctrl = createDragController();
  const handlers = {
    down: vi.fn((id: number, p: Point) => pointerDown(ctrl, game, id, p)),
    move: vi.fn((id: number, p: Point, final?: boolean) => pointerMove(ctrl, game, id, p, final)),
    up: vi.fn((id: number, now: number) => pointerUp(ctrl, id, now)),
  };
  attachPointerInput(canvas as unknown as HTMLCanvasElement, (x, y) => ({ x, y }), handlers);
  const send = (type: string, p: Point, samples?: Point[], id = 1): void => {
    const event = Object.assign(new Event(type), {
      pointerId: id,
      clientX: p.x,
      clientY: p.y,
      getCoalescedEvents: () => samples?.map(sample => ({ clientX: sample.x, clientY: sample.y })) ?? [],
    });
    canvas.dispatchEvent(event);
  };
  return { a, game, ctrl, handlers, send, doc };
}

afterEach(() => vi.unstubAllGlobals());

describe('approaching aircraft selection', () => {
  it.each([
    { edge: 'top', position: { x: 600, y: -30 }, heading: 90, destination: { x: 600, y: 160 } },
    { edge: 'bottom', position: { x: 600, y: WORLD_HEIGHT + 30 }, heading: 270, destination: { x: 600, y: 320 } },
    { edge: 'left', position: { x: -30, y: 100 }, heading: 0, destination: { x: 160, y: 100 } },
    { edge: 'right', position: { x: WORLD_WIDTH + 30, y: 100 }, heading: 180, destination: { x: WORLD_WIDTH - 160, y: 100 } },
  ])('accepts a route while approaching the $edge edge', ({ position, heading, destination }) => {
    const { a, game, send } = setup(position, map, heading);
    updateGame(game, 16);
    expect(a.flags.entering).toBe(true);
    expect(fullyInside(a)).toBe(false);
    send('pointerdown', a.position);
    expect(a.flags.dragged).toBe(true);
    send('pointerup', destination);
    expect(a.path.at(-1)).toMatchObject(destination);
    expect(a.flags.dragged).toBe(false);
  });

  it.each([map, HANGAR_BAY])('completes entry while following an early route on $id', mapDef => {
    const { a, game, send } = setup({ x: WORLD_WIDTH / 2, y: -30 }, mapDef, 90);
    expect(a.flags.entering).toBe(true);
    send('pointerdown', a.position);
    send('pointerup', { x: WORLD_WIDTH / 2, y: 160 });
    expect(a.path.length).toBeGreaterThan(0);
    for (let i = 0; i < 1000 && !fullyInside(a); i++) {
      expect(a.flags.entering).toBe(true);
      updateGame(game, 16);
    }
    expect(fullyInside(a)).toBe(true);
    expect(a.path.length).toBeGreaterThan(0);
    expect(a.flags.entering).toBe(false);
    send('pointerdown', a.position);
    send('pointerup', { x: WORLD_WIDTH / 2, y: 0 });
    for (let i = 0; i < 1000 && fullyInside(a); i++) updateGame(game, 16);
    expect(fullyInside(a)).toBe(false);
    expect(a.flags.entering).toBe(false);
    expect(a.flags.selectable).toBe(true);
  });

  it('rejects an aircraft already held by another pointer', () => {
    const { a, ctrl, handlers, send } = setup({ x: 400, y: -30 });
    send('pointerdown', a.position);
    send('pointerdown', a.position, undefined, 2);
    expect(handlers.down.mock.results.map(result => result.value)).toEqual([true, false]);
    expect(ctrl.drags.size).toBe(1);
  });

  it('rejects inactive aircraft', () => {
    const { a, game, handlers, send } = setup();
    a.flags.active = false;
    updateGame(game, 0);
    send('pointerdown', a.position);
    expect(handlers.down).toHaveReturnedWith(false);
  });

  it('rejects landed aircraft', () => {
    const { a, handlers, send } = setup({ x: 310, y: 240 });
    expect(a.behaviour).toBe('landing');
    send('pointerdown', a.position);
    expect(handlers.down).toHaveReturnedWith(false);
  });

  it('disables selection when aircraft crash', () => {
    const { a, game, handlers, send } = setup();
    const b = createAircraft(map, 0, a.position, 0);
    game.aircraft.push(b);
    updateGame(game, 0);
    expect(a.flags.crashed).toBe(true);
    expect(a.flags.selectable).toBe(false);
    expect(b.flags.selectable).toBe(false);
    send('pointerdown', a.position);
    expect(handlers.down).toHaveReturnedWith(false);
  });
});

describe('pointer completion', () => {
  it('snaps when only the release position reaches the entrance', () => {
    const { a, game, ctrl, send } = setup();
    send('pointerdown', a.position);
    send('pointermove', { x: 285, y: 240 });
    expect(a.target).toBeNull();
    send('pointerup', { x: 305, y: 240 });
    expect(a.target).toBe(game.world.runways[0]);
    expect(a.flags.dragged).toBe(false);
    expect(ctrl.drags.size).toBe(0);
  });

  it('processes a release with no preceding move event', () => {
    const { a, game, send } = setup();
    send('pointerdown', a.position);
    send('pointerup', { x: 305, y: 240 });
    expect(a.target).toBe(game.world.runways[0]);
  });

  it('evaluates a repeated final endpoint between spatial samples', () => {
    const { a, game, send } = setup({ x: 295, y: 160 });
    send('pointerdown', a.position);
    send('pointermove', { x: 295, y: 240 });
    send('pointermove', { x: 302, y: 240 });
    expect(a.target).toBeNull();
    send('pointerup', { x: 302, y: 240 });
    expect(a.target).toBe(game.world.runways[0]);
  });

  it.each(['pointercancel', 'lostpointercapture', 'visibilitychange'])('%s releases without completing the stroke', type => {
    const { a, ctrl, handlers, send, doc } = setup();
    send('pointerdown', a.position);
    send('pointermove', { x: 285, y: 240 });
    const path = [...a.path];
    if (type === 'visibilitychange') {
      doc.hidden = true;
      doc.dispatchEvent(new Event(type));
    } else send(type, { x: 305, y: 240 });
    expect(a.target).toBeNull();
    expect(a.path).toEqual(path);
    expect(handlers.move).toHaveBeenCalledTimes(1);
    expect(handlers.up).toHaveBeenCalledTimes(1);
    expect(a.flags.dragged).toBe(false);
    expect(ctrl.drags.size).toBe(0);
  });

  it('locks a snap and emits one sound despite later moves and capture loss', () => {
    const { a, game, handlers, send } = setup();
    send('pointerdown', a.position);
    send('pointermove', { x: 305, y: 240 });
    const path = [...a.path];
    send('pointermove', { x: 500, y: 100 });
    send('pointerup', { x: 550, y: 100 });
    send('lostpointercapture', { x: 0, y: 0 });
    expect(a.path).toEqual(path);
    expect(game.events.filter(event => event.name === 'runway')).toHaveLength(1);
    expect(handlers.up).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('snaps the same dense gesture with coalesced=%s', coalesced => {
    const { a, game, send } = setup({ x: 295, y: 160 });
    send('pointerdown', a.position);
    const samples = [295, 301, 307, 313, 319, 325, 335].map(x => ({ x, y: 240 }));
    if (coalesced) send('pointermove', samples.at(-1)!, samples);
    else for (const sample of samples) send('pointermove', sample);
    expect(a.target).toBe(game.world.runways[0]);
    expect(a.path.at(-2)).toMatchObject({ x: 303, y: 240 });
    expect(game.events.filter(event => event.name === 'runway')).toHaveLength(1);
  });

  it('preserves a route on a tap and clears it on the fourth tap', () => {
    const { a, game, send } = setup();
    a.path = [{ x: 280, y: 100 }];
    a.target = game.world.runways[0]!;
    const path = a.path;
    for (let i = 0; i < 3; i++) {
      send('pointerdown', a.position);
      send('pointerup', { x: a.position.x + 2, y: a.position.y });
      expect(a.path).toBe(path);
      expect(a.target).toBe(game.world.runways[0]);
    }
    send('pointerdown', a.position);
    send('pointerup', a.position);
    expect(a.path).toEqual([]);
    expect(a.target).toBeNull();
  });

  it('preserves the old route until the replacement accepts a point', () => {
    const { a, game, send } = setup();
    a.path = [{ x: 280, y: 100 }];
    a.target = game.world.runways[0]!;
    const path = a.path;
    send('pointerdown', { x: 250, y: 240 });
    send('pointermove', { x: 241, y: 240 });
    expect(a.path).toBe(path);
    expect(a.target).toBe(game.world.runways[0]);
    send('pointermove', { x: 260, y: 240 });
    expect(a.path).toEqual([{ x: 260, y: 240, drawnAt: 0 }]);
    expect(a.target).toBeNull();
  });

  it('keeps concurrent gesture histories independent', () => {
    const { a, game, ctrl, send } = setup({ x: 295, y: 160 });
    const b = createAircraft(map, 0, { x: 240, y: 320 }, 0);
    game.aircraft.push(b);
    updateGame(game, 0);
    send('pointerdown', a.position);
    send('pointerdown', b.position, undefined, 2);
    send('pointermove', { x: 295, y: 240 });
    send('pointermove', { x: 200, y: 300 }, undefined, 2);
    send('pointermove', { x: 335, y: 240 });
    expect(a.target).toBe(game.world.runways[0]);
    expect(b.target).toBeNull();
    expect(ctrl.drags.size).toBe(2);
  });
});
