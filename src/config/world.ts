export const WORLD_WIDTH = 854;
export const WORLD_HEIGHT = 480;
export const BLEED_X = 160;
export const BLEED_Y = 100;
export const VIEW = { x: -BLEED_X, y: -BLEED_Y, w: WORLD_WIDTH + 2 * BLEED_X, h: WORLD_HEIGHT + 2 * BLEED_Y };

export function clipWorld(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.clip();
}
