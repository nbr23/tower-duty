import { goto, mapFor, openHelp, openMapSelect, startGame } from '../app';
import type { Screen } from '../screen';
import { button, h, icon, logo, screen } from '../widgets';
import { drawBackdrop } from './backdrop';
import { mapCard, paintThumbs } from './mapSelect';

export const menuScreen: Screen = {
  view: (app) =>
    screen(
      'menu',
      {},
      h(
        'div',
        { class: 'menu-main' },
        logo(),
        h(
          'nav',
          { class: 'menu-actions' },
          button('start', 'Play', { variant: 'primary', icon: 'play', sub: mapFor(app.choice).title, autofocus: true, className: 'btn-lg' }),
          h(
            'div',
            { class: 'menu-row' },
            button('help', 'How to play', { icon: 'help', className: 'btn-tile' }),
            button('highScores', 'High scores', { icon: 'trophy', className: 'btn-tile' }),
            button('prefs', 'Settings', { icon: 'settings', className: 'btn-tile' }),
          ),
        ),
      ),
      h('div', { class: 'menu-map' }, h('p', { class: 'eyebrow' }, 'Selected map'), mapCard(app, app.choice, 'mapSelect')),
      h(
        'footer',
        { class: 'menu-credit' },
        h('a', { class: 'menu-fork', href: 'https://github.com/nbr23/tower-duty', target: '_blank', rel: 'noopener' }, icon('github'), 'Fork me on GitHub'),
        h('p', {}, '\u00a9 2026 ', h('a', { href: 'https://nbr23.com', target: '_blank', rel: 'noopener' }, 'nbr23'), ' \u00b7 MIT License \u00b7 v', __APP_VERSION__),
      ),
    ),
  press(app, id, now) {
    if (id === 'start') startGame(app, app.choice, now);
    else if (id === 'mapSelect') openMapSelect(app);
    else if (id === 'help') openHelp(app, 'menu');
    else if (id === 'highScores') goto(app, 'highScores', 'menu');
    else if (id === 'prefs') goto(app, 'prefs', 'menu');
  },
  draw(ctx, app) {
    drawBackdrop(ctx, app);
  },
  frame(view) {
    paintThumbs(view);
  },
};
