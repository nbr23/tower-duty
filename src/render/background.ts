import { VIEW, WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { mulberry32 } from '../game/rng';
import type { World } from '../game/world';
import { PAINTERS, paintPlain } from './scenery';

const MIN_RESOLUTION = 0.5;
const MAX_RESOLUTION = 3;
const CACHE_SIZE = 2;

const cache = new Map<string, HTMLCanvasElement>();

export function seedFor(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

function resolutionFor(ctx: CanvasRenderingContext2D): number {
  const t = ctx.getTransform();
  const scale = Math.hypot(t.a, t.b);
  return Math.min(MAX_RESOLUTION, Math.max(MIN_RESOLUTION, Math.ceil(scale * 2) / 2));
}

export function paintArt(g: CanvasRenderingContext2D, world: World): void {
  const painter = PAINTERS[world.map.background];
  g.save();
  try {
    if (painter === undefined) paintPlain(g);
    else painter(g, { world, rng: mulberry32(seedFor(world.map.background)) });
  } finally {
    g.restore();
  }
}

function paint(world: World, resolution: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(VIEW.w * resolution);
  canvas.height = Math.ceil(VIEW.h * resolution);
  const g = canvas.getContext('2d')!;
  g.setTransform(resolution, 0, 0, resolution, -VIEW.x * resolution, -VIEW.y * resolution);
  paintArt(g, world);
  return canvas;
}

function cached(world: World, resolution: number): HTMLCanvasElement {
  const key = `${world.map.id}@${resolution}`;
  let canvas = cache.get(key);
  if (canvas === undefined) {
    canvas = paint(world, resolution);
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
  } else {
    cache.delete(key);
  }
  cache.set(key, canvas);
  return canvas;
}

export function drawBackground(ctx: CanvasRenderingContext2D, world: World, bleed: boolean): void {
  const resolution = resolutionFor(ctx);
  const canvas = cached(world, resolution);
  if (bleed) {
    ctx.drawImage(canvas, VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    return;
  }
  ctx.drawImage(
    canvas,
    -VIEW.x * resolution,
    -VIEW.y * resolution,
    WORLD_WIDTH * resolution,
    WORLD_HEIGHT * resolution,
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );
}
