import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { directionFromHeading, fullyInside, type Aircraft } from './aircraft';
import { angleDiff, distance, headingDeg, wrapDeg } from './geometry';

export const FOLLOW_SUBSTEPS = 3;
export const SLEW_DIVISOR = 25;
export const TRAIL_SAMPLES = 5;

export function advance(a: Aircraft, dt: number): void {
  a.position.x += a.velocityDir.x * a.speed * dt;
  a.position.y += a.velocityDir.y * a.speed * dt;
}

export function slewHeading(a: Aircraft, desired: number, dt: number): void {
  const maxTurn = (a.turnRate * dt) / SLEW_DIVISOR;
  const diff = angleDiff(a.heading, desired);
  a.heading = wrapDeg(a.heading + Math.max(-maxTurn, Math.min(maxTurn, diff)));
  a.velocityDir = directionFromHeading(a.heading);
}

function reachRadius(a: Aircraft, step: number): number {
  const turnRadPerMs = ((a.turnRate / SLEW_DIVISOR) * Math.PI) / 180;
  return Math.max(step, turnRadPerMs > 0 ? (2 * a.speed) / turnRadPerMs : 0);
}

export function followPath(a: Aircraft, dt: number): void {
  const subDt = dt / FOLLOW_SUBSTEPS;
  const step = a.speed * subDt;
  for (let i = 0; i < FOLLOW_SUBSTEPS; i++) {
    const target = a.path[0];
    if (target !== undefined) slewHeading(a, headingDeg(a.position, target), subDt);
    advance(a, subDt);
    while (a.path.length > 0 && distance(a.position, a.path[0]!) <= reachRadius(a, step)) a.path.shift();
  }
}

export function recordTrail(a: Aircraft): void {
  a.trail.push({ ...a.position });
  if (a.trail.length > TRAIL_SAMPLES) a.trail.shift();
}

export function bounceOffEdges(a: Aircraft): void {
  const { x, y } = a.position;
  const r = a.radius;
  const v = a.velocityDir;
  let bounced = false;
  if ((x < r && v.x < 0) || (x > WORLD_WIDTH - r && v.x > 0)) {
    v.x = -v.x;
    bounced = true;
  }
  if ((y < r && v.y < 0) || (y > WORLD_HEIGHT - r && v.y > 0)) {
    v.y = -v.y;
    bounced = true;
  }
  if (bounced) a.heading = headingDeg({ x: 0, y: 0 }, v);
  if (a.flags.entering && fullyInside(a)) a.flags.entering = false;
}
