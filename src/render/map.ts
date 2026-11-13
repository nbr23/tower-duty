import { VIEW, WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { Point } from '../game/geometry';
import type { HelipadZone, LandingZone, RunwayZone, World } from '../game/world';
import { drawBackground, paintArt } from './background';
import { hex } from './color';

const NEUTRAL_ZONE = '#d9d9d9';
const ZONE_LINE_WIDTH = 3.5;
const ZONE_CASING_WIDTH = 6.5;
const PAD_LABEL_MAX = 24;
const ZONE_CASING = 'rgba(17, 21, 26, 0.5)';
const PAD_TINT = 0.16;
const SURROUND_DIM = 'rgba(17, 21, 26, 0.35)';
const SURROUND_EDGE = 'rgba(244, 242, 236, 0.18)';

export function stripColor(world: World, stripIndex: number): string {
  const strip = world.map.strips[stripIndex];
  const color = strip === undefined ? undefined : world.map.colors[strip.color];
  return color === undefined ? NEUTRAL_ZONE : hex(color);
}

export function zoneColor(world: World, zone: LandingZone): string {
  const [first] = zone.filter;
  return first === undefined ? NEUTRAL_ZONE : stripColor(world, first);
}

export function drawArrowhead(ctx: CanvasRenderingContext2D, tip: Point, headingDeg: number, size = 10): void {
  const angle = (headingDeg * Math.PI) / 180;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(angle - 0.45), tip.y - size * Math.sin(angle - 0.45));
  ctx.lineTo(tip.x - size * Math.cos(angle + 0.45), tip.y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx: CanvasRenderingContext2D, world: World, runway: RunwayZone): void {
  const color = zoneColor(world, runway);
  const angle = (runway.heading * Math.PI) / 180;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(runway.start.x, runway.start.y);
  ctx.lineTo(runway.end.x, runway.end.y);
  ctx.strokeStyle = ZONE_CASING;
  ctx.lineWidth = ZONE_CASING_WIDTH;
  ctx.stroke();
  ctx.fillStyle = ZONE_CASING;
  drawArrowhead(ctx, { x: runway.end.x + Math.cos(angle) * 2.5, y: runway.end.y + Math.sin(angle) * 2.5 }, runway.heading, 14.5);
  ctx.beginPath();
  ctx.moveTo(runway.start.x, runway.start.y);
  ctx.lineTo(runway.end.x, runway.end.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = ZONE_LINE_WIDTH;
  ctx.stroke();
  ctx.fillStyle = color;
  drawArrowhead(ctx, runway.end, runway.heading);
}

function drawTarget(ctx: CanvasRenderingContext2D, center: Point, size: number, color: string): void {
  const inner = size * 0.16;
  const outer = size * 0.5;
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    ctx.moveTo(center.x + dx * inner, center.y + dy * inner);
    ctx.lineTo(center.x + dx * outer, center.y + dy * outer);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawHelipad(ctx: CanvasRenderingContext2D, world: World, pad: HelipadZone): void {
  const color = zoneColor(world, pad);
  ctx.beginPath();
  ctx.arc(pad.center.x, pad.center.y, pad.radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = PAD_TINT;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ZONE_CASING;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const label = Math.round(pad.radius * 1.1);
  if (label > PAD_LABEL_MAX) return;
  if (pad.mark === 'target') {
    drawTarget(ctx, pad.center, Math.max(8, label), color);
    return;
  }
  ctx.font = `800 ${Math.max(8, label)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText('H', pad.center.x, pad.center.y + 0.5);
}

export function drawZones(ctx: CanvasRenderingContext2D, world: World): void {
  for (const r of world.runways) drawRunway(ctx, world, r);
  for (const h of world.helipads) drawHelipad(ctx, world, h);
}

export function drawMap(ctx: CanvasRenderingContext2D, world: World, bleed = false): void {
  drawBackground(ctx, world, bleed);
  drawZones(ctx, world);
}

export function drawSurround(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
  ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.fillStyle = SURROUND_DIM;
  ctx.fill('evenodd');
  ctx.strokeStyle = SURROUND_EDGE;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

export function paintThumbnail(world: World, width: number): HTMLCanvasElement {
  const scale = width / WORLD_WIDTH;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(WORLD_HEIGHT * scale);
  const g = canvas.getContext('2d')!;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  paintArt(g, world);
  drawZones(g, world);
  return canvas;
}
