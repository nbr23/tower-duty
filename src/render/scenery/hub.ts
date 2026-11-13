import { HUB_APRONS, HUB_TERMINAL } from '../../config/maps';
import {
  building,
  disc,
  fillView,
  helipad,
  patches,
  polylineDistance,
  runway,
  strokeLine,
  taxiMarkings,
  taxiRoutes,
  taxiway,
  type Ctx,
  type Scene,
} from '../art';
import { AIRFIELD_GRASS, GRASS, TREES, carPark, inRect, road, runwayStrip, tower, treeClumps } from './shared';

const ESTATE = { x: 102, y: 66, w: 700, h: 380 };
const ACCESS = [{ x: 1040, y: 310 }, { x: 820, y: 310 }, { x: 820, y: 170 }, { x: 792, y: 170 }];
const SERVICE = [{ x: 820, y: 310 }, { x: 420, y: 310 }, { x: 420, y: 280 }];
const CONCRETE = '#bbc0bb';
const ASPHALT = '#81888b';
const WAREHOUSES = [
  { x: 594, y: 450, w: 74, h: 28 },
  { x: 686, y: 450, w: 74, h: 28 },
];

export function hub(g: Ctx, scene: Scene): void {
  const { world, rng } = scene;
  fillView(g, GRASS[0]!);
  patches(g, rng, GRASS, 20, [70, 160], (p) => !inRect(p, ESTATE, 60));

  g.fillStyle = AIRFIELD_GRASS;
  g.beginPath();
  g.roundRect(ESTATE.x, ESTATE.y, ESTATE.w, ESTATE.h, 16);
  g.fill();
  g.strokeStyle = '#75896a';
  g.lineWidth = 1;
  g.stroke();
  for (const r of world.runways) runwayStrip(g, r, 27, 28);

  road(g, ACCESS, '#686f73', 10);
  road(g, SERVICE, '#8b918c', 5);
  road(g, [{ x: 820, y: 310 }, { x: 820, y: 488 }, { x: 580, y: 488 }], '#8b918c', 6);
  carPark(g, rng, { x: 652, y: 270, w: 136, h: 28 });
  road(g, [{ x: 788, y: 284 }, { x: 820, y: 284 }], '#81888b', 6);

  for (const { lane, park, stands } of HUB_APRONS) {
    const left = stands[0] - 28;
    const top = Math.min(lane, park) - 12;
    const width = stands[stands.length - 1]! - stands[0] + 56;
    const height = Math.abs(lane - park) + 30;
    g.fillStyle = CONCRETE;
    g.fillRect(left, top, width, height);
    for (let x = left + 16; x < left + width; x += 16) {
      strokeLine(g, [{ x, y: top }, { x, y: top + height }], 0.6, 'rgba(73, 81, 83, 0.16)', false);
    }
    for (let y = top + 16; y < top + height; y += 16) {
      strokeLine(g, [{ x: left, y }, { x: left + width, y }], 0.6, 'rgba(73, 81, 83, 0.16)', false);
    }
  }
  for (const r of world.runways) taxiway(g, r, ASPHALT);
  taxiMarkings(g, world.runways.flatMap(taxiRoutes));
  for (const r of world.runways) runway(g, r);

  const terminal = HUB_TERMINAL;
  building(g, terminal.x, terminal.y, terminal.w, terminal.h, '#dce0dd', 7);
  g.fillStyle = '#7495a1';
  g.fillRect(terminal.x + 5, terminal.y + 3, terminal.w - 10, 3);
  g.fillRect(terminal.x + 5, terminal.y + terminal.h - 6, terminal.w - 10, 3);
  g.fillStyle = '#b0b8b8';
  for (let x = terminal.x + 12; x < terminal.x + terminal.w - 8; x += 24) g.fillRect(x, terminal.y + 8, 8, 4);
  for (const [i, apron] of HUB_APRONS.entries()) {
    for (const [j, x] of apron.stands.entries()) {
      if (i < 2) {
        const y = i === 0 ? terminal.y - 9 : terminal.y + terminal.h;
        building(g, x - 3, y, 6, 9, '#d1d5cf', 2);
      }
      g.fillStyle = '#4e5b60';
      g.font = 'bold 6px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`${String.fromCharCode(65 + i)}${j + 1}`, x + 12, apron.park);
    }
  }

  for (const h of world.helipads) helipad(g, h, '#a6ada7');
  building(g, 395, 266, 42, 24, '#d5d8cf', 6);
  g.fillStyle = '#b3bcb4';
  g.fillRect(401, 269, 30, 4);
  tower(g, { x: 552, y: 280 }, 7);

  for (const h of WAREHOUSES) {
    building(g, h.x, h.y, h.w, h.h, '#c5c9c6', 8);
    for (let x = h.x + 5; x < h.x + h.w - 4; x += 12) {
      strokeLine(g, [{ x, y: h.y + 3 }, { x, y: h.y + h.h - 3 }], 1, '#a3aba9', false);
      g.fillStyle = '#6f7d80';
      g.fillRect(x, h.y - 1, 7, 3);
    }
  }
  for (const [x, y] of [[783, 397], [783, 414], [783, 431]] as const) {
    disc(g, x + 2, y + 3, 6, 'rgba(17, 21, 26, 0.18)');
    disc(g, x, y, 6, '#d7d9ce');
    disc(g, x - 1, y - 1, 3.8, '#ebece0');
  }
  treeClumps(g, scene, 24, TREES, [4, 7], (p) =>
    !inRect(p, ESTATE, 26) &&
    WAREHOUSES.every((h) => !inRect(p, h, 24)) &&
    polylineDistance(p, ACCESS) > 24 &&
    (p.x < 790 || p.x > 850) &&
    p.y < 460);
}
