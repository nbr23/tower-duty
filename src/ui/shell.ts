import { playGameEvents } from '../audio/cues';
import type { Audio } from '../audio/engine';
import { drainEvents } from '../game/game';
import { pointerDown, pointerMove, pointerUp } from '../input/drag';
import { tick, type App, type ScreenId } from './app';
import type { Mode } from './mode';
import type { Screen } from './screen';
import { gameOverScreen } from './screens/gameOver';
import { helpScreen } from './screens/help';
import { highScoresScreen } from './screens/highScores';
import { mapSelectScreen } from './screens/mapSelect';
import { menuScreen } from './screens/menu';
import { pauseScreen } from './screens/pause';
import { playScreen } from './screens/play';
import { applyFullscreen, fullscreenWanted, prefsScreen } from './screens/prefs';

const SCREENS: Record<ScreenId, Screen> = {
  menu: menuScreen,
  mapSelect: mapSelectScreen,
  help: helpScreen,
  highScores: highScoresScreen,
  prefs: prefsScreen,
  playing: playScreen,
  paused: pauseScreen,
  gameOver: gameOverScreen,
};

const MENU_SCREENS: ReadonlySet<ScreenId> = new Set(['menu', 'paused', 'gameOver']);
const SUB_SCREENS: ReadonlySet<ScreenId> = new Set(['help', 'highScores', 'prefs', 'mapSelect']);
const ARROWS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function actionTarget(event: Event): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
}

function enabled(el: HTMLElement | null): HTMLElement | null {
  return el !== null && !el.matches(':disabled') ? el : null;
}

export function createAppMode(app: App, audio: Audio, root: HTMLElement): Mode {
  window.addEventListener(
    'pointerup',
    () => {
      if (fullscreenWanted(app.save.prefs)) applyFullscreen(true);
    },
    { capture: true, once: true },
  );
  let lastScreen = app.screen;
  let mounted: ScreenId | null = null;
  let view: HTMLElement | null = null;
  let dirty = false;
  let keyboard = false;
  const screen = (): Screen => SCREENS[app.screen];

  function action(id: string): HTMLElement | null {
    return enabled(view?.querySelector<HTMLElement>(`[data-action="${id}"]`) ?? null);
  }

  function mount(): void {
    const previous = mounted;
    const entering = previous !== app.screen;
    if (!entering && !dirty) return;
    dirty = false;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && root.contains(active) ? active.dataset.action : undefined;
    mounted = app.screen;
    view = screen().view(app);
    const returning = previous !== null && SUB_SCREENS.has(previous) && MENU_SCREENS.has(app.screen);
    if (entering && !returning) view.classList.add('enter');
    root.replaceChildren(view);
    const restore = !entering && focused !== undefined ? action(focused) : null;
    const target = restore ?? (keyboard ? view.querySelector<HTMLElement>('[data-autofocus]') : null);
    target?.focus({ preventScroll: true });
  }

  function press(id: string, rebuild = true): void {
    screen().press(app, id, performance.now());
    audio.setEnabled(app.save.prefs.sound);
    audio.play('menu_option');
    dirty ||= rebuild;
    mount();
  }

  function menuCue(): void {
    if (app.screen === lastScreen) return;
    if (MENU_SCREENS.has(app.screen) && !SUB_SCREENS.has(lastScreen)) audio.play('menu');
    lastScreen = app.screen;
  }

  root.addEventListener('click', (e) => {
    const el = actionTarget(e);
    if (el === null || el instanceof HTMLInputElement) return;
    if (el.dataset.trigger === 'down' && e.detail !== 0) return;
    press(el.dataset.action!);
  });

  root.addEventListener('pointerdown', (e) => {
    const el = enabled(actionTarget(e));
    if (el === null || el.dataset.trigger !== 'down') return;
    e.preventDefault();
    press(el.dataset.action!);
  });

  root.addEventListener('change', (e) => {
    const el = actionTarget(e);
    if (el instanceof HTMLInputElement) press(el.dataset.action!, false);
  });

  window.addEventListener('pointerdown', () => (keyboard = false), { capture: true });

  window.addEventListener('keydown', (e) => {
    keyboard = true;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.closest('button, input, label')) return;
    const id = screen().keys?.[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (id !== undefined) {
      if (action(id) === null) return;
      e.preventDefault();
      press(id);
      return;
    }
    if (!ARROWS.has(e.key) || (document.activeElement !== null && root.contains(document.activeElement))) return;
    const first = view?.querySelector<HTMLElement>('[data-autofocus]') ?? view?.querySelector<HTMLElement>('[data-action]:not(:disabled)');
    if (first == null) return;
    e.preventDefault();
    first.focus({ preventScroll: true });
  });

  mount();

  return {
    update(dt) {
      tick(app, dt, performance.now());
      audio.setEnabled(app.save.prefs.sound);
      if (app.session !== null) playGameEvents(audio, drainEvents(app.session.game), app.save.prefs.highlights);
      menuCue();
    },
    render(ctx) {
      mount();
      const now = performance.now();
      screen().draw(ctx, app, now);
      if (view !== null) screen().frame?.(view, app, now);
    },
    down(id, p) {
      if (app.screen !== 'playing' || app.session === null) return false;
      return pointerDown(app.session.input, app.session.game, id, p);
    },
    move(id, p, final) {
      if (app.screen === 'playing' && app.session !== null) pointerMove(app.session.input, app.session.game, id, p, final);
    },
    up(id, now) {
      if (app.session !== null) pointerUp(app.session.input, id, now);
    },
  };
}
