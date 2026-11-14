import type { MapDef, PadMark } from '../config/maps';
import { distance, headingDeg, pointsFromFlat, type Point, type Polyline } from './geometry';

export const HELIPAD_CAPTURE_FACTOR = 1.5;

export type TypeFilter = ReadonlySet<number>;

export interface RunwayZone {
  kind: 'runway';
  start: Point;
  end: Point;
  heading: number;
  length: number;
  taxiPaths: Polyline[];
  flythrough: boolean;
  filter: TypeFilter;
}

export interface HelipadZone {
  kind: 'helipad';
  center: Point;
  radius: number;
  captureRadius: number;
  mark: PadMark;
  filter: TypeFilter;
}

export type LandingZone = RunwayZone | HelipadZone;

export interface World {
  map: MapDef;
  runways: RunwayZone[];
  helipads: HelipadZone[];
}

export function buildWorld(map: MapDef): World {
  const runways = map.runways.map((r): RunwayZone => {
    const start = { x: r.x1, y: r.y1 };
    const end = { x: r.x2, y: r.y2 };
    return {
      kind: 'runway',
      start,
      end,
      heading: headingDeg(start, end),
      length: distance(start, end),
      taxiPaths: r.taxiPaths.map(pointsFromFlat),
      flythrough: r.flythrough ?? false,
      filter: new Set(r.strips),
    };
  });

  const helipads = map.helipads.map((h): HelipadZone => {
    const radius = Math.max(0, ...h.strips.map((i) => map.strips[i]?.radius ?? 0));
    return {
      kind: 'helipad',
      center: { x: h.x, y: h.y },
      radius,
      captureRadius: radius * HELIPAD_CAPTURE_FACTOR,
      mark: h.mark ?? 'helipad',
      filter: new Set(h.strips),
    };
  });

  return { map, runways, helipads };
}

export function accepts(zone: LandingZone, strip: number): boolean {
  return zone.filter.has(strip);
}

export interface RunwayFrame {
  along: number;
  lateral: number;
}

export function runwayFrame(zone: RunwayZone, p: Point): RunwayFrame {
  const angle = (zone.heading * Math.PI) / 180;
  const dx = p.x - zone.start.x;
  const dy = p.y - zone.start.y;
  return {
    along: dx * Math.cos(angle) + dy * Math.sin(angle),
    lateral: dx * Math.sin(angle) - dy * Math.cos(angle),
  };
}
