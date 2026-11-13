export interface Point {
  x: number;
  y: number;
}

export type Polyline = Point[];

export interface Frame {
  origin: Point;
  angle: number;
}

export function place(f: Frame, u: number, v: number): Point {
  const a = (f.angle * Math.PI) / 180;
  return { x: f.origin.x + u * Math.cos(a) - v * Math.sin(a), y: f.origin.y + u * Math.sin(a) + v * Math.cos(a) };
}

export function locate(f: Frame, p: Point): Point {
  const a = (f.angle * Math.PI) / 180;
  const dx = p.x - f.origin.x;
  const dy = p.y - f.origin.y;
  return { x: dx * Math.cos(a) + dy * Math.sin(a), y: -dx * Math.sin(a) + dy * Math.cos(a) };
}

export interface Segment {
  a: Point;
  b: Point;
}

export function pointsFromFlat(flat: readonly number[]): Polyline {
  const points: Polyline = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    points.push({ x: flat[i]!, y: flat[i + 1]! });
  }
  return points;
}

export function segments(poly: Polyline): Segment[] {
  const result: Segment[] = [];
  for (let i = 1; i < poly.length; i++) {
    result.push({ a: poly[i - 1]!, b: poly[i]! });
  }
  return result;
}

export function headingDeg(a: Point, b: Point): number {
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angleDiff(from: number, to: number): number {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

export function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function pointToSegmentDistance(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(a, p);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return distance(lerpPoint(a, b, t), p);
}

export function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const den = dax * dby - day * dbx;
  if (den === 0) return null;
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den;
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a1.x + dax * t, y: a1.y + day * t };
}
