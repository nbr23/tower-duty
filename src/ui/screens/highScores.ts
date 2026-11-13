import { MAP_SELECTOR } from '../../config/maps';
import { rankName } from '../../game/ranks';
import { mapStats } from '../../state/save';
import { goto, type App } from '../app';
import { formatDuration } from '../format';
import type { Screen } from '../screen';
import { h, screen, screenHeader } from '../widgets';
import { drawBackdrop } from './backdrop';

const COLUMNS = ['Map', 'Best', 'Rank', 'Landed', 'Flight time', 'Max in air'];
const NUMERIC = new Set([1, 3, 4, 5]);

function rows(app: App): HTMLTableRowElement[] {
  return MAP_SELECTOR.map((map, i) => {
    const stats = mapStats(app.save, map.id);
    return h(
      'tr',
      { class: i === app.choice ? 'current' : undefined },
      h('th', { scope: 'row' }, map.title),
      h('td', { class: 'num best' }, String(stats.highscore)),
      h('td', {}, rankName(stats.bestRank)),
      h('td', { class: 'num' }, String(stats.landed)),
      h('td', { class: 'num' }, formatDuration(stats.flightTimeMs)),
      h('td', { class: 'num' }, String(stats.maxInAir)),
    );
  });
}

export const highScoresScreen: Screen = {
  view: (app) =>
    screen(
      'sub',
      { 'data-screen': 'scores' },
      screenHeader('High scores'),
      h(
        'div',
        { class: 'scroll' },
        h(
          'div',
          { class: 'panel scores' },
          h(
            'table',
            {},
            h('thead', {}, h('tr', {}, ...COLUMNS.map((c, i) => h('th', { scope: 'col', class: NUMERIC.has(i) ? 'num' : undefined }, c)))),
            h('tbody', {}, ...rows(app)),
          ),
          h('p', { class: 'scores-total' }, 'Total aircraft landed ', h('strong', {}, String(app.save.landedTotal))),
        ),
      ),
    ),
  press(app, id) {
    if (id === 'back') goto(app, app.back, 'menu');
  },
  draw(ctx, app) {
    drawBackdrop(ctx, app);
  },
  keys: { Escape: 'back' },
};
