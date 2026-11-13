import type { Point } from '../../game/geometry';
import { between, building, fillView, helipad, patches, pick, polylineDistance, runway, scatter, smoothPath, smoothPoints, strokeLine, tree, wobblyBlob, zoneClear, type Ctx, type Scene } from '../art';
import { insidePolygon, tracePolygon } from './shared';

const NORTH: Point[] = [
  { x: -190, y: 12 }, { x: -60, y: 30 }, { x: 60, y: -8 }, { x: 170, y: 46 },
  { x: 275, y: 12 }, { x: 380, y: 66 }, { x: 480, y: 8 }, { x: 585, y: -40 },
  { x: 690, y: 14 }, { x: 795, y: 45 }, { x: 900, y: 78 }, { x: 1050, y: 100 },
];
const SOUTH: Point[] = [
  { x: -190, y: 558 }, { x: -60, y: 520 }, { x: 65, y: 548 }, { x: 175, y: 486 },
  { x: 280, y: 513 }, { x: 390, y: 475 }, { x: 495, y: 514 }, { x: 610, y: 468 },
  { x: 715, y: 423 }, { x: 820, y: 433 }, { x: 930, y: 377 }, { x: 1050, y: 396 },
];
const RIVER: Point[] = [
  { x: -190, y: 323 }, { x: -40, y: 308 }, { x: 90, y: 340 }, { x: 195, y: 327 },
  { x: 305, y: 354 }, { x: 450, y: 373 }, { x: 550, y: 368 }, { x: 650, y: 326 },
  { x: 775, y: 287 }, { x: 880, y: 271 }, { x: 1050, y: 262 },
];
const TRACK: Point[] = [
  { x: 1050, y: 232 }, { x: 890, y: 233 }, { x: 790, y: 250 },
  { x: 746, y: 232 }, { x: 732, y: 195 }, { x: 685, y: 178 },
  { x: 610, y: 191 }, { x: 558, y: 186 },
];
const FOREST = ['#426550', '#4b7057', '#55785c', '#3e604e'];

function polygon(g: Ctx, points: Point[], color: string): void {
  tracePolygon(g, points);
  g.fillStyle = color;
  g.fill();
}

function mountain(g: Ctx, scene: Scene, crest: Point[], direction: number): Point[] {
  const { rng } = scene;
  const toes = crest.map(p => ({ x: p.x + between(rng, -24, 24), y: p.y + direction * between(rng, 70, 112) }));
  const ridges = crest.slice(0, -1).map((a, i) => {
    const b = crest[i + 1]!;
    return [a, ...[0.22, 0.48, 0.73].map(t => ({
      x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + between(rng, -9, 9),
    })), b];
  });
  const spine = ridges.flat();
  const back = crest.map(p => ({ x: p.x - 30, y: p.y - direction * 140 }));
  const outline = [...back, ...toes.slice().reverse()];
  const foothills = [...back, ...toes.map(p => ({ x: p.x, y: p.y + direction * 38 })).slice().reverse()];
  smoothPath(g, foothills, true);
  g.fillStyle = '#73856a';
  g.fill();
  smoothPath(g, outline, true);
  g.fillStyle = '#899184';
  g.fill();
  g.save();
  smoothPath(g, outline, true);
  g.clip();
  polygon(g, [...back, ...spine.slice().reverse()], direction > 0 ? '#abb1a4' : '#808c87');
  polygon(g, [...spine, ...toes.slice().reverse()], direction > 0 ? '#8d9891' : '#b1b5a5');
  for (let i = 0; i < crest.length - 1; i++) {
    const a = crest[i]!;
    const b = crest[i + 1]!;
    const foot = toes[i]!;
    const next = toes[i + 1]!;
    const spur = { x: a.x + (b.x - a.x) * 0.45, y: a.y + (foot.y - a.y) * 0.56 };
    const fold = { x: foot.x + (next.x - foot.x) * 0.55, y: foot.y + (next.y - foot.y) * 0.55 };
    polygon(g, [...ridges[i]!, next, fold, spur], pick(rng, direction > 0
      ? ['#929e97', '#86958f', '#9ca59b']
      : ['#b8bcac', '#a9b1a1', '#b0b7a8']));
    polygon(g, [a, foot, fold, spur], pick(rng, ['#7f8c85', '#88948a', '#929c8f']));
    const flank = back[i]!;
    polygon(g, [...ridges[i]!, { x: b.x - 55, y: flank.y }, flank], pick(rng, direction > 0
      ? ['#b6bbad', '#a7afa2', '#bfc2b3']
      : ['#85918c', '#8e9992', '#97a097']));
    strokeLine(g, [a, spur, fold], 1.3, 'rgba(226, 230, 211, 0.28)', false);
    for (let j = 0; j < 3; j++) {
      const t = 0.25 + j * 0.21;
      const start = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      strokeLine(g, [start, { x: start.x + 8, y: start.y + direction * 22 },
        { x: fold.x + j * 9, y: fold.y - direction * 12 }], 0.8, 'rgba(57, 76, 70, 0.13)');
    }
  }
  patches(g, rng, ['rgba(220, 223, 204, 0.09)', 'rgba(53, 73, 66, 0.06)'], 90, [8, 26]);
  for (let i = 1; i < crest.length - 1; i++) {
    if (i % 3 === 0) continue;
    const snowline = [...ridges[i - 1]!.slice(3), ...ridges[i]!.slice(1, 3)];
    const snow = snowline.map((q, j) => ({ x: q.x - 3, y: q.y - [1, 8, 5, 1][j]! * between(rng, 0.6, 1.4) }));
    const melt = snowline.slice().reverse().flatMap((q, j) => [
      { x: q.x + 7, y: q.y + [3, 14, 19, 5][j]! * between(rng, 0.5, 1.3) },
      { x: q.x - 4, y: q.y + [1, 6, 11, 2][j]! },
    ]);
    smoothPath(g, [...snow, ...melt], true);
    g.fillStyle = '#dce2d7';
    g.fill();
  }
  g.restore();
  return outline;
}

