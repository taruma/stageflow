/**
 * TypeScript interfaces for CLI recorder options and execution state.
 */

import type { CameraViewMode, LabelDisplayMode } from '../../src/core/types';

export interface CliOptions {
  sceneInput: string;
  cameraMode: CameraViewMode;
  preset?: 'isometric' | 'top-down' | 'front' | 'side';
  customPose?: {
    pitchDeg?: number;
    yawDeg?: number;
    distanceM?: number;
    target?: [number, number, number];
  };
  labels: LabelDisplayMode;
  guides: boolean;
  hud: boolean;
  fps: number;
  width: number;
  height: number;
  startSec?: number;
  endSec?: number;
  shotId?: string;
  format: 'mp4' | 'webm' | 'gif' | 'sequence';
  outputPath: string;
  preview: boolean;
  port: number;
}

export type ResolutionPresetKey =
  | '1080p'
  | '4k'
  | '720p'
  | 'square'
  | 'vertical';

export const RESOLUTION_PRESETS: Record<
  ResolutionPresetKey,
  { width: number; height: number }
> = {
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  '720p': { width: 1280, height: 720 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};
