import { MAP_SELECTOR } from '../../config/maps';
import { rankFor, rankName } from '../../game/ranks';
import { mapStats } from '../../state/save';
import { goto, mapFor, openHelp, selectMap, startGame, type App } from '../app';
import type { Screen } from '../screen';
import { button, h, icon, logo, screen } from '../widgets';
import { drawBackdrop } from './backdrop';
import { mapGrid, paintThumbs } from './mapSelect';

const introduction = document.querySelector<HTMLElement>('#game-intro')!;
const summary = document.querySelector<HTMLElement>('#game-summary')!;

function featuredMap(app: App): HTMLElement {
  const map = mapFor(app.choice);
  const stats = mapStats(app.save, map.id);
  return h(
    'section',
    { class: 'featured-map', 'aria-labelledby': 'selected-map-title' },
    h('div', { class: 'featured-art' },
      h('div', { class: 'thumb', 'data-map': app.choice, role: 'img', 'aria-label': `${map.title} airfield preview` }),
      h('span', { class: 'featured-number' }, 'SECTOR ', String(app.choice + 1).padStart(2, '0')),
    ),
    h('div', { class: 'featured-details' },
      h('p', { class: 'eyebrow' }, 'Ready for departure'),
      h('h2', { id: 'selected-map-title' }, map.title),
      h('p', { class: 'featured-description' }, map.description),
      h('dl', { class: 'featured-stats' },
        h('div', {}, h('dt', {}, 'Personal best'), h('dd', {}, String(stats.highscore))),
        h('div', {}, h('dt', {}, 'Your rank'), h('dd', {}, rankName(rankFor(stats.highscore)))),
      ),
      button('start', 'Play', { variant: 'primary', icon: 'play', sub: map.title, autofocus: true, className: 'featured-play btn-lg' }),
      h('p', { class: 'featured-hint' }, 'Draw a path. Clear the skies.'),
    ),
  );
}

export const menuScreen: Screen = {
  view(app) {
    const map = mapFor(app.choice);
    return screen(
      'menu',
      {},
      h('div', { class: 'menu-scroll', 'data-scroll': '' },
        h('div', { class: 'lobby' },
          h('div', { class: 'lobby-welcome' },
            h('header', { class: 'lobby-header' },
              h('div', { class: 'lobby-brand' }, logo(), h('p', { class: 'brand-caption' }, 'Air traffic control')),
              h('nav', { class: 'menu-actions', 'aria-label': 'Game menu' },
                button('help', 'How to play', { icon: 'help' }),
                button('highScores', 'High scores', { icon: 'trophy' }),
                button('prefs', 'Settings', { icon: 'settings' }),
              ),
            ),
            summary,
          ),
          featuredMap(app),
          h('section', { class: 'map-collection', 'aria-labelledby': 'maps-title' },
            h('div', { class: 'collection-heading' },
              h('div', {}, h('p', { class: 'eyebrow' }, 'Choose your airspace'), h('h2', { id: 'maps-title' }, 'Select a map')),
              h('span', { class: 'collection-count' }, String(MAP_SELECTOR.length), ' maps · All unlocked'),
            ),
            mapGrid(app),
          ),
          h('section', { class: 'lobby-about', 'aria-labelledby': 'about-title' },
            h('div', {}, h('p', { class: 'eyebrow' }, 'You have control'), h('h2', { id: 'about-title' }, 'Every landing counts.')),
            introduction,
          ),
          h('footer', { class: 'menu-credit' },
            h('a', { class: 'menu-fork', href: 'https://github.com/nbr23/tower-duty', target: '_blank', rel: 'noopener' }, icon('github'), 'Fork me on GitHub'),
            h('p', {}, '\u00a9 2026 ', h('a', { href: 'https://nbr23.com', target: '_blank', rel: 'noopener' }, 'nbr23'), ' \u00b7 MIT License \u00b7 v', __APP_VERSION__),
          ),
        ),
      ),
      h('div', { class: 'mobile-launch' },
        h('div', { class: 'mobile-selection', 'aria-live': 'polite', 'aria-atomic': 'true' }, h('span', { class: 'eyebrow' }, 'Selected map'), h('strong', {}, map.title)),
        button('start-mobile', 'Play', { variant: 'primary', icon: 'play', autofocus: true, label: `Play ${map.title}` }),
      ),
    );
  },
  press(app, id, now) {
    if (id === 'start' || id === 'start-mobile') startGame(app, app.choice, now);
    else if (id.startsWith('map-')) selectMap(app, Number(id.slice(4)));
    else if (id === 'help') openHelp(app, 'menu');
    else if (id === 'highScores') goto(app, 'highScores', 'menu');
    else if (id === 'prefs') goto(app, 'prefs', 'menu');
  },
  draw(ctx) {
    drawBackdrop(ctx);
  },
  frame(view) {
    paintThumbs(view);
  },
};
