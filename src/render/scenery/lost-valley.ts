import type { Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import type { HelipadZone } from '../../game/world';
import {
  between,
  disc,
  fillView,
  helipad,
  padHalf,
  patches,
  pick,
  polylineDistance,
  runway,
  scatter,
  shadowed,
  smoothPath,
  strokeLine,
  wobblyBlob,
  zoneClear,
  type Ctx,
  type RunwayStyle,
  type Scene,
} from '../art';
import { along, insidePolygon, jetty, runwayStrip } from './shared';

const CLIFF: Point[] = [
  { x: -170, y: 214 }, { x: -20, y: 232 }, { x: 80, y: 260 }, { x: 150, y: 300 },
  { x: 188, y: 360 }, { x: 206, y: 430 }, { x: 214, y: 500 }, { x: 220, y: 600 },
];
const LOWLAND: Point[] = [...CLIFF, { x: -170, y: 600 }];
const RIVER: Point[] = [
  { x: 610, y: -120 }, { x: 592, y: -30 }, { x: 566, y: 40 }, { x: 505, y: 102 },
  { x: 430, y: 150 }, { x: 365, y: 200 }, { x: 300, y: 250 }, { x: 240, y: 280 },
  { x: 196, y: 292 }, { x: 160, y: 304 },
];
const LIP: Point = { x: 160, y: 304 };
const POOL: Point = { x: 112, y: 348 };
const LOWER_RIVER: Point[] = [POOL, { x: 84, y: 390 }, { x: 40, y: 430 }, { x: -20, y: 480 }, { x: -170, y: 530 }];
const TEMPLE: Point = { x: 806, y: 92 };
const RUBBLE: readonly Point[] = [{ x: 96, y: 92 }, { x: 236, y: 52 }, { x: 520, y: 300 }];
const TEMPLE_TIERS: readonly (readonly [half: number, color: string])[] = [
  [26, '#7f7a68'],
  [19, '#8f8a76'],
  [12, '#a19b85'],
  [6, '#b2ab93'],
];
const RIVER_HALF = 17;
const RUINS_REACH = 104;
const STRIP_CLEARING = 30;
const PAD_CLEARING = 30;
const CANOPY = ['#345e44', '#416e48', '#385d3c', '#52734a', '#2d5943'];
const FAR_CANOPY = ['#2e5145', '#395e50', '#284b41', '#456858'];
const FLOOR = ['rgba(96, 116, 64, 0.12)', 'rgba(22, 55, 39, 0.18)', 'rgba(139, 137, 77, 0.08)'];
const STONE = '#9a937d';
const STONE_DARK = '#6f6a5a';
const MUD = '#777a59';
const WATER = '#4e8985';
const WATER_DEEP = '#2c6367';
const CLEARING = '#78815a';
const DIRT_RUNWAY: RunwayStyle = {
  surface: '#a98557',
  shoulder: '#8c7a4c',
  edge: 'rgba(244, 236, 214, 0.65)',
  center: 'rgba(244, 236, 214, 0.5)',
};
const WATER_LANE: RunwayStyle = {
  surface: 'rgba(255, 255, 255, 0.06)',
  edge: '#ff8a2a',
  center: '#ff8a2a',
  markers: true,
};

function crown(g: Ctx, rng: Rng, p: Point, radius: number, colors = CANOPY): void {
  const outline = wobblyBlob(rng, p, radius, radius * 0.85, 0.24, 12);
  shadowed(g, radius * 1.4, 0.28, () => smoothPath(g, outline, true));
  smoothPath(g, outline, true);
  g.fillStyle = '#234838';
  g.fill();
  const color = pick(rng, colors);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const reach = radius * (i === 0 ? 0 : between(rng, 0.25, 0.55));
    const x = p.x + Math.cos(angle) * reach;
    const y = p.y + Math.sin(angle) * reach;
    smoothPath(g, wobblyBlob(rng, { x, y }, radius * 0.5, radius * 0.42, 0.28, 8), true);
    const light = g.createLinearGradient(x - radius * 0.4, y - radius * 0.5, x + radius * 0.4, y + radius * 0.5);
    light.addColorStop(0, color);
    light.addColorStop(1, '#294f39');
    g.fillStyle = light;
    g.fill();
    for (let k = 0; k < 3; k++) {
      const lx = x + between(rng, -0.3, 0.2) * radius;
      const ly = y + between(rng, -0.3, 0.1) * radius;
      g.fillStyle = 'rgba(184, 193, 118, 0.15)';
      g.beginPath();
      g.ellipse(lx, ly, radius * 0.16, radius * 0.07, -0.65, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function clearingGround(g: Ctx, rng: Rng, center: Point, rx: number, ry: number): void {
  const outline = wobblyBlob(rng, center, rx, ry, 0.15, 22);
  smoothPath(g, outline, true);
  const earth = g.createRadialGradient(center.x, center.y, 4, center.x, center.y, Math.max(rx, ry));
  earth.addColorStop(0, '#999170');
  earth.addColorStop(0.55, CLEARING);
  earth.addColorStop(1, '#4c6544');
  g.fillStyle = earth;
  g.fill();
  g.save();
  g.clip();
  g.globalAlpha = 0.4;
  for (let i = 0; i < Math.min(300, rx * ry / 20); i++) {
    const x = center.x + between(rng, -rx, rx);
    const y = center.y + between(rng, -ry, ry);
    strokeLine(g, [{ x, y }, { x: x + between(rng, 1, 3), y: y - 1 }], 0.6, pick(rng, ['#65734e', '#a7a17b', '#79835a']), false);
  }
  g.restore();
}

function lowland(g: Ctx, rng: Rng): void {
  smoothPath(g, LOWLAND, true);
  g.fillStyle = '#244630';
  g.fill();
  strokeLine(g, LOWER_RIVER, 16, '#6b6a4c');
  strokeLine(g, LOWER_RIVER, 11, '#3f747a');
  for (const p of scatter(rng, 1400, (q) => insidePolygon(q, LOWLAND) && polylineDistance(q, LOWER_RIVER) > 10 && polylineDistance(q, CLIFF) > 18)) {
    crown(g, rng, p, between(rng, 3, 6), FAR_CANOPY);
  }
  const haze = g.createLinearGradient(200, 300, -60, 560);
  haze.addColorStop(0, 'rgba(206, 226, 222, 0.08)');
  haze.addColorStop(1, 'rgba(206, 226, 222, 0.18)');
  smoothPath(g, LOWLAND, true);
  g.fillStyle = haze;
  g.fill();
}

function cliff(g: Ctx, rng: Rng): void {
  const face = CLIFF.map((p) => ({ x: p.x - 10, y: p.y + 13 }));
  strokeLine(g, face, 35, 'rgba(18, 35, 29, 0.45)');
  for (const [offset, width, color] of [[12, 20, '#4b5144'], [7, 15, '#68705a'], [2, 7, '#8b8a6a']] as const) {
    strokeLine(g, CLIFF.map((p) => ({ x: p.x - offset, y: p.y + offset })), width, color);
  }
  along(CLIFF, 9, (p, normal) => {
    const d = between(rng, 7, 23);
    const from = { x: p.x + between(rng, -2, 2), y: p.y + between(rng, 0, 3) };
    const width = between(rng, 3, 10);
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(from.x - normal.y * width, from.y + normal.x * width);
    g.lineTo(p.x + normal.x * d - normal.y * width * 0.6 - 3, p.y + normal.y * d + normal.x * width * 0.6 + 5);
    g.lineTo(p.x + normal.x * d - 3, p.y + normal.y * d + 5);
    g.closePath();
    g.fillStyle = pick(rng, ['rgba(29, 39, 30, 0.3)', 'rgba(170, 162, 124, 0.22)', 'rgba(52, 70, 47, 0.35)']);
    g.fill();
  });
  strokeLine(g, CLIFF, 1.5, 'rgba(181, 177, 130, 0.55)');
}

function river(g: Ctx, rng: Rng): void {
  strokeLine(g, RIVER, RIVER_HALF * 2 + 15, '#52664c');
  strokeLine(g, RIVER, RIVER_HALF * 2 + 6, MUD);
  strokeLine(g, RIVER, RIVER_HALF * 2, WATER);
  g.save();
  g.globalAlpha = 0.13;
  for (let width = RIVER_HALF * 1.8; width > 5; width -= 3) strokeLine(g, RIVER, width, WATER_DEEP);
  g.restore();
  along(RIVER, 6, (p, normal) => {
    const offset = between(rng, -12, 12);
    const x = p.x + normal.x * offset;
    const y = p.y + normal.y * offset;
    const length = between(rng, 3, 10);
    strokeLine(g, [{ x, y }, { x: x - normal.y * length, y: y + normal.x * length }], between(rng, 0.4, 0.9), 'rgba(197, 223, 204, 0.2)', false);
  });
  along(RIVER, 11, (p, normal) => {
    const side = rng() < 0.5 ? -1 : 1;
    const q = { x: p.x + normal.x * side * (RIVER_HALF + 2), y: p.y + normal.y * side * (RIVER_HALF + 2) };
    smoothPath(g, wobblyBlob(rng, q, between(rng, 1.5, 4), between(rng, 1, 2.5), 0.25, 7), true);
    g.fillStyle = pick(rng, ['#7b8266', '#93947a', '#536b55']);
    g.fill();
  });
}

function waterfall(g: Ctx, rng: Rng): void {
  smoothPath(g, wobblyBlob(rng, POOL, 28, 23, 0.12), true);
  g.fillStyle = '#4d8c8a';
  g.fill();
  const dx = POOL.x - LIP.x;
  const dy = POOL.y - LIP.y;
  const sheet = g.createLinearGradient(LIP.x, LIP.y, POOL.x, POOL.y);
  sheet.addColorStop(0, '#98c2b8');
  sheet.addColorStop(0.35, '#d2e6dc');
  sheet.addColorStop(1, '#89bcb5');
  g.fillStyle = sheet;
  g.beginPath();
  g.moveTo(LIP.x - 10, LIP.y - 12);
  g.lineTo(LIP.x + 10, LIP.y + 12);
  g.lineTo(POOL.x + 13, POOL.y + 9);
  g.quadraticCurveTo(POOL.x, POOL.y + 5, POOL.x - 12, POOL.y - 9);
  g.closePath();
  g.fill();
  for (let i = 0; i < 25; i++) {
    const spread = between(rng, -16, 16);
    const from = { x: LIP.x + spread * 0.55, y: LIP.y + spread * 0.75 };
    const to = { x: from.x + dx * between(rng, 0.8, 1.05), y: from.y + dy * between(rng, 0.8, 1.05) };
    strokeLine(g, [from, to], between(rng, 0.5, 1.4), `rgba(244, 250, 240, ${between(rng, 0.25, 0.65).toFixed(2)})`, false);
  }
  for (let i = 0; i < 45; i++) {
    const a = rng() * Math.PI * 2;
    const r = between(rng, 3, 19);
    disc(g, POOL.x + Math.cos(a) * r, POOL.y + Math.sin(a) * r * 0.6, between(rng, 0.6, 2.5), 'rgba(231, 244, 229, 0.3)');
  }
  for (const r of [20, 28, 37]) {
    g.strokeStyle = 'rgba(207, 232, 219, 0.24)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(POOL.x, POOL.y, r, r * 0.65, -0.65, 0.2, 2.5);
    g.stroke();
  }
  const mist = g.createRadialGradient(POOL.x, POOL.y, 6, POOL.x, POOL.y, 140);
  mist.addColorStop(0, 'rgba(236, 244, 242, 0.35)');
  mist.addColorStop(1, 'rgba(236, 244, 242, 0)');
  fillView(g, mist);
}

function stoneBlock(g: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  shadowed(g, 4, 0.28, () => {
    g.beginPath();
    g.rect(x, y, w, h);
  });
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255, 255, 255, 0.12)';
  g.fillRect(x, y, w, Math.min(2, h / 3));
}

function vines(g: Ctx, rng: Rng, center: Point, reach: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const side = Math.floor(rng() * 4);
    const angle = side * Math.PI / 2;
    const offset = between(rng, -reach, reach);
    g.save();
    g.translate(center.x, center.y);
    g.rotate(angle);
    const length = between(rng, 5, 13);
    const bend = between(rng, -4, 4);
    strokeLine(g, [{ x: reach + 3, y: offset }, { x: reach - length * 0.4, y: offset + bend }, { x: reach - length, y: offset + bend * 0.6 }], 0.65, '#3e5634');
    for (let k = 0; k < length; k += 1.8) {
      const x = reach + 2 - k;
      const y = offset + Math.sin(k / length * Math.PI) * bend;
      for (const sign of [-1, 1]) {
        const size = between(rng, 1.3, 2.4) * (1 - k / length * 0.45);
        g.beginPath();
        g.ellipse(x - size * 0.5, y + sign * size * 0.65, size, size * 0.45, sign * 0.7, 0, Math.PI * 2);
        g.fillStyle = pick(rng, ['#3b5c37', '#516d3e', '#6f804b']);
        g.fill();
      }
    }
    g.restore();
  }
}

function mastRuins(g: Ctx, rng: Rng, pad: HelipadZone): void {
  const { x, y } = pad.center;
  const half = pad.radius + 6;
  stoneBlock(g, x - half, y - half, half * 2, half * 2, STONE_DARK);
  stoneBlock(g, x - half + 9, y - half + 9, half * 2 - 18, half * 2 - 18, STONE);
  g.strokeStyle = 'rgba(40, 38, 30, 0.25)';
  g.lineWidth = 0.8;
  for (let v = y - half + 9; v < y + half - 9; v += 13) {
    g.beginPath();
    g.moveTo(x - half + 9, v);
    g.lineTo(x + half - 9, v);
    g.stroke();
    const stagger = Math.round((v - y + half - 9) / 13) % 2 * 11;
    for (let u = x - half + 20 + stagger; u < x + half - 9; u += 22) {
      g.beginPath();
      g.moveTo(u, v);
      g.lineTo(u, Math.min(v + 13, y + half - 9));
      g.stroke();
    }
  }
  for (let i = 0; i < 250; i++) {
    const px = x + between(rng, -half + 9, half - 9);
    const py = y + between(rng, -half + 9, half - 9);
    disc(g, px, py, between(rng, 0.3, 1.2), pick(rng, ['rgba(59, 61, 45, 0.12)', 'rgba(224, 216, 177, 0.2)']));
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const px = x + Math.cos(a) * (half + 14);
    const py = y + Math.sin(a) * (half + 14);
    stoneBlock(g, px - 5, py - 5, 10, 10, STONE);
    disc(g, px, py, 2.5, '#c1b99f');
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      if (rng() < 0.35) continue;
      stoneBlock(g, x + side * (half + 26) - 3, y - 30 + k * 22, 6, between(rng, 8, 16), STONE_DARK);
    }
  }
  vines(g, rng, pad.center, half - 1, 22);
  g.strokeStyle = 'rgba(17, 21, 26, 0.26)';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + 22, y + 30);
  g.stroke();
  g.fillStyle = '#5c4a36';
  g.beginPath();
  g.roundRect(x - 5, y - 5, 10, 10, 2);
  g.fill();
  disc(g, x, y, 3, '#d3be86');
}

