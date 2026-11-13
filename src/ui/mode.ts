import type { PointerHandlers } from '../input/pointer';

export interface Mode extends PointerHandlers {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}
