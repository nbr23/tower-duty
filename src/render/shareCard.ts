import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { World } from '../game/world';
import type { Ctx } from './art';
import { paintArt } from './background';
import { drawZones } from './map';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export interface CardResult {
  score: number;
  rank: string;
  best: boolean;
}

const INK = '17, 21, 26';
const TEXT = '#f4f2ec';
const ACCENT = '#ffd02e';
const ACCENT_INK = '#15130a';
const LEFT = 72;
const BAR_HEIGHT = 16;

function font(size: number, weight = 800): string {
  return `${weight} ${size}px system-ui, sans-serif`;
}

function drawScenery(g: Ctx, world: World): void {
  const scale = CARD_WIDTH / WORLD_WIDTH;
  g.save();
  g.setTransform(scale, 0, 0, scale, 0, (CARD_HEIGHT - WORLD_HEIGHT * scale) / 2);
  paintArt(g, world);
  drawZones(g, world);
  g.restore();
}

function drawShade(g: Ctx): void {
  const shade = g.createLinearGradient(0, 0, CARD_WIDTH, 0);
  shade.addColorStop(0, `rgba(${INK}, 0.94)`);
  shade.addColorStop(0.45, `rgba(${INK}, 0.8)`);
  shade.addColorStop(1, `rgba(${INK}, 0.2)`);
  g.fillStyle = shade;
  g.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function drawWordmark(g: Ctx): void {
  g.font = font(46);
  g.fillStyle = TEXT;
  g.fillText('TOWER', LEFT, 112);
  g.fillStyle = ACCENT;
  g.fillText('DUTY', LEFT + g.measureText('TOWER ').width, 112);
}

function drawResult(g: Ctx, result: CardResult): void {
  g.font = font(190);
  g.fillStyle = ACCENT;
  g.fillText(String(result.score), LEFT - 8, 410);
  g.font = font(34);
  g.fillStyle = TEXT;
  g.fillText(result.best ? 'AIRCRAFT LANDED · HIGH SCORE' : 'AIRCRAFT LANDED', LEFT, 468);
  g.font = font(30);
  const rank = result.rank.toUpperCase();
  const width = g.measureText(rank).width + 44;
  g.beginPath();
  g.roundRect(LEFT, 504, width, 58, 29);
  g.fillStyle = ACCENT;
  g.fill();
  g.fillStyle = ACCENT_INK;
  g.fillText(rank, LEFT + 22, 544);
}

function drawChallenge(g: Ctx): void {
  g.font = font(88);
  g.fillStyle = ACCENT;
  g.fillText('CAN YOU BEAT', LEFT, 400);
  g.fillText('MY SCORE?', LEFT, 496);
}

export function drawShareCard(g: Ctx, world: World, result: CardResult | null): void {
  drawScenery(g, world);
  drawShade(g);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  drawWordmark(g);
  g.font = font(38, 700);
  g.fillStyle = TEXT;
  g.fillText(world.map.title.toUpperCase(), LEFT, result === null ? 290 : 216);
  if (result === null) drawChallenge(g);
  else drawResult(g, result);
  g.fillStyle = ACCENT;
  g.fillRect(0, CARD_HEIGHT - BAR_HEIGHT, CARD_WIDTH, BAR_HEIGHT);
}
