import type { MapDef } from '../config/maps';
import { rankFor, rankName } from '../game/ranks';
import { button, h } from './widgets';

export function scoreShareData(map: MapDef, score: number, best: boolean, href: string): ShareData {
  const url = new URL(href);
  url.search = '';
  url.hash = map.id;
  return {
    title: 'Tower Duty',
    text: `${best ? 'My high score:' : 'I landed'} ${score} aircraft${best ? ' landed' : ''} on ${map.title} in Tower Duty! Rank: ${rankName(rankFor(map.id, score))}. Can you beat it?`,
    url: url.href,
  };
}

export function shareText(data: ShareData): string {
  return `${data.text}\n${data.url}`;
}

export async function shareScore(data: ShareData): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  if (typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(shareText(data));
    return 'copied';
  } catch {
    return 'manual';
  }
}

export function scoreShare(map: MapDef, score: number, best = false): HTMLElement {
  const data = scoreShareData(map, score, best, location.href);
  const trigger = button(`share-${map.id}`, 'Share score', {
    icon: 'share',
    label: best ? `Share high score for ${map.title}` : 'Share score',
    disabled: best && score === 0,
  });
  const status = h('p', { class: 'share-status muted small', role: 'status' });
  const field = h('textarea', { class: 'share-text', readonly: true, rows: 4, 'aria-label': 'Score and link to copy', hidden: true }, shareText(data));
  const control = h('div', { class: 'score-share' }, trigger, status, field);
  trigger.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (trigger.disabled) return;
    trigger.disabled = true;
    status.textContent = '';
    field.hidden = true;
    const result = await shareScore(data);
    trigger.disabled = false;
    if (!control.isConnected) return;
    if (result === 'shared') status.textContent = 'Score shared!';
    else if (result === 'copied') status.textContent = 'Score and link copied!';
    else if (result === 'manual') {
      status.textContent = 'Copy this score and link to share:';
      field.hidden = false;
      field.focus();
      field.select();
    }
  });
  return control;
}
