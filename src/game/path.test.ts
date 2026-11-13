import { describe, expect, it } from 'vitest';
import { MEADOW, MAP_SELECTOR, type MapDef } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { createAircraft } from './aircraft';
import { createGame, updateGame } from './game';
import { distance, lerpPoint, type Point } from './geometry';
import { createRunwayStroke, extendPath } from './path';
import { buildWorld, runwayFrame, type RunwayZone, type World } from './world';

const map: MapDef = {
  ...MEADOW,
  runways: [{ x1: 300, y1: 240, x2: 450, y2: 240, strips: [0], taxiPaths: [] }],
  helipads: [],
};
const world = buildWorld(map);
type Local = readonly [number, number];

function point(zone: RunwayZone, [x, y]: Local): Point {
  const angle = zone.heading * Math.PI / 180;
  return {
    x: zone.start.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: zone.start.y + x * Math.sin(angle) + y * Math.cos(angle),
  };
}

function draw(w: World, zone: RunwayZone, coords: readonly Local[], strip = [...zone.filter][0]!) {
  const a = createAircraft(w.map, strip, point(zone, coords[0]!), zone.heading);
  const stroke = createRunwayStroke(a.position);
  for (const coord of coords.slice(1)) {
    if (extendPath(w, a, point(zone, coord), 100, stroke) === 'snapped') break;
  }
  return a;
}

const sparse: Local[] = [[-5, -80], [-5, 0], [35, 0]];
const dense: Local[] = [[-5, -80], [-5, 0], [1, 0], [7, 0], [13, 0], [19, 0], [25, 0], [35, 0]];