function temple(g: Ctx, rng: Rng): void {
  for (const [half, color] of TEMPLE_TIERS) stoneBlock(g, TEMPLE.x - half, TEMPLE.y - half, half * 2, half * 2, color);
  g.fillStyle = '#4b463a';
  g.fillRect(TEMPLE.x - 3, TEMPLE.y + 6, 6, 20);
  vines(g, rng, TEMPLE, 25, 14);
}

function rubble(g: Ctx, rng: Rng, at: Point): void {
  for (let i = 0; i < 6; i++) {
    const w = between(rng, 5, 11);
    const h = between(rng, 4, 8);
    stoneBlock(g, at.x + between(rng, -16, 16) - w / 2, at.y + between(rng, -12, 12) - h / 2, w, h, pick(rng, [STONE, STONE_DARK]));
  }
  vines(g, rng, at, 18, 5);
}

function camp(g: Ctx, rng: Rng, at: Point): void {
  for (const [i, color] of ['#c6b07a', '#7c8a56', '#c6b07a'].entries()) {
    const x = at.x + i * 14;
    shadowed(g, 3, 0.25, () => {
      g.beginPath();
      g.moveTo(x, at.y - 5);
      g.lineTo(x + 6, at.y + 5);
      g.lineTo(x - 6, at.y + 5);
      g.closePath();
    });
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, at.y - 5);
    g.lineTo(x + 6, at.y + 5);
    g.lineTo(x - 6, at.y + 5);
    g.closePath();
    g.fill();
  }
  for (let i = 0; i < 4; i++) disc(g, at.x + 44 + (i % 2) * 4, at.y + Math.floor(i / 2) * 4, 1.8, pick(rng, ['#b8452f', '#5f6e7a']));
}

