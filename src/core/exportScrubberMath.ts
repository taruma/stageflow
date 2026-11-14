/**
 * Pure deterministic geometry and interaction math for the dual-handle
 * export time-range scrubber. Zero React, DOM, or Three.js dependencies.
 */

import type { ExportFps } from './exportMath';

export type ScrubberHandle = 'start' | 'end';

export interface ScrubberVisualState {
  safeDuration: number;
  safeStartSec: number;
  safeEndSec: number;
  isInverted: boolean;
  rangeLeftPct: number;
  rangeWidthPct: number;
  startThumbPct: number;
  endThumbPct: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Quantizes a timestamp in seconds to the nearest step increment and clamps it
 * cleanly within `[0, sceneDurationSec]` without floating-point drift.
 */
export function quantizeScrubberSec(
  rawSec: number,
  sceneDurationSec: number,
  stepSec = 0.1
): number {
  const safeDuration =
    Number.isFinite(sceneDurationSec) && sceneDurationSec > 0
      ? sceneDurationSec
      : 0.1;
  const safeStep = Number.isFinite(stepSec) && stepSec > 0 ? stepSec : 0.1;
  const safeRaw = Number.isFinite(rawSec) ? rawSec : 0;
  const snapped = Math.round(safeRaw / safeStep) * safeStep;
  const clamped = clamp(snapped, 0, safeDuration);
  return Number(clamped.toFixed(2));
}

/**
 * Formats a seconds number concisely for string input state (e.g. `2.5`, `6`).
 */
export function formatScrubberSecondsInput(sec: number): string {
  if (!Number.isFinite(sec)) return '0';
  return String(Number(Math.max(0, sec).toFixed(2)));
}

/**
 * Returns the minimum drag separation in seconds (quantized to 0.01s) that
 * always satisfies `validateCustomExportRange`'s `1 / fps` frame minimum.
 */
export function computeMinScrubberSpanSec(fps: ExportFps): number {
  return Math.max(0.02, Math.ceil((1 / fps) * 100) / 100);
}

/**
 * Computes safe clamped percentages (`0..100`) for rendering the scrubber track,
 * active window bar, and start/end handles even while text inputs are empty or
 * temporarily inverted.
 */
export function computeScrubberVisualState(
  startSec: number,
  endSec: number,
  sceneDurationSec: number
): ScrubberVisualState {
  const safeDuration =
    Number.isFinite(sceneDurationSec) && sceneDurationSec > 0
      ? sceneDurationSec
      : 0.1;
  const safeStartSec = Number.isFinite(startSec)
    ? clamp(startSec, 0, safeDuration)
    : 0;
  const safeEndSec = Number.isFinite(endSec)
    ? clamp(endSec, 0, safeDuration)
    : safeDuration;
  const isInverted = safeStartSec > safeEndSec;

  const minSec = Math.min(safeStartSec, safeEndSec);
  const maxSec = Math.max(safeStartSec, safeEndSec);

  return {
    safeDuration,
    safeStartSec,
    safeEndSec,
    isInverted,
    rangeLeftPct: (minSec / safeDuration) * 100,
    rangeWidthPct: ((maxSec - minSec) / safeDuration) * 100,
    startThumbPct: (safeStartSec / safeDuration) * 100,
    endThumbPct: (safeEndSec / safeDuration) * 100,
  };
}

/**
 * Picks the closer handle (`start` or `end`) when pressing on the scrubber track.
 */
export function pickNearestScrubberHandle(
  pointerSec: number,
  startSec: number,
  endSec: number,
  sceneDurationSec: number
): ScrubberHandle {
  const { safeStartSec, safeEndSec } = computeScrubberVisualState(
    startSec,
    endSec,
    sceneDurationSec
  );
  if (safeStartSec === safeEndSec) {
    return pointerSec <= safeStartSec ? 'start' : 'end';
  }
  return Math.abs(pointerSec - safeStartSec) <= Math.abs(pointerSec - safeEndSec)
    ? 'start'
    : 'end';
}

/**
 * Applies a drag or keyboard nudge to the `start` or `end` handle while
 * preserving at least `minSpanSec` between `start` and `end`.
 */
export function applyScrubberHandleChange(
  handle: ScrubberHandle,
  targetSec: number,
  currentStartSec: number,
  currentEndSec: number,
  sceneDurationSec: number,
  minSpanSec: number,
  stepSec = 0.1
): { startSec: number; endSec: number } {
  const safeDuration =
    Number.isFinite(sceneDurationSec) && sceneDurationSec > 0
      ? sceneDurationSec
      : 0.1;
  const effectiveMinSpan = Math.min(safeDuration, Math.max(0.01, minSpanSec));

  let baseStart = Number.isFinite(currentStartSec)
    ? clamp(currentStartSec, 0, safeDuration)
    : 0;
  let baseEnd = Number.isFinite(currentEndSec)
    ? clamp(currentEndSec, 0, safeDuration)
    : safeDuration;

  if (baseStart > baseEnd) {
    if (handle === 'start') {
      baseEnd = Math.max(effectiveMinSpan, baseEnd);
    } else {
      baseStart = Math.min(safeDuration - effectiveMinSpan, baseStart);
    }
  }

  if (handle === 'start') {
    const maxStart = Math.max(0, baseEnd - effectiveMinSpan);
    const quantized = quantizeScrubberSec(targetSec, safeDuration, stepSec);
    const nextStart = Number(clamp(quantized, 0, maxStart).toFixed(2));
    return {
      startSec: nextStart,
      endSec: Number(Math.max(nextStart + effectiveMinSpan, baseEnd).toFixed(2)),
    };
  }

  const minEnd = Math.min(safeDuration, baseStart + effectiveMinSpan);
  const quantized = quantizeScrubberSec(targetSec, safeDuration, stepSec);
  const nextEnd = Number(clamp(quantized, minEnd, safeDuration).toFixed(2));
  return {
    startSec: Number(Math.min(baseStart, nextEnd - effectiveMinSpan).toFixed(2)),
    endSec: nextEnd,
  };
}
