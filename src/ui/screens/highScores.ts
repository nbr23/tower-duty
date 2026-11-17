import { MAP_SELECTOR } from '../../config/maps';
import { rankFor, rankName } from '../../game/ranks';
import { mapStats } from '../../state/save';
import { goto, type App } from '../app';
import { formatDuration } from '../format';
import type { Screen } from '../screen';
import { scoreShare } from '../share';
import { h, screen, screenHeader } from '../widgets';
import { drawBackdrop } from './backdrop';

const COLUMNS = ['Map', 'Best', 'Rank', 'Landed', 'Flight time', 'Max in air', 'Share'];
const NUMERIC = new Set([1, 3, 4, 5]);

function rows(app: App): HTMLTableRowElement[] {
  return MAP_SELECTOR.map((map, i) => {
    const stats = mapStats(app.save, map.id);
    return h(
      'tr',
      { class: i === app.choice ? 'current' : undefined },
      h('th', { scope: 'row' }, map.title),
      h('td', { class: 'num best' }, String(stats.highscore)),
      h('td', {}, rankName(rankFor(stats.highscore))),
      h('td', { class: 'num' }, String(stats.landed)),
      h('td', { class: 'num' }, formatDuration(stats.flightTimeMs)),
      h('td', { class: 'num' }, String(stats.maxInAir)),
      h('td', {}, scoreShare(map, stats.highscore, true)),
    );
  });
}

function cards(app: App): HTMLElement {
  return h('div', { class: 'score-cards' }, ...MAP_SELECTOR.map((map, i) => {
    const stats = mapStats(app.save, map.id);
    const values = [
      ['Best', String(stats.highscore)],
      ['Rank', rankName(rankFor(stats.highscore))],
      ['Landed', String(stats.landed)],
      ['Flight time', formatDuration(stats.flightTimeMs)],
      ['Max in air', String(stats.maxInAir)],
    ];
    return h('section', { class: i === app.choice ? 'score-card current' : 'score-card', 'aria-label': map.title },
      h('h2', {}, map.title),
      h('dl', {}, ...values.map(([label, value]) => h('div', {}, h('dt', {}, label), h('dd', {}, value)))),
      scoreShare(map, stats.highscore, true),
    );
  }));
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
            { class: 'scores-table' },
            h('thead', {}, h('tr', {}, ...COLUMNS.map((c, i) => h('th', { scope: 'col', class: NUMERIC.has(i) ? 'num' : undefined }, c)))),
            h('tbody', {}, ...rows(app)),
          ),
          cards(app),
          h('p', { class: 'scores-total' }, 'Total aircraft landed ', h('strong', {}, String(app.save.landedTotal))),
        ),
      ),
    ),
  press(app, id) {
    if (id === 'back') goto(app, app.back, 'menu');
  },
  draw(ctx) {
    drawBackdrop(ctx);
  },
  keys: { Escape: 'back' },
};
