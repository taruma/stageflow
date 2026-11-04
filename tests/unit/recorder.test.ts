/**
 * Unit tests for Headless Viewport Recorder CLI configuration and resolvers.
 */

import { describe, it, expect } from 'vitest';
import { CAMERA_PRESETS } from '../../scripts/record/cameraPresets';
import {
  RESOLUTION_PRESETS,
  type ResolutionPresetKey,
} from '../../scripts/record/recorderTypes';
import { resolveFfmpegPath } from '../../scripts/record/ffmpegPipeline';
import { computeStageFrame } from '../../src/core/frameEngine';
import { INITIAL_CATALOG_ITEMS } from '../../src/core/scoreCatalog';

describe('Recorder Camera Presets', () => {
  it('defines valid pitch, yaw, and distance for all presets', () => {
    const keys = Object.keys(CAMERA_PRESETS);
    expect(keys).toContain('isometric');
    expect(keys).toContain('top-down');
    expect(keys).toContain('front');
    expect(keys).toContain('side');

    for (const key of keys) {
      const preset = CAMERA_PRESETS[key];
      expect(Number.isFinite(preset.pitchDeg)).toBe(true);
      expect(Number.isFinite(preset.yawDeg)).toBe(true);
      expect(preset.distanceM).toBeGreaterThan(0);
      expect(preset.target).toHaveLength(3);
    }
  });
});

describe('Recorder Resolution Presets', () => {
  it('contains expected dimensions for all standard presets', () => {
    const presets: ResolutionPresetKey[] = [
      '1080p',
      '4k',
      '720p',
      'square',
      'vertical',
    ];
    for (const p of presets) {
      const dim = RESOLUTION_PRESETS[p];
      expect(dim.width).toBeGreaterThan(0);
      expect(dim.height).toBeGreaterThan(0);
    }
    expect(RESOLUTION_PRESETS['1080p']).toEqual({ width: 1920, height: 1080 });
    expect(RESOLUTION_PRESETS['4k']).toEqual({ width: 3840, height: 2160 });
    expect(RESOLUTION_PRESETS['vertical']).toEqual({ width: 1080, height: 1920 });
  });
});

describe('FFmpeg Path Resolver', () => {
  it('locates a valid ffmpeg executable name or path', () => {
    const ffmpegPath = resolveFfmpegPath();
    expect(typeof ffmpegPath).toBe('string');
    expect(ffmpegPath.length).toBeGreaterThan(0);
  });
});

describe('Deterministic Frame Evaluation', () => {
  it('evaluates frames identically at stepped intervals', () => {
    const score = INITIAL_CATALOG_ITEMS[0].score;
    const fps = 60;
    const totalFrames = 60; // 1 second

    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      const frameA = computeStageFrame(t, score);
      const frameB = computeStageFrame(t, score);

      expect(frameA.timestampSec).toBeCloseTo(t, 5);
      expect(frameA.stageCamera.transform.position).toEqual(
        frameB.stageCamera.transform.position
      );
      expect(frameA.observerCamera.transform.position).toEqual(
        frameB.observerCamera.transform.position
      );
    }
  });
});