function river(g: Ctx): void {
  const points = smoothPoints(RIVER, 12);
  const bank = (side: number, extra: number): Point[] => points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const width = 2.8 + Math.sin(i * 0.21) * 0.8 + extra;
    return { x: p.x - (b.y - a.y) / length * width * side, y: p.y + (b.x - a.x) / length * width * side };
  });
  polygon(g, [...bank(1, 3), ...bank(-1, 3).reverse()], '#a7ae95');
  polygon(g, [...bank(1, 0), ...bank(-1, 0).reverse()], '#638e8a');
  strokeLine(g, points, 1.3, '#98b5a8', false);
}

export function altiport(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const ground = g.createLinearGradient(0, 0, 240, 480);
  ground.addColorStop(0, '#8d9f7b');
  ground.addColorStop(0.5, '#a7b58a');
  ground.addColorStop(1, '#8e9f78');
  fillView(g, ground);
  patches(g, rng, ['rgba(203, 207, 156, 0.18)', 'rgba(93, 124, 78, 0.12)'], 60, [25, 100]);
  const north = mountain(g, scene, NORTH, 1);
  const south = mountain(g, scene, SOUTH, -1);
  const riverPoints = smoothPoints(RIVER);
  const roadPoints = smoothPoints(TRACK);
  const clear = (p: Point, margin: number): boolean => zoneClear(world, p, margin) &&
    !insidePolygon(p, north) && !insidePolygon(p, south) &&
    polylineDistance(p, riverPoints) > margin + 6 && polylineDistance(p, roadPoints) > margin + 5 &&
    !(p.x > 540 && p.x < 740 && p.y > 150 && p.y < 245);
  for (const center of scatter(rng, 110, p => clear(p, 16) &&
    (polylineDistance(p, NORTH) < 158 || polylineDistance(p, SOUTH) < 150))) {
    for (let i = 0; i < 12; i++) {
      const p = { x: center.x + between(rng, -26, 26), y: center.y + between(rng, -17, 17) };
      const r = between(rng, 2.5, 5.5);
      if (clear(p, r + 4)) tree(g, rng, p.x, p.y, r, FOREST);
    }
  }
  river(g);
  strokeLine(g, TRACK, 7, '#859078');
  strokeLine(g, TRACK, 4.5, '#c0bba0');
  const terrace = [{ x: 375, y: 234 }, { x: 545, y: 161 }];
  strokeLine(g, terrace.map(p => ({ x: p.x + 2, y: p.y + 7 })), 40, '#72816e', false);
  strokeLine(g, terrace, 39, '#b5b6a0', false);
  strokeLine(g, [{ x: 378, y: 250 }, { x: 552, y: 175 }], 2, '#d1cfb8', false);
  strokeLine(g, [{ x: 522, y: 180 }, { x: 558, y: 186 }, { x: 582, y: 205 }], 13, '#b5b6a0');
  smoothPath(g, wobblyBlob(rng, { x: 481, y: 305 }, 113, 29, 0.07, 18).map(p => ({
    x: p.x, y: p.y + (p.x - 481) / 6,
  })), true);
  g.fillStyle = '#adba8c';
  g.fill();
  polygon(g, [{ x: 560, y: 188 }, { x: 601, y: 186 }, { x: 611, y: 209 }, { x: 575, y: 219 }], '#b5b6a0');
  strokeLine(g, [{ x: 650, y: 220 }, { x: 668, y: 190 }, { x: 697, y: 191 }], 5, '#c0bba0');
  runway(g, world.runways[0]!);
  runway(g, world.runways[1]!, { surface: '#a4b47f', shoulder: '#a8b787', edge: '#f5f0d6', center: '#f5f0d6', markers: true });
  helipad(g, world.helipads[0]!, '#b0b3a1');
  building(g, 573, 180, 25, 14, '#78817a', 6);
  building(g, 688, 183, 30, 18, '#886652', 7);
  strokeLine(g, [{ x: 691, y: 186 }, { x: 715, y: 186 }], 1.5, '#d1bf9a', false);
}
