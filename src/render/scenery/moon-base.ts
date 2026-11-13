import type { Point } from '../../game/geometry';
import {
  between,
  building,
  disc,
  fillView,
  glow,
  helipad,
  padHalf,
  polylineDistance,
  pick,
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
import { along, inRect, type Rect } from './shared';

const MB_UFO_PAD = 3;
const MB_ROCKET_PAD = 2;
const MB_DOMES = [
  { x: 618, y: 300, r: 18 },
  { x: 664, y: 280, r: 14 },
  { x: 654, y: 330, r: 12 },
  { x: 700, y: 304, r: 10 },
];
const MB_LANDER_PADS = [0, 1];
const MB_TUBES: Point[][] = [
  [MB_DOMES[0]!, MB_DOMES[1]!],
  [MB_DOMES[0]!, MB_DOMES[2]!],
  [MB_DOMES[1]!, MB_DOMES[3]!],
  [MB_DOMES[0]!, { x: 541, y: 291 }],
];
const MB_HANGAR: Rect = { x: 448, y: 316, w: 46, h: 22 };
const MB_GANTRY: Rect = { x: 742, y: 370, w: 10, h: 20 };
const MB_SOLAR: Point = { x: 760, y: 238 };
const MB_DISH: Point = { x: 800, y: 190 };
const MB_TRACKS: Point[][] = [
  [{ x: 700, y: 246 }, { x: 748, y: 252 }, { x: 798, y: 252 }],
  [{ x: 748, y: 252 }, { x: 748, y: 220 }, { x: 800, y: 220 }, { x: 800, y: 200 }],
  [
    { x: 600, y: 320 },
    { x: 560, y: 352 },
    { x: 498, y: 344 },
  ],
  [
    { x: 448, y: 330 },
    { x: 380, y: 400 },
    { x: 260, y: 430 },
    { x: 120, y: 470 },
    { x: -170, y: 560 },
  ],
  [
    { x: 664, y: 290 },
    { x: 640, y: 240 },
    { x: 560, y: 210 },
    { x: 450, y: 190 },
    { x: 352, y: 176 },
  ],
  [
    { x: 672, y: 270 },
    { x: 700, y: 246 },
    { x: 724, y: 214 },
  ],
  [
    { x: 660, y: 340 },
    { x: 690, y: 362 },
    { x: 704, y: 374 },
  ],
];
const MB_BASE_KEEPOUT = { center: { x: 660, y: 300 }, r: 70 };
const REGOLITH: RunwayStyle = {
  surface: '#5d5f64',
  shoulder: '#74767b',
  edge: 'rgba(244, 242, 236, 0.9)',
  center: 'rgba(244, 242, 236, 0.85)',
  markers: true,
};
const MOON = '#87898e';

function crater(g: Ctx, x: number, y: number, r: number): void {
  disc(g, x, y, r * 1.16, '#96989d');
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#66686d';
  g.fill();
  disc(g, x + r * 0.26, y + r * 0.26, r * 0.92, '#7a7c81');
  g.restore();
}

function dome(g: Ctx, x: number, y: number, r: number): void {
  shadowed(g, r * 0.9, 0.3, () => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
  });
  disc(g, x, y, r, '#bfc4cb');
  const light = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  light.addColorStop(0, '#f2f3f5');
  light.addColorStop(1, '#aeb5c0');
  g.fillStyle = light;
  g.beginPath();
  g.arc(x, y, r - 1, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(83, 96, 116, 0.3)';
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(x, y, r * 0.45, r - 1, -0.35, 0, Math.PI * 2);
  g.stroke();
}

function solarArray(g: Ctx, origin: Point): void {
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = origin.x + col * 22;
      const y = origin.y + row * 16;
      shadowed(g, 5, 0.3, () => {
        g.beginPath();
        g.rect(x, y, 18, 10);
      });
      g.fillStyle = '#254886';
      g.fillRect(x, y, 18, 10);
      g.fillStyle = '#3560a8';
      g.fillRect(x, y, 18, 5);
      g.fillStyle = 'rgba(171, 202, 225, 0.35)';
      for (let u = 4; u < 18; u += 4) g.fillRect(x + u, y, 0.5, 10);
      g.fillRect(x, y + 5, 18, 0.5);
    }
  }
}

function dish(g: Ctx, p: Point): void {
  shadowed(g, 10, 0.3, () => {
    g.beginPath();
    g.arc(p.x, p.y, 10, 0, Math.PI * 2);
  });
  disc(g, p.x, p.y, 10, '#dcdee2');
  disc(g, p.x, p.y, 6, '#c2c5cb');
  disc(g, p.x, p.y, 1.8, '#6d7178');
}

