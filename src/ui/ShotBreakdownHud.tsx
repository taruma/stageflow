/**
 * Minimalist Top-Left HUD Overlay inside the 3D Diorama Viewport.
 * Displays active Shot Number, Label, Lens Focal Length (mm), Active Maneuver,
 * and brief Directorial Staging Note.
 * Styled with SceneFlow tactile pill design tokens.
 */

import React, { useState } from 'react';
import { Aperture, ChevronDown, ChevronRight, Compass, Crosshair } from 'lucide-react';
import type { CameraViewMode, StageFrame, StageScore } from '../core/types';

export interface ShotBreakdownHudProps {
  score: StageScore;
  frame: StageFrame;
  cameraMode: CameraViewMode;
  isPlaying: boolean;
}

export const ShotBreakdownHud: React.FC<ShotBreakdownHudProps> = ({
  score,
  frame,
  cameraMode,
  isPlaying,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const shot = frame.activeShot;
  const stageCam = frame.stageCamera;
  const lensMm = Math.round(stageCam.transform.pose.focalLengthMm);
  const aspectLabel =
    Math.abs(score.aspectRatio - 16 / 9) < 0.05
      ? '16:9'
      : Math.abs(score.aspectRatio - 2.39) < 0.08
      ? '2.39:1'
      : `${score.aspectRatio.toFixed(2)}:1`;

  const offset = stageCam.targetOffset;
  const offsetMag = offset
    ? Math.hypot(offset.x, offset.y, offset.z)
    : 0;
  const hasOffset = offsetMag >= 0.01;

  // Clean redundant "Shot ## · " prefix if present since #xx badge already shows shotNumber
  const rawLabel = shot ? shot.label : score.title;
  const cleanLabel = shot
    ? rawLabel.replace(/^Shot\s*\d+\s*[·:–-]\s*/i, '').trim() || rawLabel
    : rawLabel;

  const shotTag = shot ? `#${String(shot.shotNumber).padStart(2, '0')}` : '#--';

  const cameraStateText =
    cameraMode === 'scripted'
      ? isPlaying
        ? 'Locked Observer'
        : 'Paused · Free Orbit'
      : cameraMode === 'stage-pov'
      ? 'Stage Cam Viewfinder'
      : 'Free Orbit';

  return (
    <div className="absolute top-3 left-3 max-w-sm sm:max-w-md flex flex-col gap-1.5 pointer-events-none select-none z-10">
      <div className="px-3 py-2 rounded-2xl bg-surface/95 backdrop-blur-md border border-border-main shadow-lg flex flex-col gap-1 text-text-main pointer-events-auto transition-all">
        {/* COLLAPSED VIEW: Strictly 2 lines with precision truncation */}
        {isCollapsed ? (
          <div
            onClick={() => setIsCollapsed(false)}
            className="space-y-1 cursor-pointer group"
            title="Click to expand shot breakdown"
          >
            {/* Line 1: #xx Tag + Clean Title + Expand Chevron */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="px-1.5 py-0.5 rounded-md bg-btn-primary-bg text-btn-primary-text text-[10px] font-mono font-bold shrink-0 shadow-2xs">
                  {shotTag}
                </span>
                <span className="text-xs font-sans font-semibold text-text-main truncate group-hover:text-accent-primary transition-colors">
                  {cleanLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(false);
                }}
                aria-label="Expand shot breakdown"
                className="p-1 rounded-lg hover:bg-surface-subtle text-text-faint hover:text-text-main transition-colors duration-100 shrink-0 cursor-pointer focus:outline-none"
                title="Expand shot breakdown"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Line 2: Compact Telemetry & Status String */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted truncate">
              <span className="text-text-main font-semibold shrink-0">{lensMm}mm</span>
              <span className="text-text-faint opacity-50">·</span>
              <span className="uppercase text-amber-500 font-semibold shrink-0">
                {stageCam.maneuver}
              </span>
              {hasOffset && (
                <>
                  <span className="text-text-faint opacity-50">·</span>
                  <span className="text-sky-500 font-semibold shrink-0">
                    Δ {offsetMag.toFixed(2)}m
                  </span>
                </>
              )}
              <span className="text-text-faint opacity-50">·</span>
              <span className="truncate">{cameraStateText}</span>
            </div>
          </div>
        ) : (
          /* EXPANDED VIEW: Full rich multi-line card */
          <>
            {/* Header Row: #xx Badge, Offset pill, and Collapse Chevron */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="px-1.5 py-0.5 rounded-md bg-btn-primary-bg text-btn-primary-text text-[10px] font-mono font-bold shrink-0 shadow-2xs">
                  {shotTag}
                </span>

                {hasOffset && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Crosshair className="w-2.5 h-2.5" />
                    <span>OFFSET {offsetMag.toFixed(2)}m</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse shot breakdown"
                className="p-1 rounded-lg hover:bg-surface-subtle text-text-faint hover:text-text-main transition-colors duration-100 shrink-0 cursor-pointer focus:outline-none"
                title="Collapse shot breakdown"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title Row */}
            <div className="text-xs font-sans font-semibold text-text-main leading-snug">
              {cleanLabel}
            </div>

            {/* Optics & Maneuver Row */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted pt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-text-main font-semibold">
                <Aperture className="w-3 h-3 text-sky-500" />
                {lensMm}mm Prime · {aspectLabel} Gate
              </span>
              <span className="text-border-main">|</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300 uppercase font-semibold">
                <Compass className="w-3 h-3 text-amber-500" />
                {stageCam.maneuver}
              </span>
              {hasOffset && offset && (
                <>
                  <span className="text-border-main">|</span>
                  <span className="text-sky-600 dark:text-sky-300 font-mono">
                    Δ [{offset.x >= 0 ? `+${offset.x.toFixed(2)}` : offset.x.toFixed(2)},{' '}
                    {offset.y >= 0 ? `+${offset.y.toFixed(2)}` : offset.y.toFixed(2)},{' '}
                    {offset.z >= 0 ? `+${offset.z.toFixed(2)}` : offset.z.toFixed(2)}]m
                  </span>
                </>
              )}
              <span className="text-border-main">|</span>
              <span>
                {cameraMode === 'stage-pov' ? (
                  <span className="text-amber-600 dark:text-amber-300 font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Stage Cam Viewfinder
                  </span>
                ) : (
                  cameraStateText
                )}
              </span>
            </div>

            {/* Directorial Staging Description */}
            {shot?.description && (
              <p className="text-[11px] font-sans text-text-muted leading-relaxed pt-1 border-t border-border-subtle line-clamp-2">
                {shot.description}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
