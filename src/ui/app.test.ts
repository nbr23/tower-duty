import { describe, expect, it, vi } from 'vitest';
import { MAP_SELECTOR } from '../config/maps';
import { SAVE_KEY } from '../state/save';
import { createApp, selectMap, startGame } from './app';

function storage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  } as unknown as Storage;
}

describe('lobby map selection', () => {
  it('persists a selection without starting a session', () => {
    const store = storage();
    const app = createApp(store, 42, null);
    selectMap(app, 8);
    expect(app.choice).toBe(8);
    expect(app.screen).toBe('menu');
    expect(app.session).toBeNull();
    expect(app.fade).toBeNull();
    expect(JSON.parse(store.getItem(SAVE_KEY)!).lastMap).toBe(8);
    expect(createApp(store, 42, null).choice).toBe(8);
  });

  it('uses a shared map ahead of the saved selection', () => {
    const store = storage();
    selectMap(createApp(store, 42, null), 8);
    const app = createApp(store, 42, 3);
    expect(app.choice).toBe(3);
    expect(app.session).toBeNull();
  });

  it('starts the selected map with its saved best and preferences', () => {
    const app = createApp(storage(), 42, null);
    const map = MAP_SELECTOR[8]!;
    app.save.maps[map.id] = { highscore: 27, landed: 40, flightTimeMs: 3000, maxInAir: 5 };
    app.save.prefs.fastForwardOnStart = true;
    selectMap(app, 8);
    startGame(app, app.choice, 100);
    expect(app.screen).toBe('playing');
    expect(app.session!.game.world.map.id).toBe(map.id);
    expect(app.session!.game.personalBest).toBe(27);
    expect(app.session!.game.fastForward).toBe(true);
    expect(app.save.maps[map.id]!.highscore).toBe(27);
  });

  it.each([-1, 100, NaN, 1.5])('falls back to the first map for invalid selection %s', (choice) => {
    const app = createApp(storage(), 42, null);
    selectMap(app, choice);
    expect(app.choice).toBe(0);
    expect(app.save.lastMap).toBe(0);
    expect(app.session).toBeNull();
  });
});
