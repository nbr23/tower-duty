import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { fitViewport, type Insets } from './viewport';

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('fitViewport', () => {
  it('fits a matching aspect ratio exactly', () => {
    const fit = fitViewport({ width: WORLD_WIDTH * 2, height: WORLD_HEIGHT * 2, insets: NONE, overscan: 1 });
    expect(fit).toEqual({ scale: 2, offsetX: 0, offsetY: 0 });
  });

  it('overscans a wide screen by cropping top and bottom evenly', () => {
    const fit = fitViewport({ width: 1200, height: WORLD_HEIGHT, insets: NONE, overscan: 1.06 });
    expect(fit.scale).toBeCloseTo(1.06);
    expect(fit.offsetY).toBeCloseTo((-WORLD_HEIGHT * 0.06) / 2);
    expect(fit.offsetX).toBeCloseTo((1200 - WORLD_WIDTH * 1.06) / 2);
  });

  it('never overscans past the safe width', () => {
    const fit = fitViewport({ width: 400, height: 800, insets: NONE, overscan: 1.06 });
    expect(fit.scale).toBeCloseTo(400 / WORLD_WIDTH);
    expect(fit.offsetX).toBeCloseTo(0);
    expect(fit.offsetY).toBeCloseTo((800 - WORLD_HEIGHT * fit.scale) / 2);
  });

  it('keeps side margins equal when only one side has an inset', () => {
    const width = 1200;
    const fit = fitViewport({ width, height: WORLD_HEIGHT, insets: { ...NONE, left: 40 }, overscan: 1 });
    expect(fit.offsetX).toBeCloseTo(width - (fit.offsetX + WORLD_WIDTH * fit.scale));
  });

  it('keeps the world out of an inset wider than the margin', () => {
    const width = WORLD_WIDTH + 60;
    const fit = fitViewport({ width, height: WORLD_HEIGHT, insets: { ...NONE, left: 50 }, overscan: 1 });
    expect(fit.scale).toBeCloseTo(1);
    expect(fit.offsetX).toBeCloseTo(50);
  });
});
