import type { GameEventName } from '../game/game';

export type SoundName = GameEventName | 'menu' | 'menu_option';

export const VOLUMES: Record<SoundName, number> = {
  landed: 0.3,
  plane: 0.6,
  crashland: 0.8,
  runway: 0.85,
  proximity_warning: 1.0,
  fastplanewarn: 0.2,
  zeppelin_arriving: 1.0,
  ufo_arriving: 0.7,
  menu: 1.0,
  menu_option: 1.0,
};

export const SOUND_NAMES = Object.keys(VOLUMES) as SoundName[];
