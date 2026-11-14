/**
 * Configuration form controls for the in-browser MP4 export modal.
 * Supports switching between Stage Cam POV (score aspect ratio + DoF blur)
 * and Observer Diorama (fixed 16:9 schematic with Scripted or Current Viewport angle).
 */

import React from 'react';
import { Camera, Eye, Info } from 'lucide-react';
import type {
  ExportFps,
  ExportObserverAngleMode,
  ExportRangeMode,
  ExportResolutionTier,
  ExportTargetCamera,
} from '../core/exportMath';
import type { AppThemeCategory, ShotCue } from '../core/types';
import { UI_TOKENS } from './tokens/ui';

export interface CleanVideoExportConfigFormProps {
  targetCamera: ExportTargetCamera;
  onChangeTargetCamera: (cam: ExportTargetCamera) => void;
  observerAngleMode: ExportObserverAngleMode;
  onChangeObserverAngleMode: (mode: ExportObserverAngleMode) => void;
  hasCustomViewportPose: boolean;
  tier: ExportResolutionTier;
  onChangeTier: (tier: ExportResolutionTier) => void;
  fps: ExportFps;
  onChangeFps: (fps: ExportFps) => void;
  rangeMode: ExportRangeMode;
  onChangeRangeMode: (mode: ExportRangeMode) => void;
  hasValidShot: boolean;
  activeShot?: ShotCue | null;
  sceneDurationSec: number;
  exportTheme: AppThemeCategory;
  onChangeExportTheme: (theme: AppThemeCategory) => void;
  exportDofBlur: boolean;
  onChangeExportDofBlur: (enabled: boolean) => void;
  filename: string;
  totalFrames: number;
  exportDurationSec: number;
  width: number;
  height: number;
}

export const CleanVideoExportConfigForm: React.FC<
  CleanVideoExportConfigFormProps
