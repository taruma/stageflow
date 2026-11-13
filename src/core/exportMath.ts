/**
 * Pure deterministic math and formatting helpers for in-browser clean film gate
 * MP4 video export. Zero React, DOM, or Three.js runtime dependencies.
 */

import { DEFAULT_ASPECT_RATIO } from './constants';
import type { ShotCue, StageScore } from './types';

export type ExportResolutionTier = 720 | 1080;
export type ExportFps = 24 | 60;
export type ExportRangeMode = 'scene' | 'shot';
export type ExportTargetCamera = 'stage-cam' | 'observer';
export type ExportObserverAngleMode = 'scripted' | 'current-viewport';

export interface ExportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ExportTimeRange {
  startSec: number;
  endSec: number;
  durationSec: number;
  totalFrames: number;
  shotId: string | null;
  shotLabel: string | null;
}

const WIDE_16_9_THRESHOLD = 16 / 9 - 1e-4;

/**
 * Resolves the effective export aspect ratio.
 * Observer Diorama exports always lock to 16:9 regardless of score film gate ratio.
 */
export function resolveExportAspectRatio(
  scoreAspectRatio: number,
  targetCamera: ExportTargetCamera = 'stage-cam'
): number {
  if (targetCamera === 'observer') {
    return DEFAULT_ASPECT_RATIO;
  }
  return Number.isFinite(scoreAspectRatio) && scoreAspectRatio > 0.1
    ? scoreAspectRatio
    : DEFAULT_ASPECT_RATIO;
}

/**
 * Rounds a positive number to the nearest even integer >= 2 for H.264 compliance.
 */
export function roundToEven(value: number): number {
  if (!Number.isFinite(value) || value <= 2) {
    return 2;
  }
  const rounded = Math.round(value / 2) * 2;
  return Math.max(2, rounded);
}

/**
 * Computes H.264-compliant even pixel dimensions (width % 2 === 0, height % 2 === 0)
 * from a resolution tier (720p or 1080p) and score aspect ratio.
 *
 * - Wide ratios (>= 16:9, e.g. 16:9, 1.85:1, 2.39:1): anchors width to 1920/1280.
 * - Standard horizontal ratios (1.0 <= r < 16:9, e.g. 4:3): anchors height to 1080/720.
 * - Vertical ratios (r < 1.0, e.g. 9:16): anchors width to 1080/720.
 */
export function computeExportDimensions(
  tier: ExportResolutionTier,
  aspectRatio: number
): ExportDimensions {
  const safeAspect =
    Number.isFinite(aspectRatio) && aspectRatio > 0.1
      ? aspectRatio
      : DEFAULT_ASPECT_RATIO;

  let width: number;
  let height: number;

  if (safeAspect >= WIDE_16_9_THRESHOLD) {
    width = roundToEven((tier * 16) / 9);
    height = roundToEven(width / safeAspect);
  } else if (safeAspect >= 1.0) {
    height = roundToEven(tier);
    width = roundToEven(height * safeAspect);
  } else {
    width = roundToEven(tier);
    height = roundToEven(width / safeAspect);
  }

  return {
    width,
    height,
    aspectRatio: width / height,
  };
}

/**
 * Computes an appropriate H.264 target bitrate (bits/sec) scaled by pixel area and fps.
 * Targets ~12 Mbps for 1080p60, ~8 Mbps for 1080p24, ~6 Mbps for 720p60.
 */
export function computeExportBitrate(
  width: number,
  height: number,
  fps: ExportFps
): number {
  const pixelArea = Math.max(1, width * height);
  const referenceArea = 1920 * 1080;
  const areaScale = pixelArea / referenceArea;
  const baseMbps = fps === 60 ? 12_000_000 : 8_000_000;
  const scaled = Math.round(baseMbps * areaScale);
  return Math.max(2_500_000, Math.min(20_000_000, scaled));
}

/**
 * Computes the export time window and deterministic frame count for either
 * the entire scene or the currently active shot.
 */
export function computeExportTimeRange(
  score: StageScore,
  rangeMode: ExportRangeMode,
  fps: ExportFps,
  activeShot?: ShotCue | null
): ExportTimeRange {
  const sceneDuration = Math.max(0.1, score.durationSec);
  const useShot =
    rangeMode === 'shot' &&
    activeShot != null &&
    activeShot.endSec > activeShot.startSec;

  const startSec = useShot ? Math.max(0, activeShot.startSec) : 0;
  const endSec = useShot
    ? Math.min(sceneDuration, activeShot.endSec)
    : sceneDuration;
  const durationSec = Math.max(1 / fps, endSec - startSec);
  const totalFrames = Math.max(1, Math.round(durationSec * fps));

  return {
    startSec,
    endSec,
    durationSec,
    totalFrames,
    shotId: useShot ? activeShot.id : null,
    shotLabel: useShot ? activeShot.label : null,
  };
}

/**
 * Evaluates the deterministic timestamp in seconds for frame index `i`
 * clamped safely within `[startSec, endSec]`.
 */
export function computeExportFrameTimestampSec(
  startSec: number,
  endSec: number,
  frameIndex: number,
  fps: ExportFps
): number {
  const raw = startSec + frameIndex / fps;
  return Math.min(endSec, Math.max(startSec, raw));
}

/**
 * Sanitizes a score identifier or title into a lowercase filesystem-safe slug.
 */
export function sanitizeExportSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'stageflow_scene';
}

/**
 * Formats the output MP4 filename:
 * `<slug>[_<shot-id>]_<stage_cam|observer>_<tier>p_<fps>fps.mp4`
 */
export function formatExportMp4Filename(
  scoreIdOrTitle: string,
  tier: ExportResolutionTier,
  fps: ExportFps,
  shotId?: string | null,
  targetCamera: ExportTargetCamera = 'stage-cam'
): string {
  const baseSlug = sanitizeExportSlug(scoreIdOrTitle);
  const shotSuffix = shotId ? `_${sanitizeExportSlug(shotId)}` : '';
  const cameraTag = targetCamera === 'observer' ? 'observer' : 'stage_cam';
  return `${baseSlug}${shotSuffix}_${cameraTag}_${tier}p_${fps}fps.mp4`;
}
