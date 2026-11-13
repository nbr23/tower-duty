import { MAP_SELECTOR, type MapDef } from '../../config/maps';
import { rankName } from '../../game/ranks';
import { paintThumbnail } from '../../render/map';
import { mapStats } from '../../state/save';
import { goto, mapFor, previewWorld, startGame, type App } from '../app';
import type { Screen } from '../screen';
import { h, icon, screen, screenHeader } from '../widgets';
import { drawBackdrop } from './backdrop';

const THUMB_STEP = 128;
const thumbs = new Map<string, HTMLCanvasElement>();

export function mapCard(app: App, index: number, action: string | null = null): HTMLButtonElement {
  const map = mapFor(index);
  const stats = mapStats(app.save, map.id);
  const rank = rankName(stats.bestRank);
  const picker = action === null;
  const current = picker && index === app.choice;
  return h(
    'button',
    {
      type: 'button',
      class: current ? 'map-card current' : 'map-card',
      'data-action': action ?? `map-${index}`,
      'data-map': index,
      'data-autofocus': current,
      'aria-label': picker ? `${map.title}, best ${stats.highscore}, ${rank}` : `Choose map, current map ${map.title}`,
    },
    h('span', { class: 'thumb' }),
    h(
      'span',
      { class: 'map-caption' },
      h('span', { class: 'map-tag' }, String(index + 1).padStart(2, '0')),
      h('span', { class: 'map-text' }, h('span', { class: 'map-name' }, map.title), h('span', { class: 'map-meta' }, `Best ${stats.highscore} · ${rank}`)),
      picker ? null : h('span', { class: 'map-change' }, 'Change', icon('next')),
    ),
  );
}

function arrowStep(grid: HTMLElement, key: string): number {
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  if (key === 'ArrowLeft') return -1;
  if (key === 'ArrowRight') return 1;
  if (key === 'ArrowUp') return -columns;
  if (key === 'ArrowDown') return columns;
  return 0;
}

function onGridKey(grid: HTMLElement, e: KeyboardEvent): void {
  const step = arrowStep(grid, e.key);
  if (step === 0) return;
  const cards = [...grid.querySelectorAll<HTMLElement>('.map-card')];
  const index = cards.findIndex((c) => c === document.activeElement);
  if (index < 0) return;
  e.preventDefault();
  cards[Math.min(cards.length - 1, Math.max(0, index + step))]?.focus();
}

function thumbnail(map: MapDef, width: number): HTMLCanvasElement {
  let thumb = thumbs.get(map.id);
  if (thumb === undefined || thumb.width < width) {
    thumb = paintThumbnail(previewWorld(map), width);
    thumbs.set(map.id, thumb);
  }
  return thumb;
}

export function paintThumbs(view: HTMLElement): void {
  const dpr = window.devicePixelRatio || 1;
  let painted = false;
  for (const slot of view.querySelectorAll<HTMLElement>('.map-card .thumb:empty')) {
    const card = slot.parentElement!;
    const map = MAP_SELECTOR[Number(card.dataset.map)];
    const width = Math.ceil((card.clientWidth * dpr) / THUMB_STEP) * THUMB_STEP;
    if (map === undefined || width === 0) return;
    if ((thumbs.get(map.id)?.width ?? 0) < width) {
      if (painted) return;
      painted = true;
    }
    slot.append(thumbnail(map, width));
  }
}

export const mapSelectScreen: Screen = {
  view(app) {
    const grid = h('div', { class: 'map-grid' }, ...MAP_SELECTOR.map((_, i) => mapCard(app, i)));
    grid.addEventListener('keydown', (e) => onGridKey(grid, e));
    return screen('sub', { 'data-screen': 'maps' }, screenHeader('Choose a map'), h('div', { class: 'scroll' }, grid));
  },
  press(app, id, now) {
    if (id === 'back') goto(app, 'menu', 'menu');
    else if (id.startsWith('map-')) startGame(app, Number(id.slice(4)), now);
  },
  draw(ctx, app) {
    drawBackdrop(ctx, app);
  },
  frame(view) {
    paintThumbs(view);
  },
  keys: { Escape: 'back' },
};