> = ({
  targetCamera,
  onChangeTargetCamera,
  observerAngleMode,
  onChangeObserverAngleMode,
  hasCustomViewportPose,
  tier,
  onChangeTier,
  fps,
  onChangeFps,
  rangeMode,
  onChangeRangeMode,
  hasValidShot,
  activeShot,
  sceneDurationSec,
  exportTheme,
  onChangeExportTheme,
  exportDofBlur,
  onChangeExportDofBlur,
  filename,
  totalFrames,
  exportDurationSec,
  width,
  height,
}) => {
  const isObserver = targetCamera === 'observer';

  return (
    <div className="space-y-3.5">
      {/* Target Camera Selector */}
      <div className="space-y-1.5">
        <span className={UI_TOKENS.input.label}>Target Camera</span>
        <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
          <button
            type="button"
            onClick={() => onChangeTargetCamera('stage-cam')}
            className={`flex-1 justify-center ${
              targetCamera === 'stage-cam'
                ? UI_TOKENS.button.segmentedItemActive
                : UI_TOKENS.button.segmentedItem
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-500" />
            <span>Stage Cam POV</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTargetCamera('observer')}
            className={`flex-1 justify-center ${
              targetCamera === 'observer'
                ? UI_TOKENS.button.segmentedItemActive
                : UI_TOKENS.button.segmentedItem
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-sky-500" />
            <span>Observer Diorama (16:9)</span>
          </button>
        </div>
      </div>

      {/* Observer Camera Angle (Shown Only for Observer Diorama) */}
      {isObserver && (
        <div className="space-y-1.5">
          <span className={UI_TOKENS.input.label}>Observer Angle</span>
          <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
            <button
              type="button"
              onClick={() => onChangeObserverAngleMode('scripted')}
              className={`flex-1 justify-center ${
                observerAngleMode === 'scripted'
                  ? UI_TOKENS.button.segmentedItemActive
                  : UI_TOKENS.button.segmentedItem
              }`}
            >
              Scripted Observer
            </button>
            <button
              type="button"
              disabled={!hasCustomViewportPose}
              onClick={() => onChangeObserverAngleMode('current-viewport')}
              title={
                hasCustomViewportPose
                  ? 'Lock export camera to your current diorama viewport angle'
                  : 'Current viewport angle unavailable'
              }
              className={`flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                observerAngleMode === 'current-viewport'
                  ? UI_TOKENS.button.segmentedItemActive
                  : UI_TOKENS.button.segmentedItem
              }`}
            >
              Current Viewport Angle
            </button>
          </div>
        </div>
      )}

      {/* Resolution & Framerate */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className={UI_TOKENS.input.label}>Resolution</span>
          <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
            {([1080, 720] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChangeTier(opt)}
                className={`flex-1 justify-center ${
                  tier === opt
                    ? UI_TOKENS.button.segmentedItemActive
                    : UI_TOKENS.button.segmentedItem
                }`}
              >
                {opt}p
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={UI_TOKENS.input.label}>Frame Rate</span>
          <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
            {([60, 24] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChangeFps(opt)}
                className={`flex-1 justify-center ${
                  fps === opt
                    ? UI_TOKENS.button.segmentedItemActive
                    : UI_TOKENS.button.segmentedItem
                }`}
              >
                {opt} fps
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Range */}
      <div className="space-y-1.5">
        <span className={UI_TOKENS.input.label}>Time Range</span>
        <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
          <button
            type="button"
            onClick={() => onChangeRangeMode('scene')}
            className={`flex-1 justify-center ${
              rangeMode === 'scene'
                ? UI_TOKENS.button.segmentedItemActive
                : UI_TOKENS.button.segmentedItem
            }`}
          >
            Entire Scene ({sceneDurationSec.toFixed(1)}s)
          </button>
          <button
            type="button"
            disabled={!hasValidShot}
            onClick={() => onChangeRangeMode('shot')}
            className={`flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
              rangeMode === 'shot'
                ? UI_TOKENS.button.segmentedItemActive
                : UI_TOKENS.button.segmentedItem
            }`}
          >
            Current Shot{activeShot ? ` (${activeShot.id})` : ''}
          </button>
        </div>
      </div>

      {/* Stage Palette & Optical DoF Blur */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className={UI_TOKENS.input.label}>Stage Palette</span>
          <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
            {(
              [
                { id: 'light', label: 'Light' },
                { id: 'warm', label: 'Warm' },
                { id: 'dark', label: 'Dark' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeExportTheme(opt.id)}
                className={`flex-1 justify-center ${
                  exportTheme === opt.id
                    ? UI_TOKENS.button.segmentedItemActive
                    : UI_TOKENS.button.segmentedItem
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={UI_TOKENS.input.label}>Optical DoF Blur</span>
          <div
            title={
              isObserver
                ? 'Optical DoF Blur applies to Stage Cam POV exports only'
                : 'Toggle thin-lens Depth-of-Field bokeh simulation'
            }
            className={`${UI_TOKENS.button.segmentedGroup} w-full ${
              isObserver ? 'opacity-45' : ''
            }`}
          >
            {(
              [
                { value: true, label: 'On' },
                { value: false, label: 'Off' },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                disabled={isObserver}
                onClick={() => onChangeExportDofBlur(opt.value)}
                className={`flex-1 justify-center disabled:cursor-not-allowed ${
                  !isObserver && exportDofBlur === opt.value
                    ? UI_TOKENS.button.segmentedItemActive
                    : UI_TOKENS.button.segmentedItem
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* WebGL-Only Schematic Note for Observer Diorama */}
      {isObserver && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-[11px] font-sans text-text-body leading-snug">
          <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
          <span>
            Renders a clean 16:9 WebGL 3D schematic (grid, mannequins, camera
            rig, frustum, focus plane &amp; trails). Floating HTML pill labels
            are omitted; use <code>npm run record</code> for full DOM badges.
          </span>
        </div>
      )}

      {/* Output Summary */}
      <div className="px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-mono text-text-muted space-y-1">
        <div className="flex justify-between gap-2">
          <span>Output File</span>
          <span className="text-text-main font-semibold truncate">
            {filename}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Bounds &amp; Cadence</span>
          <span className="text-text-body">
            {width}×{height} · {totalFrames} frames ({exportDurationSec.toFixed(2)}s)
          </span>
        </div>
      </div>
    </div>
  );
};
