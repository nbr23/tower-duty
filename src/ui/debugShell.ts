import { playGameEvents } from '../audio/cues';
import type { Audio } from '../audio/engine';
import { MAP_SELECTOR, type MapDef } from '../config/maps';
import { clipWorld } from '../config/world';
import { createGame, drainEvents, updateGame, type Game } from '../game/game';
import { CAMEO_CHANCE } from '../game/spawn';
import { createDragController, pointerDown, pointerMove, pointerUp, resetInput } from '../input/drag';
import { drawAircraft, drawEntryCues } from '../render/aircraft';
import { drawClouds } from '../render/clouds';
import { drawCrashFx, drawWarningRings } from '../render/collision';
import { drawGameOver, drawMapDebug, drawSpawnDebug } from '../render/debug';
import { drawHighlights, drawPaths } from '../render/path';
import { loadSave, mapStats } from '../state/save';
import type { Mode } from './mode';

export function choiceFromHash(): number | null {
  const id = location.hash.replace(/^#/, '');
  const index = MAP_SELECTOR.findIndex((m) => m.id === id);
  return index < 0 ? null : index;
}

export function createDebugMode(storage: Storage, seed: number, audio: Audio): Mode {
  const save = loadSave(storage);
  audio.setEnabled(save.prefs.sound);
  let selection = choiceFromHash() ?? 0;
  let taxi = save.prefs.taxi;
  let cameos = false;
  const input = createDragController();

  const newGame = (map: MapDef): Game => {
    const created = createGame(map, seed, { personalBest: mapStats(save, map.id).highscore, taxi });
    created.director.cameoChance = cameos ? 1 : CAMEO_CHANCE;
    return created;
  };

  let game = newGame(MAP_SELECTOR[selection]!);

  function select(next: number): void {
    selection = next;
    const map = MAP_SELECTOR[selection]!;
    resetInput(input);
    game = newGame(map);
    history.replaceState(null, '', `${location.search}#${map.id}`);
  }

  function step(delta: number): void {
    select((selection + delta + MAP_SELECTOR.length) % MAP_SELECTOR.length);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'f' || e.key === 'F') game.fastForward = !game.fastForward;
    else if (e.key === 'r' || e.key === 'R') select(selection);
    else if (e.key === 't' || e.key === 'T') {
      taxi = !taxi;
      game.taxi = taxi;
    } else if (e.key === 'c' || e.key === 'C') {
      cameos = !cameos;
      game.director.cameoChance = cameos ? 1 : CAMEO_CHANCE;
    }
  });

  window.addEventListener('hashchange', () => select(choiceFromHash() ?? 0));

  return {
    update(dt) {
      updateGame(game, dt);
      playGameEvents(audio, drainEvents(game), save.prefs.highlights);
    },
    render(ctx) {
      drawMapDebug(ctx, game.world);
      ctx.save();
      clipWorld(ctx);
      drawHighlights(ctx, game.aircraft);
      drawWarningRings(ctx, game.aircraft, game.clock);
      drawPaths(ctx, game.world, game.aircraft, game.clock);
      drawAircraft(ctx, game.world, game.aircraft, game.clock);
      drawCrashFx(ctx, game.crashes, game.clock);
      ctx.restore();
      if (save.prefs.clouds && game.world.map.clouds !== false) drawClouds(ctx, game.world, game.clock);
      drawEntryCues(ctx, game.aircraft, game.clock);
      drawSpawnDebug(ctx, game);
      drawGameOver(ctx, game);
    },
    down: (id, p) => pointerDown(input, game, id, p),
    move: (id, p, final) => pointerMove(input, game, id, p, final),
    up: (id, now) => pointerUp(input, id, now),
  };
}
