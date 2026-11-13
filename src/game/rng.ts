export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weightOf: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
