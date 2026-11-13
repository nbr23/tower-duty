import { isAirborne, type Aircraft, type PathPoint } from '../game/aircraft';
import { distance, lerpPoint, type Point } from '../game/geometry';
import { SUBDIVIDE_MAX } from '../game/path';
import type { LandingZone, World } from '../game/world';
import { stripColor } from './aircraft';
import { mix, rgba } from './color';

const PATH_WIDTH = 5;
const PATH_HOLD_MS = 1000;
const PATH_FADE_MS = 1500;
const PATH_LIGHTEN = 0.3;
const WHITE = 0xffffff;
const HIGHLIGHT = 'rgba(244, 242, 236, 0.55)';
const CORNER_REACH = SUBDIVIDE_MAX / 2;
const ALPHA_LEVELS = 32;
const END_DOT = PATH_WIDTH * 0.9;

function drawHighlight(ctx: CanvasRenderingContext2D, zone: LandingZone): void {
  ctx.strokeStyle = HIGHLIGHT;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (zone.kind === 'runway') {
    ctx.lineWidth = 18;
    ctx.moveTo(zone.start.x, zone.start.y);
    ctx.lineTo(zone.end.x, zone.end.y);
  } else {
    ctx.lineWidth = 5;
    ctx.arc(zone.center.x, zone.center.y, zone.captureRadius, 0, Math.PI * 2);
  }
  ctx.stroke();
}

export function drawHighlights(ctx: CanvasRenderingContext2D, aircraft: readonly Aircraft[]): void {
  const zones = new Set<LandingZone>();
  for (const a of aircraft) if (isAirborne(a) && a.flags.dragged && a.target !== null) zones.add(a.target);
  ctx.save();
  for (const zone of zones) drawHighlight(ctx, zone);
  ctx.restore();
}

function pointAlpha(pt: PathPoint, clock: number): number {
  if (pt.drawnAt === undefined) return 1;
  const age = clock - pt.drawnAt - PATH_HOLD_MS;
  return Math.max(0, Math.min(1, 1 - age / PATH_FADE_MS));
}

interface Knot {
  point: Point;
  alpha: number;
}

function reachT(from: Point, to: Point): number {
  const len = distance(from, to);
  return len > 0 ? Math.min(0.5, CORNER_REACH / len) : 0.5;
}

function along(knots: readonly Knot[], i: number, t: number): Knot {
  const a = knots[i]!;
  const b = knots[i + 1]!;
  return { point: lerpPoint(a.point, b.point, t), alpha: a.alpha + (b.alpha - a.alpha) * t };
}

function knotsOf(a: Aircraft, clock: number): Knot[] {
  return [
    { point: a.position, alpha: pointAlpha(a.path[0]!, clock) },
    ...a.path.map((pt) => ({ point: pt, alpha: pointAlpha(pt, clock) })),
  ];
}

function strokeBatch(ctx: CanvasRenderingContext2D, color: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineCap = alpha === 1 ? 'round' : 'butt';
  ctx.stroke();
}

function drawPath(ctx: CanvasRenderingContext2D, a: Aircraft, color: number, clock: number): void {
  const knots = knotsOf(a, clock);
  let batch = -1;
  const piece = (from: Knot, ctrl: Point | null, to: Knot): void => {
    const alpha = Math.round(((from.alpha + to.alpha) / 2) * ALPHA_LEVELS) / ALPHA_LEVELS;
    if (alpha !== batch) {
      strokeBatch(ctx, color, batch);
      batch = alpha;
      ctx.beginPath();
      ctx.moveTo(from.point.x, from.point.y);
    }
    if (ctrl === null) ctx.lineTo(to.point.x, to.point.y);
    else ctx.quadraticCurveTo(ctrl.x, ctrl.y, to.point.x, to.point.y);
  };
  const last = knots.length - 1;
  let from = knots[0]!;
  for (let i = 1; i < last; i++) {
    const corner = knots[i]!.point;
    const entry = along(knots, i - 1, 1 - reachT(knots[i - 1]!.point, corner));
    const exit = along(knots, i, reachT(corner, knots[i + 1]!.point));
    if (distance(from.point, entry.point) > 0) piece(from, null, entry);
    piece(entry, corner, exit);
    from = exit;
  }
  piece(from, null, knots[last]!);
  strokeBatch(ctx, color, batch);
  const end = knots[last]!;
  if (a.target !== null || end.alpha <= 0) return;
  ctx.fillStyle = rgba(color, end.alpha);
  ctx.beginPath();
  ctx.arc(end.point.x, end.point.y, END_DOT, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPaths(ctx: CanvasRenderingContext2D, world: World, aircraft: readonly Aircraft[], clock: number): void {
  ctx.save();
  ctx.lineWidth = PATH_WIDTH;
  ctx.lineJoin = 'round';
  for (const a of aircraft) {
    if (!isAirborne(a) || a.path.length === 0) continue;
    drawPath(ctx, a, mix(stripColor(world, a) ?? WHITE, WHITE, PATH_LIGHTEN), clock);
  }
  ctx.restore();
}
