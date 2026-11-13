import type { MapDef } from '../config/maps';
import { rankFor, rankName } from '../game/ranks';
import { CARD_HEIGHT, CARD_WIDTH, drawShareCard } from '../render/shareCard';
import { previewWorld } from './app';
import { button, h } from './widgets';

export function scoreShareData(map: MapDef, score: number, best: boolean, href: string): ShareData {
  const base = new URL(href);
  base.search = '';
  base.hash = '';
  const url = new URL(`m/${map.id}/`, base);
  return {
    title: 'Tower Duty',
    text: `${best ? 'My high score:' : 'I landed'} ${score} aircraft${best ? ' landed' : ''} on ${map.title} in Tower Duty! Rank: ${rankName(rankFor(map.id, score))}. Can you beat it?`,
    url: url.href,
  };
}

export function shareText(data: ShareData): string {
  return `${data.text}\n${data.url}`;
}

export function scoreCardFile(map: MapDef, score: number, best: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawShareCard(canvas.getContext('2d')!, previewWorld(map), { score, rank: rankName(rankFor(map.id, score)), best });
      canvas.toBlob((blob) => {
        resolve(blob === null ? null : new File([blob], `tower-duty-${map.id}-${score}.png`, { type: 'image/png' }));
      }, 'image/png');
    } catch {
      resolve(null);
    }
  });
}

function shareable(data: ShareData, card: File | null): ShareData | null {
  if (typeof navigator.share !== 'function') return null;
  if (typeof navigator.canShare !== 'function') return data;
  if (card !== null) {
    const withCard = { ...data, files: [card] };
    if (navigator.canShare(withCard)) return withCard;
  }
  return navigator.canShare(data) ? data : null;
}

export async function shareScore(data: ShareData, card: File | null = null): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  const payload = shareable(data, card);
  if (payload !== null) {
    try {
      await navigator.share(payload);
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
  let card: Promise<File | null> | undefined;
  // Painted ahead of the click: Safari rejects navigator.share once the tap's user activation has lapsed.
  const prepare = (): Promise<File | null> => (card ??= scoreCardFile(map, score, best));
  trigger.addEventListener('pointerdown', prepare);
  trigger.addEventListener('focus', prepare);
  trigger.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (trigger.disabled) return;
    trigger.disabled = true;
    status.textContent = '';
    field.hidden = true;
    const result = await shareScore(data, await prepare());
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
