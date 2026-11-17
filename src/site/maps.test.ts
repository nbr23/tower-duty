import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAP_SELECTOR, MEADOW } from '../config/maps';
import { createApp, mapFor, startGame } from '../ui/app';
import { choiceFromHash } from '../ui/debugShell';
import { mapPage } from './maps';

afterEach(() => vi.unstubAllGlobals());

describe('map share links', () => {
  it.each(['https://example.test/', 'https://example.test/games/tower-duty/'])('opens each map in the game menu under %s', (base) => {
    const storage = { getItem: () => null, setItem: vi.fn() } as unknown as Storage;
    for (const map of MAP_SELECTOR) {
      const html = mapPage(map, new URL(base));
      const replace = vi.fn();
      vi.stubGlobal('location', { replace });
      const script = html.match(/<script>(.*?)<\/script>/u)![1]!;
      new Function(script)();
      expect(replace).toHaveBeenCalledExactlyOnceWith(`../../#${map.id}`);
      const destination = new URL(replace.mock.calls[0]![0], `${base}m/${map.id}/`);
      expect(destination.href).toBe(`${base}#${map.id}`);
      vi.stubGlobal('location', destination);
      const app = createApp(storage, 42, choiceFromHash());
      expect(app.screen).toBe('menu');
      expect(app.session).toBeNull();
      expect(mapFor(app.choice).id).toBe(map.id);
      startGame(app, app.choice, 0);
      expect(app.screen).toBe('playing');
      expect(app.session!.game.world.map.id).toBe(map.id);
      expect(html).toContain(`href="../../#${map.id}"`);
    }
  });

  it.each(['https://example.test/', 'https://example.test/games/tower-duty/'])('preserves each map social preview under %s', (base) => {
    for (const map of MAP_SELECTOR) {
      const page = mapPage(map, new URL(base));
      expect(page).toContain(`<meta property="og:url" content="${base}m/${map.id}/">`);
      expect(page).toContain(`<meta property="og:image" content="${base}cards/${map.id}.jpg">`);
      expect(page).toContain(`<meta name="twitter:image" content="${base}cards/${map.id}.jpg">`);
    }
  });

  it('supports deployment without a configured site URL', () => {
    const page = mapPage(MEADOW);
    expect(page).toContain('content="../../cards/meadow.jpg"');
    expect(page).not.toContain('property="og:url"');
  });

  it('escapes map titles in markup and metadata', () => {
    const page = mapPage({ ...MEADOW, title: 'Meadow & "<airfield>"' });
    expect(page).toContain('<title>Tower Duty — Meadow &amp; &quot;&lt;airfield&gt;&quot;</title>');
    expect(page).not.toContain('<airfield>');
  });
});
