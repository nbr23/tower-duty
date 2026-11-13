import { VIEW } from '../../config/world';
import { locate, place, type Frame, type Point } from '../../game/geometry';
import type { Rng } from '../../game/rng';
import { between, building, pick, polylineDistance, strokeLine, tree, type Ctx } from '../art';
import { inFrame, insidePolygon, tracePolygon } from './shared';

export interface Lattice {
  frame: Frame;
  cw: number;
  ch: number;
}

export interface Span {
  u: number;
  v: number;
  w: number;
  h: number;
}

export type Vertex = readonly [i: number, j: number];

export interface Field extends Span {
  corners: [Point, Point, Point, Point];
  wood: boolean;
}

export interface LandPlan {
  lattice: Lattice;
  perimeter: readonly Point[];
  roads: readonly Vertex[][];
  woods?: number;
}

export interface Land {
  lattice: Lattice;
  fields: Field[];
  roads: Point[][];
  perimeter: readonly Point[];
  lots: Span[];
  inEstate(p: Point): boolean;
}

export function layoutLand(rng: Rng, plan: LandPlan): Land {
  const { lattice: l, perimeter, roads, woods = 0.05 } = plan;
  const bounds = [
    { x: VIEW.x, y: VIEW.y },
    { x: VIEW.x + VIEW.w, y: VIEW.y },
    { x: VIEW.x, y: VIEW.y + VIEW.h },
    { x: VIEW.x + VIEW.w, y: VIEW.y + VIEW.h },
  ].map((p) => locate(l.frame, p));
  const i0 = Math.floor(Math.min(...bounds.map((p) => p.x)) / l.cw) - 1;
  const i1 = Math.ceil(Math.max(...bounds.map((p) => p.x)) / l.cw) + 1;
  const j0 = Math.floor(Math.min(...bounds.map((p) => p.y)) / l.ch) - 1;
  const j1 = Math.ceil(Math.max(...bounds.map((p) => p.y)) / l.ch) + 1;
  const fields: Field[] = [];
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1;) {
      let cells = rng() < 0.55 ? 2 : 1;
      const crossesRoad = roads.some((road) => road.some(([u, v], n) => {
        const previous = road[n - 1];
        return previous !== undefined && u === i + 1 && previous[0] === u &&
          j >= Math.min(v, previous[1]) && j < Math.max(v, previous[1]);
      }));
      if (crossesRoad) cells = 1;
      const u = i * l.cw;
      const v = j * l.ch;
      const w = cells * l.cw;
      const h = l.ch;
      fields.push({
        u, v, w, h,
        wood: rng() < woods,
        corners: [place(l.frame, u, v), place(l.frame, u + w, v), place(l.frame, u + w, v + h), place(l.frame, u, v + h)],
      });
      i += cells;
    }
  }
  return {
    lattice: l,
    fields,
    perimeter,
    roads: roads.map((road) => road.map(([i, j]) => place(l.frame, i * l.cw, j * l.ch))),
    lots: [],
    inEstate: (p) => insidePolygon(locate(l.frame, p), perimeter),
  };
}

export function clearOfEstate(land: Land, p: Point, margin: number): boolean {
  const q = locate(land.lattice.frame, p);
  return !land.inEstate(p) &&
    polylineDistance(q, [...land.perimeter, land.perimeter[0]!]) > margin &&
    land.lots.every((r) => q.x < r.u - margin || q.x > r.u + r.w + margin || q.y < r.v - margin || q.y > r.v + r.h + margin);
}

export function roadDistance(land: Land, p: Point): number {
  return Math.min(Infinity, ...land.roads.map((road) => polylineDistance(p, road)));
}

export interface FieldStyle {
  colors: readonly string[];
  hedge: string;
  wood: string;
  stripes?: number;
}

export function paintFields(g: Ctx, rng: Rng, land: Land, style: FieldStyle): void {
  inFrame(g, land.lattice.frame, () => {
    for (const f of land.fields) {
      g.fillStyle = f.wood ? style.wood : pick(rng, style.colors);
      g.fillRect(f.u, f.v, f.w + 0.5, f.h + 0.5);
      if (!f.wood && rng() < (style.stripes ?? 0.55)) {
        g.fillStyle = 'rgba(255, 255, 255, 0.045)';
        for (let v = f.v + 5; v < f.v + f.h - 3; v += 6) g.fillRect(f.u + 3, v, f.w - 6, 2);
      }
      g.strokeStyle = style.hedge;
      g.lineWidth = 1;
      g.strokeRect(f.u + 0.5, f.v + 0.5, f.w - 1, f.h - 1);
    }
  });
}

