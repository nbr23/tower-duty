export const RANK_NAMES = [
  'Amateur',
  'Trainee',
  'Wannabe Pilot',
  'CoPilot',
  'Pilot',
  'Captain',
  'Flight Manager',
  'Flight Director',
  'Air Traffic Lieutenant',
  'Air Traffic Controller',
] as const;

export const RANK_PERCENTILES = [25, 50, 60, 70, 80, 90, 95, 98, 99] as const;

const MEADOW = [0, 63, 102, 120, 144, 179, 245, 324, 469, 608];
const FLEET = [0, 44, 84, 100, 117, 140, 180, 223, 290, 355];
const AIRSHOW = [0, 26, 57, 75, 94, 126, 187, 261, 391, 501];
const CANYON = [0, 52, 102, 128, 159, 198, 261, 341, 469, 574];

export const RANK_THRESHOLDS: Readonly<Record<string, readonly number[]>> = {
  'meadow': MEADOW,
  'lakeside': MEADOW,
  'fleet': FLEET,
  'airshow': AIRSHOW,
  'canyon': CANYON,
  'coast': [0, 50, 100, 114, 130, 151, 190, 227, 286, 348],
  'arctic-outpost': CANYON,
  'volcano-island': MEADOW,
  'city-lights': MEADOW,
  'moon-base': AIRSHOW,
  'altiport': MEADOW,
};

export function thresholdsFor(mapId: string): readonly number[] {
  const thresholds = RANK_THRESHOLDS[mapId];
  if (thresholds === undefined) throw new Error(`no rank thresholds for ${mapId}`);
  return thresholds;
}

export function rankFor(mapId: string, score: number): number {
  const thresholds = thresholdsFor(mapId);
  let rank = 0;
  thresholds.forEach((t, i) => {
    if (score >= t) rank = i;
  });
  return rank;
}

export function rankName(rank: number): string {
  return RANK_NAMES[rank] ?? RANK_NAMES[0];
}

export function percentileFor(rank: number): number | null {
  return RANK_PERCENTILES[rank - 1] ?? null;
}

export function pointsToNextRank(mapId: string, score: number): number | null {
  const next = thresholdsFor(mapId)[rankFor(mapId, score) + 1];
  return next === undefined ? null : next - score;
}

export function rankProgress(mapId: string, score: number): number | null {
  const thresholds = thresholdsFor(mapId);
  const rank = rankFor(mapId, score);
  const next = thresholds[rank + 1];
  if (next === undefined) return null;
  const base = thresholds[rank] ?? 0;
  return (score - base) / (next - base);
}
