import { MAP_SELECTOR, type MapDef } from '../config/maps';
import { createGame, updateGame, type Game } from '../game/game';
import { buildWorld, type World } from '../game/world';
import { createDragController, resetInput, type DragController } from '../input/drag';
import { loadSave, mapStats, recordGame, writeSave, type Prefs, type RecordOutcome, type Save } from '../state/save';
import { GAME_OVER_FADE_MS, PAUSE_FADE_MS, START_FADE_MS, startFade, type Fade } from './fade';

export type ScreenId = 'menu' | 'mapSelect' | 'help' | 'highScores' | 'prefs' | 'playing' | 'paused' | 'gameOver';

export interface Session {
  game: Game;
  input: DragController;
  outcome: RecordOutcome | null;
}

export interface App {
  screen: ScreenId;
  back: ScreenId;
  storage: Storage;
  save: Save;
  fixedSeed: number | null;
  choice: number;
  helpSlide: number;
  session: Session | null;
  fade: Fade | null;
}

const previews = new Map<string, World>();

export function previewWorld(map: MapDef): World {
  let world = previews.get(map.id);
  if (world === undefined) {
    world = buildWorld(map);
    previews.set(map.id, world);
  }
  return world;
}

export function mapFor(index: number): MapDef {
  return MAP_SELECTOR[index] ?? MAP_SELECTOR[0]!;
}

function validChoice(index: number): number {
  return MAP_SELECTOR[index] === undefined ? 0 : index;
}

export function createApp(storage: Storage, fixedSeed: number | null, preselect: number | null): App {
  const save = loadSave(storage);
  const app: App = {
    screen: 'menu',
    back: 'menu',
    storage,
    save,
    fixedSeed,
    choice: 0,
    helpSlide: 0,
    session: null,
    fade: null,
  };
  app.choice = validChoice(preselect ?? save.lastMap);
  return app;
}

export function goto(app: App, screen: ScreenId, back: ScreenId = app.back): void {
  app.screen = screen;
  app.back = back;
}

export function persist(app: App): void {
  writeSave(app.storage, app.save);
}

export function setPrefs(app: App, patch: Partial<Prefs>): void {
  app.save.prefs = { ...app.save.prefs, ...patch };
  persist(app);
}

export function openMapSelect(app: App): void {
  goto(app, 'mapSelect', 'menu');
}

export function openHelp(app: App, back: ScreenId): void {
  app.helpSlide = 0;
  goto(app, 'help', back);
}

export function startGame(app: App, choice: number, now: number): void {
  app.choice = validChoice(choice);
  app.save.lastMap = app.choice;
  persist(app);
  const map = mapFor(app.choice);
  const { prefs } = app.save;
  const game = createGame(map, app.fixedSeed ?? Date.now() >>> 0, {
    personalBest: mapStats(app.save, map.id).highscore,
    taxi: prefs.taxi,
    fastForward: prefs.fastForwardOnStart,
  });
  app.session = { game, input: createDragController(), outcome: null };
  app.fade = startFade(now, START_FADE_MS);
  goto(app, 'playing', 'menu');
}

export function pauseGame(app: App, now: number): void {
  if (app.session === null) return;
  resetInput(app.session.input);
  app.fade = startFade(now, PAUSE_FADE_MS);
  goto(app, 'paused', 'menu');
}

export function resumeGame(app: App): void {
  app.fade = null;
  goto(app, 'playing', 'menu');
}

export function recordSession(app: App): RecordOutcome | null {
  const session = app.session;
  if (session === null) return null;
  if (session.outcome === null) {
    const { game } = session;
    session.outcome = recordGame(app.save, game.world.map.id, {
      score: game.score,
      flightTimeMs: game.flightTimeMs,
      maxInAir: game.maxInAir,
    });
    persist(app);
  }
  return session.outcome;
}

export function abandonGame(app: App): void {
  recordSession(app);
  app.session = null;
  app.fade = null;
  goto(app, 'menu', 'menu');
}

export function mainMenu(app: App): void {
  app.session = null;
  app.fade = null;
  goto(app, 'menu', 'menu');
}

function finishGame(app: App, now: number): void {
  if (app.session !== null) resetInput(app.session.input);
  recordSession(app);
  app.fade = startFade(now, GAME_OVER_FADE_MS);
  goto(app, 'gameOver', 'menu');
}

export function tick(app: App, dt: number, now: number): void {
  const session = app.session;
  if (session === null) return;
  if (app.screen === 'playing') {
    updateGame(session.game, dt);
    if (session.game.gameOver) finishGame(app, now);
  } else if (app.screen === 'gameOver') {
    updateGame(session.game, dt);
  }
}
