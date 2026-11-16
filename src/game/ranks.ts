export const RANK_NAMES = [
  'Amateur',
  'Trainee',
  'Student Pilot',
  'Wannabe Pilot',
  'CoPilot',
  'Pilot',
  'Senior Pilot',
  'Captain',
  'Senior Captain',
  'Flight Manager',
  'Flight Director',
  'Air Traffic Lieutenant',
  'Air Traffic Controller',
  'Tower Chief',
  'Tower Legend',
] as const;

export const RANK_THRESHOLDS: readonly number[] = [0, 15, 35, 60, 90, 125, 165, 210, 260, 315, 375, 445, 525, 615, 715];

export function rankFor(score: number): number {
  let rank = 0;
  RANK_THRESHOLDS.forEach((t, i) => {
    if (score >= t) rank = i;
  });
  return rank;
}

export function rankName(rank: number): string {
  return RANK_NAMES[rank] ?? RANK_NAMES[0];
}

export function pointsToNextRank(score: number): number | null {
  const next = RANK_THRESHOLDS[rankFor(score) + 1];
  return next === undefined ? null : next - score;
}

export function rankProgress(score: number): number | null {
  const rank = rankFor(score);
  const next = RANK_THRESHOLDS[rank + 1];
  if (next === undefined) return null;
  const base = RANK_THRESHOLDS[rank] ?? 0;
  return (score - base) / (next - base);
}
