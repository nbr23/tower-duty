import { place, type Frame, type Point } from '../../game/geometry';
import type { HelipadZone, RunwayZone } from '../../game/world';
import { RUNWAY_HALF_WIDTH, RUNWAY_OVERRUN, building, disc, shadowed, type Ctx } from '../art';
import { DECK_GREY, HULL_SIDE, inFrame, tracePolygon, type Rect } from './shared';

export type Local = readonly [u: number, v: number];

export const CARRIER_DECK: Local[] = [
  [-270, -30],
  [-160, -42],
  [-120, -70],
  [64, -72],
  [104, -46],
  [214, -42],
  [262, -22],
  [272, 0],
  [262, 24],
  [214, 44],
  [120, 46],
  [104, 58],
  [-70, 58],
  [-86, 46],
  [-250, 44],
  [-270, 32],
];

export const SUPPORT_DECK: Local[] = [
  [-112, -22],
  [-104, -30],
  [70, -30],
  [104, -16],
  [116, 0],
  [104, 16],
  [70, 30],
  [-104, 30],
  [-112, 22],
];

const PAINT = 'rgba(244, 242, 236, 0.8)';
const PAINT_FAINT = 'rgba(244, 242, 236, 0.3)';
const WORN = 'rgba(17, 21, 26, 0.16)';
const STEEL = '#858c94';
const STEEL_LIGHT = '#a3aab1';

export function stretch(deck: readonly Local[], ku: number, kv = ku): Local[] {
  return deck.map(([u, v]): Local => [u * ku, v * kv]);
}

export function framed(f: Frame, points: readonly Local[]): Point[] {
  return points.map(([u, v]) => place(f, u, v));
}

export function hull(g: Ctx, outline: readonly Point[], height: number, deck = DECK_GREY, side = HULL_SIDE): void {
  shadowed(g, height, 0.28, () => tracePolygon(g, outline));
  g.fillStyle = side;
  g.save();
  g.translate(0, 3);
  tracePolygon(g, outline);
  g.fill();
  g.restore();
  g.fillStyle = deck;
  tracePolygon(g, outline);
  g.fill();
  g.save();
  g.clip();
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  const wash = g.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, 'rgba(240, 247, 250, 0.09)');
  wash.addColorStop(1, 'rgba(10, 20, 30, 0.12)');
  g.fillStyle = wash;
  g.fillRect(x, y, w, h);
  g.restore();
  g.strokeStyle = 'rgba(244, 242, 236, 0.22)';
  g.lineWidth = 1;
  g.lineJoin = 'round';
  g.stroke();
}

export function wake(g: Ctx, f: Frame, stern: number, beam: number, length: number): void {
  inFrame(g, f, () => {
    const fade = g.createLinearGradient(stern, 0, stern - length, 0);
    fade.addColorStop(0, 'rgba(225, 246, 246, 0.18)');
    fade.addColorStop(1, 'rgba(225, 246, 246, 0)');
    g.fillStyle = fade;
    g.beginPath();
    g.moveTo(stern + 6, -beam * 0.65);
    g.bezierCurveTo(stern - length * 0.3, -beam, stern - length * 0.65, -beam * 1.8, stern - length, -beam * 2.4);
    g.lineTo(stern - length, beam * 2.4);
    g.bezierCurveTo(stern - length * 0.65, beam * 1.8, stern - length * 0.3, beam, stern + 6, beam * 0.65);
    g.closePath();
    g.fill();
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const u = stern - 10 - i * 14;
      g.strokeStyle = `rgba(235, 249, 249, ${0.25 - i * 0.026})`;
      g.lineWidth = 1.3;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(u, side * beam * (0.3 + i * 0.06));
        g.quadraticCurveTo(u - 8, side * beam * 0.2, u - 15, side * beam * 0.25);
        g.stroke();
      }
    }
  });
}

export function bowWave(g: Ctx, f: Frame, bow: number, beam: number): void {
  inFrame(g, f, () => {
    g.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    g.lineCap = 'round';
    g.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (const k of [0, 1]) {
        g.beginPath();
        g.moveTo(bow + 4 + k * 6, side * (2 + k * 5));
        g.quadraticCurveTo(bow - 16, side * (beam * 0.5 + k * 6), bow - 44 - k * 12, side * (beam * 0.8 + 6 + k * 8));
        g.stroke();
      }
    }
  });
}