describe('runway entrance snapping', () => {
  it.each<{ name: string; coords: Local[] }>([
    { name: 'straight crossing', coords: [[-60, 0], [-20, 0], [5, 0]] },
    { name: 'stop short', coords: [[-60, 0], [-20, 0], [-5, 0]] },
    { name: 'correct near miss', coords: [[-60, 29], [5, 29], [15, 0], [60, 0]] },
    { name: 'join beyond threshold', coords: [[-60, 50], [10, 30], [30, 0], [60, 0]] },
    { name: 'sparse corner', coords: sparse },
    { name: 'dense corner', coords: dense },
    { name: 'fast sweep', coords: [[-100, 0], [300, 0]] },
    { name: 'upper boundary', coords: [[-60, 28], [5, 28]] },
    { name: 'lower boundary', coords: [[-60, -28], [5, -28]] },
  ])('$name', ({ coords }) => {
    const zone = world.runways[0]!;
    const a = draw(world, zone, coords);
    expect(a.target).toBe(zone);
    expect(a.path.at(-1)).toMatchObject(zone.end);
    const join = runwayFrame(zone, a.path.at(-2)!);
    expect(join.along).toBeGreaterThanOrEqual(0);
    expect(join.along).toBeLessThanOrEqual(40);
    expect(join.lateral).toBeCloseTo(0);
    expect(a.path.every(p => p.drawnAt === 100)).toBe(true);
  });

  it.each<{ name: string; coords: Local[] }>([
    { name: 'backward approach', coords: [[60, 0], [0, 0], [-30, 0]] },
    { name: 'crosswise approach', coords: [[10, -80], [10, 80]] },
    { name: 'mid-runway join', coords: [[70, -60], [90, 0], [120, 0]] },
    { name: 'outside lateral tolerance', coords: [[-60, 28.001], [60, 28.001]] },
    { name: 'outside entrance', coords: [[-60, 0], [-12.001, 0]] },
  ])('rejects $name', ({ coords }) => {
    expect(draw(world, world.runways[0]!, coords).target).toBeNull();
  });

  it('rejects incompatible aircraft', () => {
    expect(draw(world, world.runways[0]!, [[-60, 0], [10, 0]], 2).target).toBeNull();
  });

  it.each([80, -80, 80.01, -80.01])('enforces the approach angle at %s degrees', angle => {
    const slope = Math.tan(angle * Math.PI / 180);
    const a = draw(world, world.runways[0]!, [[-15, -3 * slope], [-10, 2 * slope]]);
    expect(a.target !== null).toBe(Math.abs(angle) <= 80);
  });

  it('joins forward of the threshold after a correction', () => {
    const zone = world.runways[0]!;
    const a = draw(world, zone, [[-60, 29], [5, 29], [15, 0]]);
    expect(runwayFrame(zone, a.path.at(-2)!).along).toBeGreaterThan(5);
    expect(a.path).not.toContainEqual({ ...zone.start, drawnAt: 100 });
    expect(a.path).not.toContainEqual({ ...point(zone, [15, 0]), drawnAt: 100 });
  });

  it('keeps identical snap positions with sparse and dense samples across maps', () => {
    let checked = 0;
    for (const definition of MAP_SELECTOR) {
      const w = buildWorld(definition);
      for (const zone of w.runways) {
        const inside = sparse.map(p => point(zone, p)).every(p =>
          p.x >= 0 && p.x <= WORLD_WIDTH && p.y >= 0 && p.y <= WORLD_HEIGHT);
        if (!inside) continue;
        const a = draw(w, zone, sparse);
        const b = draw(w, zone, dense);
        expect(a.target, `${definition.id}: sparse`).toBe(zone);
        expect(b.target, `${definition.id}: dense`).toBe(zone);
        expect(distance(a.path.at(-2)!, b.path.at(-2)!)).toBeLessThan(1e-6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it('retains gesture history when movement consumes the route', () => {
    const zone = world.runways[0]!;
    const a = createAircraft(map, 0, point(zone, sparse[0]!), 0);
    const stroke = createRunwayStroke(a.position);
    extendPath(world, a, point(zone, sparse[1]!), 0, stroke);
    a.path = [];
    a.position = { x: 400, y: 300 };
    expect(extendPath(world, a, point(zone, sparse[2]!), 0, stroke)).toBe('snapped');
    expect(a.path.at(-2)).toMatchObject({ x: 303, y: 240 });
  });

  it('evaluates the final position between fixed samples, including a repeated endpoint', () => {
    const zone = world.runways[0]!;
    const a = createAircraft(map, 0, point(zone, [-5, -80]), 0);
    const stroke = createRunwayStroke(a.position);
    extendPath(world, a, point(zone, [-5, 0]), 0, stroke);
    expect(extendPath(world, a, point(zone, [2, 0]), 0, stroke)).toBe('appended');
    expect(a.target).toBeNull();
    expect(extendPath(world, a, point(zone, [2, 0]), 0, stroke, true)).toBe('snapped');
    expect(a.path.at(-2)).toMatchObject({ x: 302, y: 240 });
  });

  it('chooses the first entrance encountered rather than map order', () => {
    const w = buildWorld({ ...map, runways: [
      { ...map.runways[0]!, x1: 360, x2: 510 },
      map.runways[0]!,
    ] });
    expect(draw(w, w.runways[1]!, [[-60, 0], [150, 0]]).target).toBe(w.runways[1]);
  });

  it('preserves helipad snapping', () => {
    const w = buildWorld({ ...map, runways: [], helipads: [{ x: 300, y: 240, strips: [0] }] });
    const a = createAircraft(w.map, 0, { x: 240, y: 240 }, 0);
    const result = extendPath(w, a, { x: 330, y: 240 }, 100, createRunwayStroke(a.position));
    expect(result).toBe('snapped');
    expect(a.target).toBe(w.helipads[0]);
    expect(a.path.at(-1)).toMatchObject(w.helipads[0]!.center);
  });

  it.each([false, true])('lands representative approaches across maps with fast-forward=%s', fastForward => {
    let checked = 0;
    for (const definition of MAP_SELECTOR) {
      const w = buildWorld(definition);
      for (const zone of w.runways) for (const strip of zone.filter) {
        for (const angle of [-45, 0, 45]) for (const offset of [-20, 0, 20]) {
          const slope = Math.tan(angle * Math.PI / 180);
          const start = point(zone, [-40, offset - 40 * slope]);
          const end = point(zone, [1, offset + slope]);
          if (![start, end].every(p => p.x >= 0 && p.x <= WORLD_WIDTH && p.y >= 0 && p.y <= WORLD_HEIGHT)) continue;
          const game = createGame(definition, 1, { fastForward });
          game.director.nextSpawnAt = Infinity;
          const a = createAircraft(definition, strip, start, zone.heading + angle);
          const result = extendPath(game.world, a, end, 0, createRunwayStroke(start));
          expect(result).toBe('snapped');
          game.aircraft.push(a);
          for (let t = 0; t < 120000 && a.behaviour === 'flying' && a.path.length > 0; t += 1000 / 60) {
            updateGame(game, 1000 / 60);
          }
          expect(a.behaviour, `${definition.id}: ${strip}, ${angle}, ${offset}`).toBe('landing');
          expect(game.score).toBe(1);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('retains only the recent stroke while keeping sample spacing', () => {
    const a = createAircraft(map, 0, { x: 20, y: 100 }, 0);
    const stroke = createRunwayStroke(a.position);
    for (let x = 21; x <= 250; x++) extendPath(world, a, { x, y: 100 }, 0, stroke);
    expect(stroke.points.length).toBeLessThanOrEqual(41);
    expect(stroke.length).toBe(230);
    expect(stroke.points[0]).toEqual(lerpPoint({ x: 20, y: 100 }, { x: 250, y: 100 }, 190 / 230));
  });
});
