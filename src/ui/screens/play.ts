import { clipWorld } from '../../config/world';
import { drawAircraft, drawEntryCues } from '../../render/aircraft';
import { drawClouds } from '../../render/clouds';
import { drawCrashFx, drawWarningRings } from '../../render/collision';
import { drawMap, drawSurround } from '../../render/map';
import { drawHighlights, drawPaths } from '../../render/path';
import { pauseGame, type App, type Session } from '../app';
import { dim, fadeProgress } from '../fade';
import { hudView, syncHud } from '../hud';
import type { Screen } from '../screen';
import { screen } from '../widgets';

export function drawPlayFrame(ctx: CanvasRenderingContext2D, app: App, session: Session): void {
  const { game } = session;
  drawMap(ctx, game.world, true);
  drawSurround(ctx);
  ctx.save();
  clipWorld(ctx);
  if (app.save.prefs.highlights) drawHighlights(ctx, game.aircraft);
  drawWarningRings(ctx, game.aircraft, game.clock);
  drawPaths(ctx, game.world, game.aircraft, game.clock);
  ctx.restore();
  drawAircraft(ctx, game.world, game.aircraft, game.clock);
  drawCrashFx(ctx, game.crashes, game.clock);
  if (app.save.prefs.clouds && game.world.map.clouds !== false) drawClouds(ctx, game.world, game.clock);
  drawEntryCues(ctx, game.aircraft, game.clock);
}

export const playScreen: Screen = {
  view: (app) => screen('play', {}, app.session === null ? null : hudView(app.session.game)),
  press(app, id, now) {
    const game = app.session?.game;
    if (game === undefined) return;
    if (id === 'pause') pauseGame(app, now);
    else if (id === 'fastForward') game.fastForward = !game.fastForward;
  },
  draw(ctx, app, now) {
    if (app.session === null) return;
    drawPlayFrame(ctx, app, app.session);
    dim(ctx, 1 - fadeProgress(app.fade, now));
  },
  frame(view, app) {
    if (app.session !== null) syncHud(view, app.session.game);
  },
  keys: { Escape: 'pause', p: 'pause', f: 'fastForward' },
};