export function lostValley(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const strip = world.runways[0]!;
  const lane = world.runways[1]!;
  const clearing = world.helipads[0]!;
  const mast = world.helipads[1]!;
  const stripAxis = [strip.start, strip.end];
  const plateau = (p: Point): boolean => !insidePolygon(p, LOWLAND) && polylineDistance(p, CLIFF) > 16;
  const open = (p: Point, margin: number): boolean =>
    plateau(p) &&
    zoneClear(world, p, margin) &&
    polylineDistance(p, RIVER) > RIVER_HALF + 8 + margin &&
    polylineDistance(p, stripAxis) > STRIP_CLEARING + margin &&
    Math.hypot(p.x - clearing.center.x, p.y - clearing.center.y) > padHalf(clearing) + PAD_CLEARING + margin &&
    Math.hypot(p.x - mast.center.x, p.y - mast.center.y) > RUINS_REACH + margin &&
    Math.max(Math.abs(p.x - TEMPLE.x), Math.abs(p.y - TEMPLE.y)) > 34 + margin &&
    RUBBLE.every((r) => Math.hypot(p.x - r.x, p.y - r.y) > 22 + margin);

  fillView(g, '#395c40');
  patches(g, rng, FLOOR, 80, [40, 130], plateau);
  lowland(g, rng);
  cliff(g, rng);
  river(g, rng);
  waterfall(g, rng);

  g.save();
  g.translate((strip.start.x + strip.end.x) / 2, (strip.start.y + strip.end.y) / 2);
  g.rotate(strip.heading * Math.PI / 180);
  clearingGround(g, rng, { x: 0, y: 0 }, strip.length / 2 + 38, STRIP_CLEARING + 6);
  g.restore();
  runwayStrip(g, strip, 20, 16);
  runway(g, strip, DIRT_RUNWAY);
  camp(g, rng, { x: 620, y: 352 });
  runway(g, lane, WATER_LANE);
  const bank = { x: lane.end.x - 16, y: lane.end.y + 22 };
  jetty(g, bank, { x: lane.end.x - 4, y: lane.end.y + 6 });

  clearingGround(g, rng, clearing.center, padHalf(clearing) + PAD_CLEARING + 5, padHalf(clearing) + PAD_CLEARING - 3);
  clearingGround(g, rng, mast.center, RUINS_REACH, RUINS_REACH * 0.9);
  helipad(g, clearing, '#a39a7c');
  mastRuins(g, rng, mast);
  temple(g, rng);
  for (const at of RUBBLE) rubble(g, rng, at);

  const trees: { p: Point; r: number }[] = [];
  for (const center of scatter(rng, 360, (p) => open(p, 6))) {
    for (let i = 0; i < 7; i++) {
      const p = { x: center.x + between(rng, -22, 22), y: center.y + between(rng, -18, 18) };
      const r = between(rng, 5, 11);
      if (!open(p, r + 1)) continue;
      trees.push({ p, r });
    }
  }
  trees.sort((a, b) => a.p.y - b.p.y);
  for (const { p, r } of trees) crown(g, rng, p, r);
  along(RIVER, 9, (p, normal) => {
    if (!plateau(p) || rng() > 0.55) return;
    const side = rng() < 0.5 ? -1 : 1;
    const q = { x: p.x + normal.x * side * (RIVER_HALF + 10), y: p.y + normal.y * side * (RIVER_HALF + 10) };
    if (open(q, -6)) crown(g, rng, q, between(rng, 3.5, 6));
  });
}
