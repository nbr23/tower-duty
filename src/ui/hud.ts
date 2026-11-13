import type { Game } from '../game/game';
import { rankFor, rankName } from '../game/ranks';
import { h, iconButton } from './widgets';

function stat(key: string, label: string): HTMLElement {
  return h('span', { class: 'pill' }, h('span', { class: 'pill-key' }, label), h('span', { 'data-hud': key }));
}

export function hudView(game: Game): HTMLElement {
  return h(
    'div',
    { class: 'hud' },
    h('div', { class: 'hud-top' }, stat('score', 'Score'), h('span', { class: 'pill pill-rank', 'data-hud': 'rank' }), stat('best', 'Best')),
    iconButton('pause', 'pause', 'Pause', { trigger: 'down', className: 'hud-btn hud-left' }),
    iconButton('fastForward', 'fastForward', 'Fast forward', {
      trigger: 'down',
      pressed: game.fastForward,
      className: 'hud-btn hud-right',
    }),
  );
}

function setText(view: HTMLElement, key: string, text: string): void {
  const el = view.querySelector<HTMLElement>(`[data-hud="${key}"]`);
  if (el !== null && el.textContent !== text) el.textContent = text;
}

export function syncHud(view: HTMLElement, game: Game): void {
  setText(view, 'score', String(game.score));
  setText(view, 'rank', rankName(rankFor(game.world.map.id, game.score)));
  setText(view, 'best', String(Math.max(game.personalBest, game.score)));
  const crashed = game.crashedAt !== undefined;
  for (const button of view.querySelectorAll<HTMLButtonElement>('.hud-btn')) {
    if (button.disabled !== crashed) button.disabled = crashed;
  }
  const ff = view.querySelector<HTMLElement>('[data-action="fastForward"]');
  const pressed = String(game.fastForward);
  if (ff !== null && ff.getAttribute('aria-pressed') !== pressed) ff.setAttribute('aria-pressed', pressed);
}