export function paintRoads(g: Ctx, land: Land, surface: string, width: number, casing: string): void {
  for (const [color, w] of [[casing, width + 3], [surface, width]] as const) {
    for (const road of land.roads) strokeLine(g, road, w, color, false);
  }
}

export interface EstateStyle {
  grass: string;
  hedge: string;
  track: string;
  fence: string;
}

export function paintEstate(g: Ctx, land: Land, style: EstateStyle): void {
  inFrame(g, land.lattice.frame, () => {
    tracePolygon(g, land.perimeter);
    g.fillStyle = style.grass;
    g.fill();
    g.save();
    g.clip();
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = style.track;
    g.stroke();
    g.restore();
    g.lineWidth = 1.5;
    g.strokeStyle = style.hedge;
    g.stroke();
    g.setLineDash([1, 7]);
    g.lineWidth = 0.8;
    g.strokeStyle = style.fence;
    g.stroke();
    g.setLineDash([]);
  });
}

export function hedgerowTrees(g: Ctx, rng: Rng, land: Land, share: number, colors: readonly string[], ok: (p: Point, r: number) => boolean): void {
  for (const f of land.fields) {
    const [a, b, , d] = f.corners;
    for (const end of [b, d]) {
      if (rng() > share) continue;
      const len = Math.hypot(end.x - a.x, end.y - a.y);
      for (let s = between(rng, 0, 10); s < len; s += between(rng, 8, 16)) {
        const t = s / len;
        const p = { x: a.x + (end.x - a.x) * t, y: a.y + (end.y - a.y) * t };
        const r = between(rng, 3.2, 5.6);
        if (rng() < 0.6 && ok(p, r)) tree(g, rng, p.x, p.y, r, colors);
      }
    }
  }
}

export function woodlots(g: Ctx, rng: Rng, land: Land, colors: readonly string[], ok: (p: Point, r: number) => boolean): void {
  for (const f of land.fields) {
    if (!f.wood) continue;
    for (let v = f.v + 5; v < f.v + f.h - 3; v += 7) {
      for (let u = f.u + 5; u < f.u + f.w - 3; u += 7) {
        const p = place(land.lattice.frame, u + between(rng, -2, 2), v + between(rng, -2, 2));
        const r = between(rng, 3.6, 6);
        if (ok(p, r)) tree(g, rng, p.x, p.y, r, colors);
      }
    }
  }
}

export function hamlet(g: Ctx, rng: Rng, land: Land, area: Span, count: number, roofs: readonly string[], farm = false): void {
  const frame = land.lattice.frame;
  const size = farm ? 34 : 24;
  let placed = 0;
  for (const road of land.roads) {
    const local = road.map((p) => locate(frame, p));
    for (let i = 1; i < local.length; i++) {
      const a = local[i - 1]!;
      const b = local[i]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const dx = (b.x - a.x) / length;
      const dy = (b.y - a.y) / length;
      for (let d = size; d < length - size && placed < count; d += size + 12) {
        for (const side of [-1, 1]) {
          const entry = { x: a.x + dx * d, y: a.y + dy * d };
          const q = { x: entry.x - dy * side * (size / 2 + 9), y: entry.y + dx * side * (size / 2 + 9) };
          if (q.x < area.u || q.x > area.u + area.w || q.y < area.v || q.y > area.v + area.h || placed >= count) continue;
          const p = place(frame, q.x, q.y);
          if (!clearOfEstate(land, p, size * 0.8) || roadDistance(land, p) < size / 2 + 6) continue;
          const lot = { u: q.x - size / 2, v: q.y - size / 2, w: size, h: size };
          land.lots.push(lot);
          placed++;
          inFrame(g, frame, () => {
            g.fillStyle = farm ? '#a8ab82' : '#a6b58a';
            g.fillRect(lot.u, lot.v, size, size);
            g.strokeStyle = 'rgba(66, 86, 46, 0.4)';
            g.lineWidth = 1;
            g.strokeRect(lot.u, lot.v, size, size);
            strokeLine(g, [entry, q], farm ? 4 : 2.5, '#c5bb9b', false);
            building(g, q.x - 6, q.y - 9, 12, 9, pick(rng, roofs), 4);
            if (farm) building(g, q.x - 11, q.y + 4, 22, 9, '#92968b', 5);
            else tree(g, rng, q.x + 7, q.y + 6, 3, ['#507744', '#62844c']);
          });
        }
      }
    }
  }
}
