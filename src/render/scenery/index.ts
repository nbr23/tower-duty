import { fillView, type Ctx } from '../art';
import { altiport } from './altiport';
import { meadow } from './meadow';
import { fleet } from './fleet';
import { lakeside } from './lakeside';
import { airshow } from './airshow';
import { canyon } from './canyon';
import { coast } from './coast';
import { arcticOutpost } from './arctic-outpost';
import { volcanoIsland } from './volcano-island';
import { cityLights } from './city-lights';
import { moonBase } from './moon-base';
import { hub } from './hub';
import type { Painter } from './shared';

export type { Painter } from './shared';

export const PAINTERS: Record<string, Painter> = {
  'altiport': altiport,
  'meadow': meadow,
  'fleet': fleet,
  'lakeside': lakeside,
  'airshow': airshow,
  'canyon': canyon,
  'coast': coast,
  'arctic-outpost': arcticOutpost,
  'volcano-island': volcanoIsland,
  'city-lights': cityLights,
  'moon-base': moonBase,
  'hub': hub,
};

export function paintPlain(g: Ctx): void {
  fillView(g, '#1c222b');
}
