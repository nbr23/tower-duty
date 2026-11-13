import { VIEW } from '../config/world';

export const PAUSE_FADE_MS = 1000;
export const START_FADE_MS = 700;
export const GAME_OVER_FADE_MS = 500;

export interface Fade {
  startedAt: number;
  durationMs: number;
}

export function startFade(now: number, durationMs: number): Fade {
  return { startedAt: now, durationMs };
}

export function fadeProgress(fade: Fade | null, now: number): number {
  if (fade === null || fade.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - fade.startedAt) / fade.durationMs));
}

export function dim(ctx: CanvasRenderingContext2D, alpha: number, color = '17, 21, 26'): void {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
}