export function landingArea(g: Ctx, r: RunwayZone, wires: boolean): void {
  const hw = RUNWAY_HALF_WIDTH;
  const from = -RUNWAY_OVERRUN;
  const span = r.length + 2 * RUNWAY_OVERRUN;
  g.save();
  g.translate(r.start.x, r.start.y);
  g.rotate((r.heading * Math.PI) / 180);
  g.fillStyle = WORN;
  g.fillRect(from, -hw, span, 2 * hw);
  g.fillStyle = PAINT;
  g.fillRect(from, -hw, span, 1.2);
  g.fillRect(from, hw - 1.2, span, 1.2);
  g.fillRect(from, -hw, 2.5, 2 * hw);
  g.fillStyle = PAINT_FAINT;
  for (let x = 8; x < r.length - 4; x += 16) g.fillRect(x, -1, 9, 2);
  if (wires) {
    g.strokeStyle = 'rgba(17, 21, 26, 0.55)';
    g.lineWidth = 0.9;
    g.beginPath();
    for (const x of [18, 27, 36, 45]) {
      g.moveTo(x, -hw - 3);
      g.lineTo(x, hw + 3);
    }
    g.stroke();
  }
  g.restore();
}

export function deckSpot(g: Ctx, pad: HelipadZone): void {
  const { x, y } = pad.center;
  disc(g, x, y, pad.radius + 4, WORN);
  g.strokeStyle = PAINT;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, y, pad.radius + 4, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = PAINT_FAINT;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, pad.radius * 0.5, 0, Math.PI * 2);
  g.stroke();
}

export function elevator(g: Ctx, r: Rect): void {
  g.fillStyle = 'rgba(244, 242, 236, 0.07)';
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = 'rgba(17, 21, 26, 0.4)';
  g.lineWidth = 1;
  g.strokeRect(r.x, r.y, r.w, r.h);
}

export function island(g: Ctx, r: Rect): void {
  building(g, r.x, r.y, r.w, r.h, STEEL, 16);
  building(g, r.x + r.w * 0.18, r.y + r.h * 0.18, r.w * 0.5, r.h * 0.64, STEEL_LIGHT, 22);
  disc(g, r.x + r.w * 0.82, r.y + r.h * 0.5, r.h * 0.26, HULL_SIDE);
  disc(g, r.x + r.w * 0.82, r.y + r.h * 0.5, r.h * 0.12, STEEL_LIGHT);
  g.fillStyle = HULL_SIDE;
  g.fillRect(r.x + r.w * 0.4, r.y + r.h * 0.5 - 0.8, r.w * 0.12, 1.6);
}

export function superstructure(g: Ctx, r: Rect, funnel: string): void {
  building(g, r.x, r.y, r.w, r.h, '#d9dcdf', 12);
  building(g, r.x + r.w * 0.55, r.y + r.h * 0.12, r.w * 0.38, r.h * 0.76, '#eceeef', 18);
  disc(g, r.x + r.w * 0.26, r.y + r.h * 0.5, r.h * 0.2, funnel);
  disc(g, r.x + r.w * 0.26, r.y + r.h * 0.5, r.h * 0.1, '#2b2f34');
}

export function helideck(g: Ctx, r: Rect): void {
  g.fillStyle = WORN;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = PAINT_FAINT;
  g.lineWidth = 1;
  g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
}

export function cargoDeck(g: Ctx, r: Rect, hatches: number): void {
  const step = r.w / hatches;
  for (let i = 0; i < hatches; i++) {
    const x = r.x + i * step;
    g.fillStyle = 'rgba(17, 21, 26, 0.14)';
    g.fillRect(x + 4, r.y + 5, step - 14, r.h - 10);
    building(g, x + step - 8, r.y + r.h / 2 - 3, 6, 6, '#c9a53c', 14);
    g.strokeStyle = 'rgba(17, 21, 26, 0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + step - 5, r.y + 3);
    g.lineTo(x + step - 5, r.y + r.h - 3);
    g.stroke();
  }
}

export function deckEquipment(g: Ctx, x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const u = x + i * 19;
    g.strokeStyle = PAINT_FAINT;
    g.lineWidth = 0.7;
    g.strokeRect(u - 2, y - 2, 14, 9);
    building(g, u, y, 7, 4, i % 2 === 0 ? '#a69e7d' : '#b5bcc0', 2);
    g.fillStyle = '#303943';
    g.fillRect(u + 1, y - 1, 2, 1);
    g.fillRect(u + 1, y + 4, 2, 1);
  }
}
