import { isAirborne, type Aircraft } from '../game/aircraft';
import { emit, type Game } from '../game/game';
import { distance, type Point } from '../game/geometry';
import { createRunwayStroke, extendPath, type RunwayStroke } from '../game/path';

export const SELECT_RADIUS = 140;
export const TAP_WINDOW_MS = 300;
export const TAPS_TO_CLEAR = 4;
export const MAX_POINTERS = 5;
export const DRAG_SLOP = 6;

interface Drag {
  aircraft: Aircraft;
  origin: Point;
  moved: boolean;
  snapped: boolean;
  stroke: RunwayStroke | null;
}

interface TapCount {
  count: number;
  lastAt: number;
}

export interface DragController {
  drags: Map<number, Drag>;
  taps: WeakMap<Aircraft, TapCount>;
}

export function createDragController(): DragController {
  return { drags: new Map(), taps: new WeakMap() };
}

export function resetInput(ctrl: DragController): void {
  for (const drag of ctrl.drags.values()) drag.aircraft.flags.dragged = false;
  ctrl.drags.clear();
  ctrl.taps = new WeakMap();
}

function isDragged(ctrl: DragController, a: Aircraft): boolean {
  for (const drag of ctrl.drags.values()) if (drag.aircraft === a) return true;
  return false;
}

export function pickAircraft(ctrl: DragController, game: Game, p: Point): Aircraft | null {
  let best: Aircraft | null = null;
  let bestDist = SELECT_RADIUS;
  for (const a of game.aircraft) {
    if (!a.flags.selectable || isDragged(ctrl, a)) continue;
    const d = distance(a.position, p);
    if (d <= bestDist) {
      best = a;
      bestDist = d;
    }
  }
  return best;
}

export function pointerDown(ctrl: DragController, game: Game, id: number, p: Point): boolean {
  if (ctrl.drags.has(id)) return true;
  if (game.crashedAt !== undefined || ctrl.drags.size >= MAX_POINTERS) return false;
  const aircraft = pickAircraft(ctrl, game, p);
  if (aircraft === null) return false;
  aircraft.flags.dragged = true;
  ctrl.drags.set(id, { aircraft, origin: p, moved: false, snapped: false, stroke: null });
  emit(game, 'plane');
  return true;
}

export function pointerMove(ctrl: DragController, game: Game, id: number, p: Point, final = false): void {
  const drag = ctrl.drags.get(id);
  if (drag === undefined || drag.snapped || game.crashedAt !== undefined || !isAirborne(drag.aircraft)) return;
  const a = drag.aircraft;
  if (!drag.moved) {
    if (distance(drag.origin, p) < DRAG_SLOP) return;
    const saved = a.path;
    const savedTarget = a.target;
    a.path = [];
    a.target = null;
    const stroke = createRunwayStroke(a.position);
    const result = extendPath(game.world, a, p, game.clock, stroke, final);
    if (result === 'dropped') {
      a.path = saved;
      a.target = savedTarget;
      return;
    }
    drag.moved = true;
    drag.stroke = stroke;
    if (result === 'snapped') snapped(game, drag);
    return;
  }
  if (extendPath(game.world, a, p, game.clock, drag.stroke!, final) === 'snapped') snapped(game, drag);
}

function snapped(game: Game, drag: Drag): void {
  drag.snapped = true;
  emit(game, 'runway');
}

function countTap(ctrl: DragController, a: Aircraft, now: number): void {
  const prev = ctrl.taps.get(a);
  const count = prev !== undefined && now - prev.lastAt <= TAP_WINDOW_MS ? prev.count + 1 : 1;
  if (count >= TAPS_TO_CLEAR) {
    a.path = [];
    a.target = null;
    ctrl.taps.delete(a);
    return;
  }
  ctrl.taps.set(a, { count, lastAt: now });
}

export function pointerUp(ctrl: DragController, id: number, now: number): void {
  const drag = ctrl.drags.get(id);
  if (drag === undefined) return;
  ctrl.drags.delete(id);
  drag.aircraft.flags.dragged = false;
  if (drag.moved) ctrl.taps.delete(drag.aircraft);
  else if (isAirborne(drag.aircraft)) countTap(ctrl, drag.aircraft, now);
}
