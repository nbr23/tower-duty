import type { Aircraft } from '../game/aircraft';
import type { Crash } from '../game/game';
import { mulberry32 } from '../game/rng';

const RING_PAD = 6;
const RING_WIDTH = 3;
const RING_FLASH_MS = 150;
const RING_COLOR = '#ff3b30';
const RING_FILL = 'rgba(255, 59, 48, 0.16)';

const FX_DURATION_MS = 1200;
const FX_RADIUS = 150;
const FX_SPARKS = 18;
const SMOKE_RADIUS = 45;
const SMOKE_ALPHA = 0.35;
const SMOKE_PUFFS = 5;
const SHARD_COLORS = ['#ffd02e', '#ff8a2a'];
const CORE_STEPS: readonly (readonly [number, string])[] = [
  [1, '#ff8a2a'],
  [0.66, '#ffd02e'],
  [0.34, '#ffffff'],
];

export function drawWarningRings(ctx: CanvasRenderingContext2D, aircraft: readonly Aircraft[], clock: number): void {
  if (Math.floor(clock / RING_FLASH_MS) % 2 === 1) return;
  ctx.save();
  ctx.strokeStyle = RING_COLOR;
  ctx.fillStyle = RING_FILL;
  ctx.lineWidth = RING_WIDTH;
  for (const a of aircraft) {
    if (!a.flags.danger) continue;
    ctx.beginPath();
    ctx.arc(a.position.x, a.position.y, a.radius + RING_PAD, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSmoke(ctx: CanvasRenderingContext2D, crash: Crash, index: number, t: number): void {
  const grow = Math.min(1, t * 2);
  const rng = mulberry32(index + 101);
  ctx.fillStyle = `rgba(17, 21, 26, ${SMOKE_ALPHA})`;
  ctx.beginPath();
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const angle = rng() * Math.PI * 2;
    const reach = SMOKE_RADIUS * 0.5 * rng() * grow;
    const r = SMOKE_RADIUS * (0.4 + 0.3 * rng()) * grow;
    const x = crash.at.x + Math.cos(angle) * reach;
    const y = crash.at.y + Math.sin(angle) * reach;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawBurst(ctx: CanvasRenderingContext2D, crash: Crash, index: number, t: number): void {
  const { x, y } = crash.at;
  const ease = 1 - (1 - t) ** 3;
  const fade = 1 - t;

  ctx.globalAlpha = fade;
  ctx.strokeStyle = '#f4f2ec';
  ctx.lineWidth = 6 * fade + 1;
  ctx.beginPath();
  ctx.arc(x, y, FX_RADIUS * ease, 0, Math.PI * 2);
  ctx.stroke();

  const rng = mulberry32(index + 1);
  for (let i = 0; i < FX_SPARKS; i++) {
    const angle = (i / FX_SPARKS) * Math.PI * 2 + rng() * 0.3;
    const reach = FX_RADIUS * (0.45 + rng() * 0.5);
    const outer = reach * ease;
    const inner = outer * (0.55 + 0.3 * t);
    const half = 0.05 * fade + 0.012;
    ctx.fillStyle = SHARD_COLORS[i % SHARD_COLORS.length]!;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    ctx.lineTo(x + Math.cos(angle - half) * inner, y + Math.sin(angle - half) * inner);
    ctx.lineTo(x + Math.cos(angle + half) * inner, y + Math.sin(angle + half) * inner);
    ctx.closePath();
    ctx.fill();
  }

  const core = 40 * (1 - ease) + 6;
  for (const [k, color] of CORE_STEPS) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, core * k, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCrashFx(ctx: CanvasRenderingContext2D, crashes: readonly Crash[], clock: number): void {
  ctx.save();
  crashes.forEach((crash, i) => {
    const elapsed = clock - crash.time;
    if (elapsed < 0) return;
    const t = Math.min(1, elapsed / FX_DURATION_MS);
    ctx.globalAlpha = 1;
    drawSmoke(ctx, crash, i, t);
    if (t < 1) drawBurst(ctx, crash, i, t);
  });
  ctx.restore();
}
