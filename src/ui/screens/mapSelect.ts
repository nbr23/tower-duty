import { MAP_SELECTOR, type MapDef } from '../../config/maps';
import { rankFor, rankName } from '../../game/ranks';
import { paintThumbnail } from '../../render/map';
import { mapStats } from '../../state/save';
import { mapFor, previewWorld, type App } from '../app';
import { h } from '../widgets';

const THUMB_STEP = 128;
const thumbs = new Map<string, HTMLCanvasElement>();

export function mapCard(app: App, index: number): HTMLButtonElement {
  const map = mapFor(index);
  const stats = mapStats(app.save, map.id);
  const rank = rankName(rankFor(stats.highscore));
  const current = index === app.choice;
  return h(
    'button',
    {
      type: 'button',
      class: current ? 'map-card current' : 'map-card',
      'data-action': `map-${index}`,
      'aria-pressed': String(current),
      'aria-label': `${map.title}, ${map.description}, best ${stats.highscore}, ${rank}`,
    },
    h('span', { class: 'thumb', 'data-map': index, 'aria-hidden': 'true' }),
    h(
      'span',
      { class: 'map-caption' },
      h('span', { class: 'map-card-top' },
        h('span', { class: 'map-tag' }, String(index + 1).padStart(2, '0')),
        h('span', { class: 'map-selected' }, current ? 'Selected' : 'Select map'),
      ),
      h('span', { class: 'map-name' }, map.title),
      h('span', { class: 'map-description' }, map.description),
      h('span', { class: 'map-meta' }, h('span', {}, 'Best ', h('strong', {}, String(stats.highscore))), h('span', {}, rank)),
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

export function mapGrid(app: App): HTMLElement {
  const grid = h('div', { class: 'map-grid', 'aria-label': 'Maps' }, ...MAP_SELECTOR.map((_, i) => mapCard(app, i)));
  grid.addEventListener('keydown', (e) => {
    const step = arrowStep(grid, e.key);
    if (step === 0) return;
    const cards = [...grid.querySelectorAll<HTMLButtonElement>('.map-card')];
    const index = cards.findIndex((card) => card === document.activeElement);
    if (index < 0) return;
    e.preventDefault();
    cards[Math.min(cards.length - 1, Math.max(0, index + step))]?.focus();
  });
  return grid;
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
  const viewport = view.querySelector('.menu-scroll')!.getBoundingClientRect();
  let painted = false;
  for (const slot of view.querySelectorAll<HTMLElement>('.thumb[data-map]')) {
    const rect = slot.getBoundingClientRect();
    if (rect.bottom < viewport.top || rect.top > viewport.bottom) continue;
    const map = MAP_SELECTOR[Number(slot.dataset.map)];
    const width = Math.ceil((rect.width * dpr) / THUMB_STEP) * THUMB_STEP;
    if (map === undefined || width === 0) continue;
    let canvas = slot.querySelector('canvas');
    if (canvas !== null && canvas.width >= width) continue;
    if ((thumbs.get(map.id)?.width ?? 0) < width) {
      if (painted) continue;
      painted = true;
    }
    const source = thumbnail(map, width);
    if (canvas === null) {
      canvas = h('canvas');
      slot.append(canvas);
    }
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d')!.drawImage(source, 0, 0);
  }
}
