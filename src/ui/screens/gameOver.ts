import { percentileFor, pointsToNextRank, rankFor, rankName, rankProgress } from '../../game/ranks';
import { goto, mainMenu, startGame, type Session } from '../app';
import { dim, fadeProgress, GAME_OVER_FADE_MS } from '../fade';
import type { Screen } from '../screen';
import { scoreShare } from '../share';
import { button, h, screen } from '../widgets';
import { drawPlayFrame } from './play';

function rankBlock(session: Session): HTMLElement {
  const { game } = session;
  const mapId = game.world.map.id;
  const rank = rankFor(mapId, game.score);
  const percentile = percentileFor(rank);
  const toNext = pointsToNextRank(mapId, game.score);
  const progress = rankProgress(mapId, game.score) ?? 1;
  return h(
    'div',
    { class: 'rank' },
    h(
      'div',
      { class: 'rank-line' },
      h('span', { class: 'rank-name' }, rankName(rank)),
      percentile === null ? null : h('span', { class: 'chip' }, `Top ${100 - percentile}%`),
    ),
    h(
      'div',
      { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) },
      h('span', { style: `width: ${(progress * 100).toFixed(1)}%` }),
    ),
    h('p', { class: 'muted small' }, toNext === null ? 'Highest rank reached' : `${toNext} more to ${rankName(rank + 1)}`),
  );
}

export const gameOverScreen: Screen = {
  view(app) {
    const session = app.session;
    if (session === null) return screen('modal', {});
    return screen(
      'modal',
      { style: `--fade: ${GAME_OVER_FADE_MS}ms` },
      h(
        'section',
        { class: 'panel modal modal-wide', 'aria-labelledby': 'over-title' },
        h('p', { class: 'eyebrow' }, session.game.world.map.title),
        h('h1', { id: 'over-title', class: 'modal-title' }, 'Game over'),
        h(
          'div',
          { class: 'score' },
          h('span', { class: 'score-value' }, String(session.game.score)),
          h('span', { class: 'score-label' }, 'aircraft landed'),
          session.outcome?.newHighscore ? h('span', { class: 'badge' }, 'New best!') : null,
        ),
        rankBlock(session),
        scoreShare(session.game.world.map, session.game.score),
        h(
          'div',
          { class: 'actions' },
          button('again', 'Play again', { variant: 'primary', icon: 'retry', autofocus: true, className: 'btn-tile' }),
          button('highScores', 'High scores', { icon: 'trophy', className: 'btn-tile' }),
          button('mainMenu', 'Main menu', { icon: 'home', className: 'btn-tile' }),
        ),
      ),
    );
  },
  press(app, id, now) {
    if (id === 'highScores') goto(app, 'highScores', 'gameOver');
    else if (id === 'again') startGame(app, app.choice, now);
    else if (id === 'mainMenu') mainMenu(app);
  },
  draw(ctx, app, now) {
    if (app.session === null) return;
    drawPlayFrame(ctx, app, app.session);
    dim(ctx, 0.6 * fadeProgress(app.fade, now));
  },
  keys: { Escape: 'mainMenu' },
};
