import { afterEach, describe, expect, it, vi } from 'vitest';
import { MEADOW } from '../config/maps';
import { scoreShareData, shareScore, shareText } from './share';

afterEach(() => vi.unstubAllGlobals());

const data = scoreShareData(MEADOW, 120, false, 'https://example.com/play/?debug&seed=42#fleet');

describe('score sharing', () => {
  it('includes the result, map, rank, and a clean link selecting the map', () => {
    expect(data).toEqual({
      title: 'Tower Duty',
      text: `I landed 120 aircraft on ${MEADOW.title} in Tower Duty! Rank: CoPilot. Can you beat it?`,
      url: 'https://example.com/play/m/meadow/',
    });
    expect(scoreShareData(MEADOW, 1, true, 'https://example.com/').text).toContain('My high score: 1 aircraft landed');
  });

  it('opens native sharing without copying', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });
    expect(await shareScore(data)).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('attaches the score card when files can be shared', async () => {
    const card = new File(['card'], 'card.png', { type: 'image/png' });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareScore(data, card)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ ...data, files: [card] });
  });

  it('shares without the score card when files cannot be shared', async () => {
    const card = new File(['card'], 'card.png', { type: 'image/png' });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: (payload: ShareData) => payload.files === undefined });
    expect(await shareScore(data, card)).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
  });

  it('does not copy when native sharing is cancelled', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
      clipboard: { writeText },
    });
    expect(await shareScore(data)).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'unsupported', 'failed'])('copies the score and link when sharing is %s', async (state) => {
    const share = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: state === 'unavailable' ? undefined : share,
      canShare: () => state !== 'unsupported',
      clipboard: { writeText },
    });
    expect(await shareScore(data)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(shareText(data));
    if (state !== 'failed') expect(share).not.toHaveBeenCalled();
  });

  it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error('Denied')) }])(
    'offers manual copying if clipboard access is unavailable or denied',
    async (clipboard) => {
      vi.stubGlobal('navigator', { clipboard });
      expect(await shareScore(data)).toBe('manual');
    },
  );
});
