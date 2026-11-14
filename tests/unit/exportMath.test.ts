import { describe, expect, it } from 'vitest';
import {
  computeExportBitrate,
  computeExportDimensions,
  computeExportFrameTimestampSec,
  computeExportTimeRange,
  formatExportMp4Filename,
  formatExportTimeRangeTag,
  resolveExportAspectRatio,
  roundToEven,
  sanitizeExportSlug,
  validateCustomExportRange,
} from '../../src/core/exportMath';
import { DEFAULT_ASPECT_RATIO } from '../../src/core/constants';
import { parseAspectRatio } from '../../src/core/opticsMath';
import type { ShotCue, StageScore } from '../../src/core/types';

describe('exportMath', () => {
  it('rounds values to positive even integers >= 2', () => {
    expect(roundToEven(803.347)).toBe(804);
    expect(roundToEven(1037.837)).toBe(1038);
    expect(roundToEven(0)).toBe(2);
    expect(roundToEven(-10)).toBe(2);
    expect(roundToEven(Number.NaN)).toBe(2);
  });

  it('matches all GH Issue #4 aspect ratio targets at 1080p and 720p with even bounds', () => {
    const cases: Array<{
      ratioRaw: string;
      tier: 1080 | 720;
      expectedW: number;
      expectedH: number;
    }> = [
      { ratioRaw: '16:9', tier: 1080, expectedW: 1920, expectedH: 1080 },
      { ratioRaw: '16:9', tier: 720, expectedW: 1280, expectedH: 720 },
      { ratioRaw: '2.39:1', tier: 1080, expectedW: 1920, expectedH: 804 },
      { ratioRaw: '2.39:1', tier: 720, expectedW: 1280, expectedH: 536 },
      { ratioRaw: '1.85:1', tier: 1080, expectedW: 1920, expectedH: 1038 },
      { ratioRaw: '1.85:1', tier: 720, expectedW: 1280, expectedH: 692 },
      { ratioRaw: '4:3', tier: 1080, expectedW: 1440, expectedH: 1080 },
      { ratioRaw: '4:3', tier: 720, expectedW: 960, expectedH: 720 },
      { ratioRaw: '9:16', tier: 1080, expectedW: 1080, expectedH: 1920 },
      { ratioRaw: '9:16', tier: 720, expectedW: 720, expectedH: 1280 },
    ];

    for (const c of cases) {
      const ratio = parseAspectRatio(c.ratioRaw);
      const dims = computeExportDimensions(c.tier, ratio);
      expect(dims.width).toBe(c.expectedW);
      expect(dims.height).toBe(c.expectedH);
      expect(dims.width % 2).toBe(0);
      expect(dims.height % 2).toBe(0);
    }
  });

  it('always produces even dimensions for arbitrary custom aspect ratios', () => {
    for (const ratio of [0.45, 0.75, 1.0, 1.5, 2.0, 2.76]) {
      for (const tier of [720, 1080] as const) {
        const dims = computeExportDimensions(tier, ratio);
        expect(dims.width % 2).toBe(0);
        expect(dims.height % 2).toBe(0);
        expect(dims.width).toBeGreaterThanOrEqual(2);
        expect(dims.height).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('scales target H.264 bitrate by pixel area and fps within bounds', () => {
    expect(computeExportBitrate(1920, 1080, 60)).toBe(12_000_000);
    expect(computeExportBitrate(1920, 1080, 24)).toBe(8_000_000);
    expect(computeExportBitrate(1280, 720, 60)).toBeGreaterThanOrEqual(5_000_000);
    expect(computeExportBitrate(640, 360, 24)).toBe(2_500_000);
  });

  it('computes deterministic scene and shot time ranges and frame timestamps', () => {
    const mockShot = {
      id: 'shot-2-push',
      label: 'Shot 02 · Push In',
      startSec: 2.5,
      endSec: 6.5,
    } as ShotCue;
    const mockScore = {
      durationSec: 12.0,
    } as StageScore;

    const sceneRange = computeExportTimeRange(mockScore, 'scene', 60, mockShot);
    expect(sceneRange.startSec).toBe(0);
    expect(sceneRange.endSec).toBe(12.0);
    expect(sceneRange.totalFrames).toBe(720);
    expect(sceneRange.shotId).toBeNull();

    const shotRange = computeExportTimeRange(mockScore, 'shot', 24, mockShot);
    expect(shotRange.startSec).toBe(2.5);
    expect(shotRange.endSec).toBe(6.5);
    expect(shotRange.durationSec).toBe(4.0);
    expect(shotRange.totalFrames).toBe(96);
    expect(shotRange.shotId).toBe('shot-2-push');

    expect(computeExportFrameTimestampSec(2.5, 6.5, 0, 24)).toBe(2.5);
    expect(computeExportFrameTimestampSec(2.5, 6.5, 24, 24)).toBe(3.5);
    expect(computeExportFrameTimestampSec(2.5, 6.5, 999, 24)).toBe(6.5);
  });

  it('sanitizes slugs and formats clean MP4 filenames', () => {
    expect(sanitizeExportSlug('Vector Field: Study #1!')).toBe('vector_field_study_1');
    expect(sanitizeExportSlug('   ')).toBe('stageflow_scene');

    expect(formatExportMp4Filename('Vector Field', 1080, 60)).toBe(
      'vector_field_stage_cam_1080p_60fps.mp4'
    );
    expect(formatExportMp4Filename('Vector Field', 720, 24, 'shot-2-push')).toBe(
      'vector_field_shot_2_push_stage_cam_720p_24fps.mp4'
    );
    expect(
      formatExportMp4Filename('Vector Field', 1080, 60, null, 'observer')
    ).toBe('vector_field_observer_1080p_60fps.mp4');
    expect(
      formatExportMp4Filename('Vector Field', 720, 24, 'shot-2-push', 'observer')
    ).toBe('vector_field_shot_2_push_observer_720p_24fps.mp4');
  });

  it('locks Observer Diorama exports to 16:9 regardless of score film gate aspect ratio', () => {
    for (const ratioRaw of ['2.39:1', '9:16', '4:3', '16:9']) {
      const scoreRatio = parseAspectRatio(ratioRaw);
      const effectiveRatio = resolveExportAspectRatio(scoreRatio, 'observer');
      expect(effectiveRatio).toBeCloseTo(DEFAULT_ASPECT_RATIO, 6);

      const dims1080 = computeExportDimensions(1080, effectiveRatio);
      expect(dims1080.width).toBe(1920);
      expect(dims1080.height).toBe(1080);

      const dims720 = computeExportDimensions(720, effectiveRatio);
      expect(dims720.width).toBe(1280);
      expect(dims720.height).toBe(720);
    }

    expect(resolveExportAspectRatio(2.39, 'stage-cam')).toBeCloseTo(2.39, 6);
  });

  it('validates custom export time ranges for decimals, bounds, inversions, and minimum 1-frame duration', () => {
    const validDecimal = validateCustomExportRange(2.5, 6.0, 12.0, 60);
    expect(validDecimal).toEqual({
      isValid: true,
      error: null,
      startSec: 2.5,
      endSec: 6.0,
    });

    const exactSingleFrame60 = validateCustomExportRange(
      1.0,
      1.0 + 1 / 60,
      12.0,
      60
    );
    expect(exactSingleFrame60.isValid).toBe(true);
    expect(exactSingleFrame60.error).toBeNull();

    const exactSingleFrame24 = validateCustomExportRange(
      1.0,
      1.0 + 1 / 24,
      12.0,
      24
    );
    expect(exactSingleFrame24.isValid).toBe(true);

    const floatEpsilonBound = validateCustomExportRange(0, 12.0 + 1e-7, 12.0, 60);
    expect(floatEpsilonBound).toEqual({
      isValid: true,
      error: null,
      startSec: 0,
      endSec: 12.0,
    });

    for (const [start, end] of [
      [Number.NaN, 5],
      [1, Number.NaN],
      [Number.POSITIVE_INFINITY, 5],
      [1, Number.NEGATIVE_INFINITY],
    ]) {
      const res = validateCustomExportRange(start, end, 12.0, 60);
      expect(res.isValid).toBe(false);
      expect(res.error).toBeTruthy();
    }

    const negativeStart = validateCustomExportRange(-0.1, 5.0, 12.0, 60);
    expect(negativeStart.isValid).toBe(false);
    expect(negativeStart.error).toContain('negative');

    const exceedsDuration = validateCustomExportRange(2.0, 12.01, 12.0, 60);
    expect(exceedsDuration.isValid).toBe(false);
    expect(exceedsDuration.error).toContain('12s');

    const inverted = validateCustomExportRange(6.0, 2.5, 12.0, 60);
    expect(inverted.isValid).toBe(false);
    expect(inverted.error).toBeTruthy();

    const empty = validateCustomExportRange(4.0, 4.0, 12.0, 60);
    expect(empty.isValid).toBe(false);
    expect(empty.error).toBeTruthy();

    const subFrame60 = validateCustomExportRange(2.5, 2.51, 12.0, 60);
    expect(subFrame60.isValid).toBe(false);
    expect(subFrame60.error).toContain('1 frame');

    const subFrame24 = validateCustomExportRange(2.5, 2.54, 12.0, 24);
    expect(subFrame24.isValid).toBe(false);
    expect(subFrame24.error).toContain('24fps');
  });

  it('computes custom export time ranges with clamping and safe fallback while preserving scene/shot modes', () => {
    const mockShot = {
      id: 'shot-2-push',
      label: 'Shot 02 · Push In',
      startSec: 2.5,
      endSec: 6.5,
    } as ShotCue;
    const mockScore = {
      durationSec: 12.0,
    } as StageScore;

    const customRange = computeExportTimeRange(
      mockScore,
      'custom',
      60,
      mockShot,
      { startSec: 2.5, endSec: 6.0 }
    );
    expect(customRange).toEqual({
      startSec: 2.5,
      endSec: 6.0,
      durationSec: 3.5,
      totalFrames: 210,
      shotId: null,
      shotLabel: null,
    });

    const clampedOutOfBounds = computeExportTimeRange(
      mockScore,
      'custom',
      24,
      mockShot,
      { startSec: -3.0, endSec: 25.0 }
    );
    expect(clampedOutOfBounds).toEqual({
      startSec: 0,
      endSec: 12.0,
      durationSec: 12.0,
      totalFrames: 288,
      shotId: null,
      shotLabel: null,
    });

    const clampedInverted = computeExportTimeRange(
      mockScore,
      'custom',
      60,
      mockShot,
      { startSec: 8.0, endSec: 4.0 }
    );
    expect(clampedInverted.startSec).toBe(8.0);
    expect(clampedInverted.endSec).toBe(8.0);
    expect(clampedInverted.durationSec).toBeCloseTo(1 / 60, 8);
    expect(clampedInverted.totalFrames).toBe(1);
    expect(clampedInverted.shotId).toBeNull();
    expect(clampedInverted.shotLabel).toBeNull();

    const missingCustomFallback = computeExportTimeRange(
      mockScore,
      'custom',
      60,
      mockShot,
      null
    );
    expect(missingCustomFallback).toEqual({
      startSec: 0,
      endSec: 12.0,
      durationSec: 12.0,
      totalFrames: 720,
      shotId: null,
      shotLabel: null,
    });

    // Scene and shot modes ignore customRange and preserve exact behavior
    const sceneWithCustomArg = computeExportTimeRange(
      mockScore,
      'scene',
      60,
      mockShot,
      { startSec: 2.5, endSec: 6.0 }
    );
    expect(sceneWithCustomArg.startSec).toBe(0);
    expect(sceneWithCustomArg.endSec).toBe(12.0);
    expect(sceneWithCustomArg.totalFrames).toBe(720);

    const shotWithCustomArg = computeExportTimeRange(
      mockScore,
      'shot',
      24,
      mockShot,
      { startSec: 2.5, endSec: 6.0 }
    );
    expect(shotWithCustomArg.startSec).toBe(2.5);
    expect(shotWithCustomArg.endSec).toBe(6.5);
    expect(shotWithCustomArg.shotId).toBe('shot-2-push');
  });

  it('formats custom time range tags and inserts range suffixes into MP4 filenames', () => {
    expect(formatExportTimeRangeTag(2.5, 6.0)).toBe('2_5s-6s');
    expect(formatExportTimeRangeTag(1.25, 3.5)).toBe('1_25s-3_5s');
    expect(formatExportTimeRangeTag(1.234, 5.678)).toBe('1_23s-5_68s');
    expect(formatExportTimeRangeTag(0, 10)).toBe('0s-10s');

    expect(
      formatExportMp4Filename('Vector Field', 1080, 60, null, 'stage-cam', {
        startSec: 2.5,
        endSec: 6.0,
      })
    ).toBe('vector_field_2_5s-6s_stage_cam_1080p_60fps.mp4');

    expect(
      formatExportMp4Filename('Vector Field', 720, 24, '', 'observer', {
        startSec: 1.25,
        endSec: 4.5,
      })
    ).toBe('vector_field_1_25s-4_5s_observer_720p_24fps.mp4');

    // Shot ID takes precedence when present
    expect(
      formatExportMp4Filename(
        'Vector Field',
        1080,
        60,
        'shot-2-push',
        'stage-cam',
        { startSec: 2.5, endSec: 6.0 }
      )
    ).toBe('vector_field_shot_2_push_stage_cam_1080p_60fps.mp4');
  });
});
