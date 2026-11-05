/**
 * Minimalist Top-Left HUD Overlay inside the 3D Diorama Viewport.
 * Displays active Shot Number, Label, Lens Focal Length (mm), Active Maneuver,
 * and brief Directorial Staging Note.
 * Styled with SceneFlow tactile pill design tokens.
 */

import React, { useState } from 'react';
import { Aperture, ChevronDown, Compass, Crosshair, Video } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  // Clean redundant "Shot ## · " prefix if present since SHOT badge already shows shotNumber
  const rawLabel = shot ? shot.label : score.title;
  const cleanLabel = shot
    ? rawLabel.replace(/^Shot\s*\d+\s*[·:–-]\s*/i, '').trim() || rawLabel
    : rawLabel;

  return (
    <div className="absolute top-3 left-3 max-w-md flex flex-col gap-1.5 pointer-events-none select-none z-10">
      {/* Primary Shot & Optics Pill */}
      <div className="px-3 py-2 rounded-2xl bg-surface/95 backdrop-blur-md border border-border-main shadow-lg flex flex-col gap-1 text-text-main pointer-events-auto transition-all">
        {/* Header Row: Shot Badge, Clean Label, and Collapse Chevron */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="px-2 py-0.5 rounded-lg bg-btn-primary-bg text-btn-primary-text text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs shrink-0">
              <Video className="w-3 h-3" />
              {shot ? `SHOT ${String(shot.shotNumber).padStart(2, '0')}` : 'STANDBY'}
            </span>

            {hasOffset && !isCollapsed && (
              <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Crosshair className="w-3 h-3" />
                OFFSET {offsetMag.toFixed(2)}m
              </span>
            )}

            <span className="text-xs font-mono font-semibold text-text-main truncate">
              {cleanLabel}
            </span>

            {isCollapsed && (
              <span className="text-[10px] font-mono text-text-muted shrink-0 hidden sm:inline">
                · {lensMm}mm · <span className="uppercase text-amber-500">{stageCam.maneuver}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Expand shot breakdown' : 'Collapse shot breakdown'}
            className="p-1 rounded-lg hover:bg-surface-subtle text-text-faint hover:text-text-main transition-colors shrink-0 cursor-pointer"
            title={isCollapsed ? 'Expand shot breakdown' : 'Collapse shot breakdown'}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isCollapsed ? '-rotate-90' : 'rotate-0'
              }`}
            />
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Optics & Maneuver Row */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted pt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-text-main font-semibold">
                <Aperture className="w-3 h-3 text-sky-500" />
                {lensMm}mm Prime · {aspectLabel} Gate
              </span>
              <span className="text-border-main">|</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300 uppercase">
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
                {cameraMode === 'scripted' ? (
                  isPlaying ? (
                    'Locked Observer'
                  ) : (
                    'Paused · Free Orbit'
                  )
                ) : cameraMode === 'stage-pov' ? (
                  <span className="text-amber-600 dark:text-amber-300 font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Stage Cam Viewfinder
                  </span>
                ) : (
                  'Free Orbit Unlocked'
                )}
              </span>
            </div>

            {/* Directorial Staging Description */}
            {shot?.description && (
              <p className="text-[11px] font-sans text-text-muted leading-snug pt-1 border-t border-border-subtle line-clamp-2">
                {shot.description}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
