import { isActive, SCATTER_MS, type Flock } from '../game/flocks';
import { mulberry32 } from '../game/rng';
import { drawCues } from './aircraft';

const BIRD_SPAN = 14;
const BIRD_INK = '#293432';
const BIRD_BODY = '#e7e7d8';
const FLAP_RATE = 0.009;
const SCATTER_FLAP_RATE = 0.019;
const DRIFT_RATE = 0.0013;
const DRIFT = 0.07;
const SCATTER_REACH = 2.6;
const SHADOW = { x: 4, y: 6, alpha: 0.18 };
const CUE_COLOR = '#ffb648';

interface Bird {
  u: number;
  v: number;
  phase: number;
}

const formations = new WeakMap<Flock, Bird[]>();

function formation(f: Flock): Bird[] {
  let birds = formations.get(f);
  if (birds === undefined) {
    const rng = mulberry32(f.seed);
    const r = f.radius;
    birds = Array.from({ length: f.birds }, (_, i) => {
      const rank = Math.ceil(i / 2);
      const side = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
      return {
        u: r * (0.55 - rank * 0.32 + (rng() - 0.5) * 0.14),
        v: r * (side * rank * 0.3 + (rng() - 0.5) * 0.14),
        phase: rng() * Math.PI * 2,
      };
    });
    formations.set(f, birds);
  }
  return birds;
}

function drawBird(ctx: CanvasRenderingContext2D, flap: number, shadow: boolean): void {
  const half = (BIRD_SPAN / 2) * (0.72 + 0.28 * flap);
  const sweep = 1.3 + (1 - flap) * 0.8;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(1.1, side * 0.5);
    ctx.lineTo(1.4, side * half * 0.42);
    ctx.lineTo(-sweep, side * half);
    ctx.lineTo(-sweep - 1.2, side * half * 0.92);
    ctx.lineTo(-1.8, side * half * 0.35);
    ctx.lineTo(-1.6, side * 0.5);
    ctx.closePath();
    ctx.fillStyle = shadow ? BIRD_INK : BIRD_BODY;
    ctx.fill();
    if (!shadow) {
      ctx.beginPath();
      ctx.moveTo(0.2, side * half * 0.67);
      ctx.lineTo(-sweep, side * half);
      ctx.lineTo(-sweep - 1.2, side * half * 0.92);
      ctx.lineTo(-1.9, side * half * 0.6);
      ctx.closePath();
      ctx.fillStyle = BIRD_INK;
      ctx.fill();
    }
  }
  ctx.fillStyle = shadow ? BIRD_INK : '#aab8ad';
  ctx.beginPath();
  ctx.moveTo(-1.3, 0);
  ctx.lineTo(-4.2, -1.4);
  ctx.lineTo(-3.8, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shadow ? BIRD_INK : '#f5f1de';
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.9, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BIRD_INK;
  ctx.beginPath();
  ctx.moveTo(2.3, -0.55);
  ctx.lineTo(4, 0);
  ctx.lineTo(2.3, 0.55);
  ctx.fill();
}

function birdAt(f: Flock, bird: Bird, clock: number, scatter: number): { x: number; y: number } {
  const drift = Math.sin(clock * DRIFT_RATE + bird.phase) * DRIFT * f.radius;
  const u = bird.u + drift;
  const v = bird.v + Math.cos(clock * DRIFT_RATE * 0.8 + bird.phase) * DRIFT * f.radius;
  if (scatter === 0) return { x: u, y: v };
  const len = Math.hypot(u, v) || 1;
  const push = scatter * SCATTER_REACH * f.radius;
  return { x: u + (u / len) * push, y: v + (v / len) * push };
}

function drawFlock(ctx: CanvasRenderingContext2D, f: Flock, clock: number): void {
  const scatter = f.struckAt === undefined ? 0 : Math.min(1, (clock - f.struckAt) / SCATTER_MS);
  const rate = scatter > 0 ? SCATTER_FLAP_RATE : FLAP_RATE;
  const birds = formation(f).map((bird) => {
    const glide = scatter === 0 ? Math.max(0, Math.min(1, (Math.sin(clock * 0.0007 + bird.phase) - 0.05) * 4)) : 0;
    const flap = Math.sin(clock * rate + bird.phase) * (1 - glide) + 0.85 * glide;
    return { ...birdAt(f, bird, clock, scatter), flap };
  });
  const heading = (f.heading * Math.PI) / 180;
  const trace = (dx: number, dy: number, shadow: boolean): void => {
    ctx.save();
    ctx.translate(f.position.x + dx, f.position.y + dy);
    ctx.rotate(heading);
    for (const b of birds) {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (scatter > 0) ctx.rotate(Math.atan2(b.y, b.x) * scatter);
      drawBird(ctx, b.flap, shadow);
      ctx.restore();
    }
    ctx.restore();
  };
  ctx.globalAlpha = SHADOW.alpha * (1 - scatter);
  trace(SHADOW.x, SHADOW.y, true);
  ctx.globalAlpha = 1 - scatter;
  trace(0, 0, false);
}

export function drawFlocks(ctx: CanvasRenderingContext2D, flocks: readonly Flock[], clock: number): void {
  ctx.save();
  for (const f of flocks) drawFlock(ctx, f, clock);
  ctx.restore();
}

export function drawFlockCues(ctx: CanvasRenderingContext2D, flocks: readonly Flock[], clock: number): void {
  drawCues(ctx, flocks.filter((f) => isActive(f) && f.travelled < f.length / 2), clock, CUE_COLOR);
}
