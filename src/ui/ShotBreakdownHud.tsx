/**
 * Minimalist Top-Left HUD Overlay inside the 3D Diorama Viewport.
 * Displays active Shot Number, Label, Lens Focal Length (mm), Active Maneuver,
 * and brief Directorial Staging Note.
 */

import React from 'react';
import { Aperture, Compass, Crosshair, Video } from 'lucide-react';
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

  return (
    <div className="absolute top-3 left-3 max-w-md flex flex-col gap-1.5 pointer-events-none select-none z-10">
      {/* Primary Shot & Optics Pill */}
      <div className="px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-slate-800/90 shadow-xl flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
            <Video className="w-3 h-3" />
            {shot ? `SHOT ${String(shot.shotNumber).padStart(2, '0')}` : 'STANDBY'}
          </span>

          {hasOffset && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              OFFSET {offsetMag.toFixed(2)}m
            </span>
          )}

          <span className="text-xs font-mono font-semibold text-slate-100 truncate">
            {shot ? shot.label : score.title}
          </span>
        </div>

        {/* Optics & Maneuver Row */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-sky-300 font-semibold">
            <Aperture className="w-3 h-3 text-sky-400" />
            {lensMm}mm Prime · {aspectLabel} Gate
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1 text-amber-300/90 uppercase">
            <Compass className="w-3 h-3 text-amber-400" />
            {stageCam.maneuver}
          </span>
          {hasOffset && offset && (
            <>
              <span className="text-slate-700">|</span>
              <span className="text-cyan-300 font-mono">
                Δ [{offset.x >= 0 ? `+${offset.x.toFixed(2)}` : offset.x.toFixed(2)},{' '}
                {offset.y >= 0 ? `+${offset.y.toFixed(2)}` : offset.y.toFixed(2)},{' '}
                {offset.z >= 0 ? `+${offset.z.toFixed(2)}` : offset.z.toFixed(2)}]m
              </span>
            </>
          )}
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">
            {cameraMode === 'scripted'
              ? isPlaying
                ? 'Locked Observer'
                : 'Paused · Free Orbit'
              : cameraMode === 'stage-pov'
              ? 'Stage Camera POV'
              : 'Free Orbit Unlocked'}
          </span>
        </div>

        {/* Directorial Staging Description */}
        {shot?.description && (
          <p className="text-[11px] font-sans text-slate-300/90 leading-snug pt-1 border-t border-slate-800/70 line-clamp-2">
            {shot.description}
          </p>
        )}
      </div>
    </div>
  );
};
