import { drawMap } from '../../render/map';
import { mapFor, previewWorld, type App } from '../app';
import { dim } from '../fade';
import { drawPlayFrame } from './play';

export function drawBackdrop(ctx: CanvasRenderingContext2D, app: App): void {
  if (app.session !== null && (app.back === 'paused' || app.back === 'gameOver')) {
    drawPlayFrame(ctx, app, app.session);
    dim(ctx, 0.75);
    return;
  }
  drawMap(ctx, previewWorld(mapFor(app.choice)), true);
  dim(ctx, 0.7);
}
