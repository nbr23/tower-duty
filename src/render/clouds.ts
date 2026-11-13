import { VIEW } from '../config/world';
import { mulberry32, type Rng } from '../game/rng';
import type { World } from '../game/world';
import { seedFor } from './background';

const PUFF_W = 220;
const PUFF_H = 120;
const PUFF_RESOLUTION = 2;
const PUFF_SHAPES = 3;
const DRIFT = { x: 1, y: 0.12 };
const CLOUD_RGB = '255, 255, 255';
const ASH_RGB = '74, 66, 62';
const SHADOW_RGB = '17, 21, 26';
const SHADOW_OFFSET = { x: 10, y: 14 };
const SHADOW_ALPHA = 0.3;
const SPRITE_W = PUFF_W + SHADOW_OFFSET.x;
const SPRITE_H = PUFF_H + SHADOW_OFFSET.y;
const PUFF_BASE = 0.72;
const PUFF_LIT = 0.6;
const SNOW_DRIFT = { x: 0.35, y: 1 };
const SNOW_SWAY_RATE = 1.3;

interface LayerSpec {
  count: number;
  scale: number;
  alpha: number;
  speed: number;
}

const LAYERS: readonly LayerSpec[] = [
  { count: 4, scale: 0.7, alpha: 0.2, speed: 4 },
  { count: 3, scale: 1.2, alpha: 0.35, speed: 8 },
];

interface Cloud {
  x: number;
  y: number;
  shape: number;
  scale: number;
}

interface Layer {
  spec: LayerSpec;
  clouds: Cloud[];
}

interface FlakeSpec {
  count: number;
  size: readonly [number, number];
  alpha: number;
  speed: number;
  sway: number;
}

const SNOW_LAYERS: readonly FlakeSpec[] = [
  { count: 90, size: [0.6, 1.2], alpha: 0.55, speed: 14, sway: 4 },
  { count: 50, size: [1.2, 2.2], alpha: 0.8, speed: 26, sway: 7 },
];

interface Flake {
  x: number;
  y: number;
  r: number;
  phase: number;
}

interface Snowfall {
  spec: FlakeSpec;
  flakes: Flake[];
}

const puffs = new Map<string, HTMLCanvasElement[]>();
const layouts = new Map<string, Layer[]>();
const snowfalls = new Map<string, Snowfall[]>();

function paintPuff(rng: Rng, rgb: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W * PUFF_RESOLUTION;
  canvas.height = SPRITE_H * PUFF_RESOLUTION;
  const g = canvas.getContext('2d')!;
  g.scale(PUFF_RESOLUTION, PUFF_RESOLUTION);
  const blobs = 5 + Math.floor(rng() * 3);
  const circles = Array.from({ length: blobs }, (_, i) => {
    const t = (i + 0.5) / blobs;
    return {
      x: PUFF_W * (0.2 + 0.6 * t) + (rng() - 0.5) * 20,
      y: PUFF_H * 0.5 + (rng() - 0.5) * 24,
      r: PUFF_H * (0.17 + 0.13 * Math.sin(t * Math.PI) + rng() * 0.06),
    };
  });
  const union = (scale: number, shift: number, dx = 0, dy = 0): void => {
    g.beginPath();
    for (const c of circles) {
      const r = c.r * scale;
      const x = c.x - c.r * shift + dx;
      const y = c.y - c.r * shift + dy;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, Math.PI * 2);
    }
    g.fill();
  };
  g.fillStyle = `rgba(${SHADOW_RGB}, ${SHADOW_ALPHA})`;
  union(1, 0, SHADOW_OFFSET.x, SHADOW_OFFSET.y);
  g.fillStyle = `rgba(${rgb}, ${PUFF_BASE})`;
  union(1, 0);
  g.fillStyle = `rgba(${rgb}, ${PUFF_LIT})`;
  union(0.62, 0.18);
  return canvas;
}

function puffSprites(rgb: string): HTMLCanvasElement[] {
  let sprites = puffs.get(rgb);
  if (sprites === undefined) {
    const rng = mulberry32(seedFor('clouds'));
    sprites = Array.from({ length: PUFF_SHAPES }, () => paintPuff(rng, rgb));
    puffs.set(rgb, sprites);
  }
  return sprites;
}

function layoutFor(key: string): Layer[] {
  let layers = layouts.get(key);
  if (layers === undefined) {
    const rng = mulberry32(seedFor(`clouds:${key}`));
    layers = LAYERS.map((spec) => ({
      spec,
      clouds: Array.from({ length: spec.count }, (_, i) => ({
        x: ((i + rng()) / spec.count) * VIEW.w,
        y: rng() * VIEW.h,
        shape: Math.floor(rng() * PUFF_SHAPES),
        scale: spec.scale * (0.8 + rng() * 0.4),
      })),
    }));
    layouts.set(key, layers);
  }
  return layers;
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function snowFor(key: string): Snowfall[] {
  let layers = snowfalls.get(key);
  if (layers === undefined) {
    const rng = mulberry32(seedFor(`snow:${key}`));
    layers = SNOW_LAYERS.map((spec) => ({
      spec,
      flakes: Array.from({ length: spec.count }, () => ({
        x: rng() * VIEW.w,
        y: rng() * VIEW.h,
        r: spec.size[0] + rng() * (spec.size[1] - spec.size[0]),
        phase: rng() * Math.PI * 2,
      })),
    }));
    snowfalls.set(key, layers);
  }
  return layers;
}

function drawSnow(ctx: CanvasRenderingContext2D, key: string, clock: number): void {
  const t = clock / 1000;
  ctx.save();
  ctx.fillStyle = '#f4f8fb';
  for (const { spec, flakes } of snowFor(key)) {
    ctx.globalAlpha = spec.alpha;
    const travel = t * spec.speed;
    ctx.beginPath();
    for (const f of flakes) {
      const sway = Math.sin(t * SNOW_SWAY_RATE + f.phase) * spec.sway;
      const x = VIEW.x + wrap(f.x + travel * SNOW_DRIFT.x + sway, VIEW.w);
      const y = VIEW.y + wrap(f.y + travel * SNOW_DRIFT.y, VIEW.h);
      ctx.moveTo(x + f.r, y);
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawPuffs(ctx: CanvasRenderingContext2D, key: string, clock: number, rgb: string): void {
  const sprites = puffSprites(rgb);
  ctx.save();
  for (const { spec, clouds } of layoutFor(key)) {
    ctx.globalAlpha = spec.alpha;
    const travel = (clock / 1000) * spec.speed;
    for (const cloud of clouds) {
      const w = SPRITE_W * cloud.scale;
      const h = SPRITE_H * cloud.scale;
      const x = VIEW.x - w + wrap(cloud.x + travel * DRIFT.x, VIEW.w + w);
      const y = VIEW.y - h + wrap(cloud.y + travel * DRIFT.y, VIEW.h + h);
      ctx.drawImage(sprites[cloud.shape]!, x, y, w, h);
    }
  }
  ctx.restore();
}

export function drawClouds(ctx: CanvasRenderingContext2D, world: World, clock: number): void {
  const { background, weather } = world.map;
  if (weather === 'snow') drawSnow(ctx, background, clock);
  else drawPuffs(ctx, background, clock, weather === 'ash' ? ASH_RGB : CLOUD_RGB);
}
