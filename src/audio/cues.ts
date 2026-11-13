import type { GameEvent } from '../game/game';
import type { Audio } from './engine';
import type { SoundName } from './sounds';

export function playGameEvents(audio: Audio, events: readonly GameEvent[], highlights: boolean): void {
  const played = new Set<SoundName>();
  for (const { name } of events) {
    if (played.has(name) || (name === 'runway' && !highlights)) continue;
    played.add(name);
    audio.play(name);
  }
}
