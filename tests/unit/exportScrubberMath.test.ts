import { describe, expect, it } from 'vitest';
import { validateCustomExportRange } from '../../src/core/exportMath';
import {
  applyScrubberHandleChange,
  computeMinScrubberSpanSec,
  computeScrubberVisualState,
  formatScrubberSecondsInput,
  parseScrubberSecondsInput,
  pickNearestScrubberHandle,
  quantizeScrubberSec,
} from '../../src/core/exportScrubberMath';

describe('exportScrubberMath', () => {
  it('quantizes and clamps scrubber seconds without floating-point noise or 3-decimal overflow', () => {
    expect(quantizeScrubberSec(1.24, 72, 0.1)).toBe(1.2);
    expect(quantizeScrubberSec(1.26, 72, 0.1)).toBe(1.3);
    expect(quantizeScrubberSec(-3, 72, 0.1)).toBe(0);
    expect(quantizeScrubberSec(99, 72, 0.1)).toBe(72);

    // 3-decimal bundled study durations (afraid.yaml = 45.375, vector_field.yaml = 61.625)
    expect(quantizeScrubberSec(45.375, 45.375, 0.1)).toBe(45.375);
    expect(quantizeScrubberSec(45.375, 45.375, 0.01)).toBe(45.375);
    expect(quantizeScrubberSec(45.375, 45.375, 0.001)).toBe(45.375);
    expect(quantizeScrubberSec(99, 45.375, 0.1)).toBe(45.375);

    expect(quantizeScrubberSec(61.625, 61.625, 0.1)).toBe(61.6);
    expect(quantizeScrubberSec(61.66, 61.625, 0.1)).toBe(61.625);
    expect(quantizeScrubberSec(61.625, 61.625, 0.01)).toBe(61.625);
    expect(quantizeScrubberSec(61.625, 61.625, 0.001)).toBe(61.625);
    expect(quantizeScrubberSec(99, 61.625, 0.1)).toBe(61.625);

    expect(formatScrubberSecondsInput(2.5)).toBe('2.5');
    expect(formatScrubberSecondsInput(6.0)).toBe('6');
    expect(formatScrubberSecondsInput(45.375)).toBe('45.375');
    expect(formatScrubberSecondsInput(61.625)).toBe('61.625');
    expect(formatScrubberSecondsInput(-2)).toBe('0');
    expect(formatScrubberSecondsInput(Number.NaN)).toBe('0');
  });

  it('parses scrubber seconds inputs safely and rejects empty or non-finite values', () => {
    expect(parseScrubberSecondsInput(' 61.625 ')).toBe(61.625);
    expect(parseScrubberSecondsInput('2.5')).toBe(2.5);
    expect(parseScrubberSecondsInput('0')).toBe(0);
    expect(parseScrubberSecondsInput('')).toBeNaN();
    expect(parseScrubberSecondsInput('   ')).toBeNaN();
    expect(parseScrubberSecondsInput('abc')).toBeNaN();
    expect(parseScrubberSecondsInput('Infinity')).toBeNaN();
    expect(parseScrubberSecondsInput('-Infinity')).toBeNaN();
    expect(parseScrubberSecondsInput('NaN')).toBeNaN();
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

  it('keeps 3-decimal durations (45.375s and 61.625s) valid when dragging to the right edge', () => {
    for (const duration of [45.375, 61.625]) {
      for (const fps of [24, 60] as const) {
        const minSpan = computeMinScrubberSpanSec(fps);
        for (const step of [0.1, 0.01, 0.001]) {
          const dragToEdge = applyScrubberHandleChange(
            'end',
            duration,
            0,
            duration - 5,
            duration,
            minSpan,
            step
          );
          expect(dragToEdge.endSec).toBeLessThanOrEqual(duration);
          expect(
            validateCustomExportRange(dragToEdge.startSec, dragToEdge.endSec, duration, fps)
              .isValid
          ).toBe(true);

          const dragPastEdge = applyScrubberHandleChange(
            'end',
            duration + 2,
            0,
            duration - 5,
            duration,
            minSpan,
            step
          );
          expect(dragPastEdge.endSec).toBe(duration);
          expect(formatScrubberSecondsInput(dragPastEdge.endSec)).toBe(
            String(duration)
          );
          expect(
            validateCustomExportRange(
              dragPastEdge.startSec,
              dragPastEdge.endSec,
              duration,
              fps
            ).isValid
          ).toBe(true);

          const dragStartNearEdge = applyScrubberHandleChange(
            'start',
            duration,
            0,
            duration,
            duration,
            minSpan,
            step
          );
          expect(dragStartNearEdge.endSec).toBe(duration);
          expect(dragStartNearEdge.startSec).toBeLessThanOrEqual(
            duration - minSpan + 1e-9
          );
          expect(
            validateCustomExportRange(
              dragStartNearEdge.startSec,
              dragStartNearEdge.endSec,
              duration,
              fps
            ).isValid
          ).toBe(true);
        }
      }
    }

    // Even when duration has >3 decimals that would round up at .toFixed(3), never exceed duration
    const subMilli = applyScrubberHandleChange('end', 12, 0, 5, 10.1236, 0.02, 0.1);
    expect(subMilli.endSec).toBeLessThanOrEqual(10.1236);
    expect(
      validateCustomExportRange(subMilli.startSec, subMilli.endSec, 10.1236, 60).isValid
    ).toBe(true);
  });
});
