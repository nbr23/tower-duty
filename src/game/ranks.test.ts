import { describe, expect, it } from 'vitest';
import { pointsToNextRank, RANK_NAMES, RANK_THRESHOLDS, rankFor, rankName, rankProgress } from './ranks';

describe('ranks', () => {
  it('has one name per threshold, with strictly growing gaps', () => {
    expect(RANK_THRESHOLDS).toHaveLength(RANK_NAMES.length);
    expect(RANK_THRESHOLDS[0]).toBe(0);
    const gaps = RANK_THRESHOLDS.slice(1).map((t, i) => t - (RANK_THRESHOLDS[i] ?? 0));
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeGreaterThan(gaps[i] ?? 0));
  });

  it.each([
    [0, 0],
    [14, 0],
    [15, 1],
    [714, 13],
    [715, 14],
    [9999, 14],
  ])('ranks a score of %i as %i', (score, rank) => {
    expect(rankFor(score)).toBe(rank);
  });

  it('reports the distance and progress to the next rank', () => {
    expect(pointsToNextRank(20)).toBe(15);
    expect(rankProgress(25)).toBe(0.5);
    expect(rankName(rankFor(20) + 1)).toBe('Student Pilot');
  });

  it('stops at the top rank', () => {
    expect(pointsToNextRank(800)).toBeNull();
    expect(rankProgress(800)).toBeNull();
  });
});
