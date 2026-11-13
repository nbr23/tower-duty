import { FLEET_CARRIER, FLEET_ESCORT } from '../../config/maps';
import type { Point } from '../../game/geometry';
import { fillView, patches, type Ctx, type Scene } from '../art';
import {
  CARRIER_DECK,
  SUPPORT_DECK,
  bowWave,
  cargoDeck,
  deckSpot,
  deckEquipment,
  elevator,
  framed,
  helideck,
  hull,
  island,
  landingArea,
  superstructure,
  wake,
} from './ships';
import { SWELL, inFrame, insidePolygon, swells } from './shared';

const SEA = '#22689a';
const SEA_TONES = ['#256c9b', '#216594'];
const ANGLED_DECK = 1;

export function fleet(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  const carrier = framed(FLEET_CARRIER, CARRIER_DECK);
  const escort = framed(FLEET_ESCORT, SUPPORT_DECK);
  const offHulls = (p: Point): boolean =>
    [carrier, escort].every((h) => !insidePolygon(p, h) && !insidePolygon({ x: p.x - 10, y: p.y - 12 }, h));

  fillView(g, SEA);
  patches(g, rng, SEA_TONES, 16, [120, 260]);
  swells(g, rng, 60, offHulls, SWELL);

  wake(g, FLEET_CARRIER, -270, 40, 700);
  wake(g, FLEET_ESCORT, -112, 22, 900);
  bowWave(g, FLEET_CARRIER, 272, 44);
  bowWave(g, FLEET_ESCORT, 116, 28);

  hull(g, escort, 12, '#7f878f');
  inFrame(g, FLEET_ESCORT, () => {
    helideck(g, { x: -106, y: -26, w: 68, h: 52 });
    cargoDeck(g, { x: 12, y: -22, w: 84, h: 44 }, 3);
    superstructure(g, { x: -34, y: -22, w: 42, h: 44 }, '#c9a53c');
  });
  deckSpot(g, world.helipads[1]!);

  hull(g, carrier, 22);
  inFrame(g, FLEET_CARRIER, () => {
    deckEquipment(g, -110, -55, 5);
    deckEquipment(g, 130, -26, 4);
    elevator(g, { x: -150, y: 26, w: 34, h: 18 });
    elevator(g, { x: 36, y: 38, w: 34, h: 18 });
    elevator(g, { x: 66, y: -70, w: 30, h: 20 });
  });
  world.runways.forEach((r, i) => landingArea(g, r, i === ANGLED_DECK));
  deckSpot(g, world.helipads[0]!);
  inFrame(g, FLEET_CARRIER, () => island(g, { x: -64, y: 38, w: 70, h: 16 }));
}