export function moonBase(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const ufo = world.helipads[MB_UFO_PAD]!;
  const rocket = world.helipads[MB_ROCKET_PAD]!;
  const offBase = (p: Point, margin: number): boolean =>
    MB_TRACKS.every((track) => polylineDistance(p, track) > margin + 5) &&
    Math.hypot(p.x - MB_BASE_KEEPOUT.center.x, p.y - MB_BASE_KEEPOUT.center.y) > MB_BASE_KEEPOUT.r + margin &&
    !inRect(p, { x: MB_SOLAR.x, y: MB_SOLAR.y, w: 84, h: 26 }, margin) &&
    !inRect(p, MB_HANGAR, margin) &&
    !inRect(p, MB_GANTRY, margin) &&
    Math.hypot(p.x - MB_DISH.x, p.y - MB_DISH.y) > 12 + margin;

  fillView(g, MOON);
  for (let i = 0; i < 5; i++) {
    const center = { x: between(rng, -100, 950), y: between(rng, -60, 540) };
    smoothPath(g, wobblyBlob(rng, center, between(rng, 90, 180), between(rng, 60, 120), 0.2, 14), true);
    g.fillStyle = '#7b7d82';
    g.fill();
  }
  for (let i = 0; i < 90; i++) {
    const r = 4 + rng() ** 3 * 40;
    const p = { x: between(rng, -160, 1014), y: between(rng, -100, 580) };
    if (zoneClear(world, p, r + 6) && offBase(p, r + 4)) crater(g, p.x, p.y, r);
  }
  for (const track of MB_TRACKS) {
    strokeLine(g, track, 7, '#73767d');
    strokeLine(g, track, 3, '#888b91');
  }
  g.fillStyle = '#92969e';
  g.beginPath();
  g.roundRect(594, 258, 122, 90, 24);
  g.fill();
  g.fillStyle = '#777b83';
  g.fillRect(MB_SOLAR.x - 5, MB_SOLAR.y - 5, 94, 36);
  for (const i of MB_LANDER_PADS) {
    const pad = world.helipads[i]!;
    disc(g, pad.center.x, pad.center.y, padHalf(pad) + 13, '#96989d');
    disc(g, pad.center.x, pad.center.y, padHalf(pad) + 9, '#7b7d82');
  }
  for (const p of scatter(rng, 50, (q) => zoneClear(world, q, 10) && offBase(q, 6))) {
    const r = between(rng, 1.2, 3.2);
    shadowed(g, r, 0.3, () => {
      g.beginPath();
      g.ellipse(p.x, p.y, r, r * 0.75, 0, 0, Math.PI * 2);
    });
    g.fillStyle = pick(rng, ['#9a9ca1', '#a6a8ac', '#909297']);
    g.beginPath();
    g.ellipse(p.x, p.y, r, r * 0.75, 0, 0, Math.PI * 2);
    g.fill();
  }

  for (const [r, alpha] of [
    [40, 0.14],
    [27, 0.2],
    [15, 0.3],
  ] as const) {
    disc(g, rocket.center.x, rocket.center.y, r, `rgba(17, 21, 26, ${alpha})`);
  }

  crater(g, ufo.center.x, ufo.center.y, padHalf(ufo) + 12);
  for (const k of [1, 0.66, 0.34]) disc(g, ufo.center.x, ufo.center.y, (padHalf(ufo) + 12) * k, 'rgba(124, 240, 90, 0.14)');

  for (const r of world.runways) runway(g, r, REGOLITH);
  world.helipads.forEach((h, i) => {
    if (i !== MB_UFO_PAD) helipad(g, h, i === MB_ROCKET_PAD ? '#7b7d82' : '#9a9ca1');
  });

  for (const tube of MB_TUBES) {
    strokeLine(g, tube, 5, '#aeb3ba', false);
    strokeLine(g, tube, 2.5, '#e2e4e8', false);
  }
  for (const d of MB_DOMES) dome(g, d.x, d.y, d.r);
  building(g, MB_HANGAR.x, MB_HANGAR.y, MB_HANGAR.w, MB_HANGAR.h, '#b4b9c0', 9);
  building(g, MB_GANTRY.x, MB_GANTRY.y, MB_GANTRY.w, MB_GANTRY.h, '#c9732e', 16);
  g.strokeStyle = '#c9732e';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(MB_GANTRY.x, MB_GANTRY.y + MB_GANTRY.h / 2);
  g.lineTo(rocket.center.x + rocket.radius, rocket.center.y);
  g.stroke();
  for (const r of world.runways) {
    along([r.start, r.end], 24, (p, n) => {
      glow(g, p.x + n.x * 15, p.y + n.y * 15, '#ffd66b', 0.9);
      glow(g, p.x - n.x * 15, p.y - n.y * 15, '#ffd66b', 0.9);
    });
  }
  solarArray(g, MB_SOLAR);
  dish(g, MB_DISH);
}
