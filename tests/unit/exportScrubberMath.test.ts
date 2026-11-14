import { describe, expect, it } from 'vitest';
import {
  applyScrubberHandleChange,
  computeMinScrubberSpanSec,
  computeScrubberVisualState,
  formatScrubberSecondsInput,
  pickNearestScrubberHandle,
  quantizeScrubberSec,
} from '../../src/core/exportScrubberMath';

describe('exportScrubberMath', () => {
  it('quantizes and clamps scrubber seconds without floating-point noise', () => {
    expect(quantizeScrubberSec(1.24, 72, 0.1)).toBe(1.2);
    expect(quantizeScrubberSec(1.26, 72, 0.1)).toBe(1.3);
    expect(quantizeScrubberSec(-3, 72, 0.1)).toBe(0);
    expect(quantizeScrubberSec(99, 72, 0.1)).toBe(72);
    expect(formatScrubberSecondsInput(2.5)).toBe('2.5');
    expect(formatScrubberSecondsInput(6.0)).toBe('6');
  });

  it('computes safe visual percentages even when inputs are NaN or inverted', () => {
    const normal = computeScrubberVisualState(10, 30, 80);
    expect(normal.isInverted).toBe(false);
    expect(normal.rangeLeftPct).toBeCloseTo(12.5, 6);
    expect(normal.rangeWidthPct).toBeCloseTo(25, 6);

    const inverted = computeScrubberVisualState(40, 20, 80);
    expect(inverted.isInverted).toBe(true);
    expect(inverted.rangeLeftPct).toBeCloseTo(25, 6);
    expect(inverted.rangeWidthPct).toBeCloseTo(25, 6);

    const empty = computeScrubberVisualState(Number.NaN, Number.NaN, 80);
    expect(empty.safeStartSec).toBe(0);
    expect(empty.safeEndSec).toBe(80);
    expect(empty.rangeLeftPct).toBe(0);
    expect(empty.rangeWidthPct).toBe(100);
  });

  it('picks the nearest start or end handle from track pointer position', () => {
    expect(pickNearestScrubberHandle(5, 10, 30, 72)).toBe('start');
    expect(pickNearestScrubberHandle(18, 10, 30, 72)).toBe('start');
    expect(pickNearestScrubberHandle(22, 10, 30, 72)).toBe('end');
    expect(pickNearestScrubberHandle(45, 10, 30, 72)).toBe('end');
    expect(pickNearestScrubberHandle(8, 10, 10, 72)).toBe('start');
    expect(pickNearestScrubberHandle(12, 10, 10, 72)).toBe('end');
  });

  it('enforces minimum frame separation when dragging start or end handles', () => {
    const minSpan60 = computeMinScrubberSpanSec(60);
    expect(minSpan60).toBe(0.02);
    const minSpan24 = computeMinScrubberSpanSec(24);
    expect(minSpan24).toBe(0.05);

    const clampedStart = applyScrubberHandleChange('start', 15, 2, 10, 72, minSpan60, 0.1);
    expect(clampedStart.startSec).toBe(9.98);
    expect(clampedStart.endSec).toBe(10);

    const clampedEnd = applyScrubberHandleChange('end', 1, 5, 10, 72, minSpan60, 0.1);
    expect(clampedEnd.startSec).toBe(5);
    expect(clampedEnd.endSec).toBe(5.02);
  });
});
