import { describe, expect, it } from 'vitest';
import {
  computeExportBitrate,
  computeExportDimensions,
  computeExportFrameTimestampSec,
  computeExportTimeRange,
  formatExportMp4Filename,
  resolveExportAspectRatio,
  roundToEven,
  sanitizeExportSlug,
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
});
