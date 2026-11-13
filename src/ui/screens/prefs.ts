import type { Prefs } from '../../state/save';
import { goto, setPrefs, type App } from '../app';
import type { Screen } from '../screen';
import { h, screen, screenHeader, toggle } from '../widgets';
import { drawBackdrop } from './backdrop';

type Toggle = Exclude<keyof Prefs, 'language'>;

const TOGGLES: readonly (readonly [Toggle, string])[] = [
  ['sound', 'Sound'],
  ['highlights', 'Highlight effects'],
  ['clouds', 'Clouds'],
  ['taxi', 'Taxi simulation'],
  ['fastForwardOnStart', 'Fast-forward on start'],
  ['fullscreen', 'Fullscreen'],
];

export function applyFullscreen(on: boolean): void {
  const active = (document.fullscreenElement ?? null) !== null;
  if (on && !active) document.documentElement.requestFullscreen?.().catch(() => undefined);
  else if (!on && active) document.exitFullscreen?.().catch(() => undefined);
}

function toggleKey(app: App, key: Toggle): void {
  const value = !app.save.prefs[key];
  setPrefs(app, { [key]: value });
  if (key === 'fullscreen') applyFullscreen(value);
}

export const prefsScreen: Screen = {
  view: (app) =>
    screen(
      'sub',
      { 'data-screen': 'settings' },
      screenHeader('Settings'),
      h(
        'div',
        { class: 'scroll' },
        h(
          'div',
          { class: 'panel settings' },
          ...TOGGLES.map(([key, label]) => toggle(key, label, app.save.prefs[key])),
          h('div', { class: 'setting' }, h('span', { class: 'setting-label' }, 'Language'), h('span', { class: 'muted' }, 'English')),
        ),
      ),
    ),
  press(app, id) {
    if (id === 'back') goto(app, 'menu', 'menu');
    const entry = TOGGLES.find(([key]) => key === id);
    if (entry !== undefined) toggleKey(app, entry[0]);
  },
  draw(ctx, app) {
    drawBackdrop(ctx, app);
  },
  keys: { Escape: 'back' },
};
