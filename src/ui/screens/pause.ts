import { abandonGame, openHelp, resumeGame, setPrefs } from '../app';
import { dim, fadeProgress, PAUSE_FADE_MS } from '../fade';
import type { Screen } from '../screen';
import { button, h, screen, toggle } from '../widgets';
import { drawPlayFrame } from './play';

export const pauseScreen: Screen = {
  view: (app) =>
    screen(
      'modal',
      { style: `--fade: ${PAUSE_FADE_MS}ms` },
      h(
        'section',
        { class: 'panel modal', 'aria-labelledby': 'pause-title' },
        h('p', { class: 'eyebrow' }, app.session?.game.world.map.title),
        h('h1', { id: 'pause-title', class: 'modal-title' }, 'Paused'),
        h(
          'div',
          { class: 'stack' },
          button('resume', 'Resume', { variant: 'primary', icon: 'play', autofocus: true }),
          button('help', 'How to play', { icon: 'help' }),
          button('mainMenu', 'Main menu', { icon: 'home' }),
        ),
        toggle('sound', 'Sound', app.save.prefs.sound),
      ),
    ),
  press(app, id) {
    if (id === 'resume') resumeGame(app);
    else if (id === 'help') openHelp(app, 'paused');
    else if (id === 'mainMenu') abandonGame(app);
    else if (id === 'sound') setPrefs(app, { sound: !app.save.prefs.sound });
  },
  draw(ctx, app, now) {
    if (app.session === null) return;
    drawPlayFrame(ctx, app, app.session);
    dim(ctx, 0.6 * fadeProgress(app.fade, now));
  },
  keys: { Escape: 'resume', p: 'resume' },
};
