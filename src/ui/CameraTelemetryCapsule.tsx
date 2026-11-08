/**
 * Floating Telemetry Capsule + 1-Click YAML Snippet Copy (Taruma-Film Pattern).
 * Displays live human degrees and metric meters for the current viewport camera,
 * and copies a ready-to-paste YAML camera block to clipboard on click.
 * Styled with SceneFlow tactile pill design tokens.
 */

import React, { useState, memo } from 'react';
import { Check, Compass, Copy } from 'lucide-react';
import type { EvaluatedCameraRigState, SphericalPose } from '../core/types';
import { radToDeg } from '../core/sphericalMath';

export interface CameraTelemetryCapsuleProps {
  pose: SphericalPose;
  activeRig?: EvaluatedCameraRigState;
  dioramaWidth?: number;
}

export const CameraTelemetryCapsule: React.FC<CameraTelemetryCapsuleProps> =
  memo(({ pose, activeRig, dioramaWidth }) => {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const showTargetCoords = dioramaWidth === undefined || dioramaWidth >= 880;

    const pitchDeg = radToDeg(pose.pitch).toFixed(1);
    const yawDeg = radToDeg(pose.yaw).toFixed(1);
    const rollVal = radToDeg(pose.roll);
    const rollDeg = rollVal.toFixed(1);
    const hasNonZeroRoll = Math.abs(rollVal) >= 0.05;
    const distMeters = pose.distance.toFixed(2);
    const tx = pose.target.x.toFixed(2);
    const ty = pose.target.y.toFixed(2);
    const tz = pose.target.z.toFixed(2);
    const lensMm = Math.round(pose.focalLengthMm);

    const handleCopyYaml = (e: React.MouseEvent) => {
      e.stopPropagation();

      let yamlSnippet: string;
      if (activeRig?.type === 'tripod') {
        const ex = activeRig.eyePosition.x.toFixed(2);
        const ey = activeRig.eyePosition.y.toFixed(2);
        const ez = activeRig.eyePosition.z.toFixed(2);
        yamlSnippet = [
          'rig:',
          '  type: tripod',
          `  position: [${ex}, ${ey}, ${ez}]`,
          ...(activeRig.hasTargetLock
            ? [`target: [${tx}, ${ty}, ${tz}]`]
            : [`pitch: ${pitchDeg}`, `yaw: ${yawDeg}`]),
          ...(hasNonZeroRoll ? [`roll: ${rollDeg}`] : []),
          `lens: ${lensMm}mm`,
        ].join('\n');
      } else if (activeRig?.type === 'track') {
        const p0 = activeRig.railPoints[0] ?? activeRig.eyePosition;
        const p1 =
          activeRig.railPoints[activeRig.railPoints.length - 1] ??
          activeRig.eyePosition;
        yamlSnippet = [
          'rig:',
          '  type: track',
          `  from: [${p0.x.toFixed(2)}, ${p0.y.toFixed(2)}, ${p0.z.toFixed(2)}]`,
          `  to: [${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}, ${p1.z.toFixed(2)}]`,
          ...(activeRig.hasTargetLock
            ? [`target: [${tx}, ${ty}, ${tz}]`]
            : [`pitch: ${pitchDeg}`, `yaw: ${yawDeg}`]),
          ...(hasNonZeroRoll ? [`roll: ${rollDeg}`] : []),
          `lens: ${lensMm}mm`,
        ].join('\n');
      } else if (activeRig?.type === 'spline_track') {
        const ptsStr = activeRig.railPoints
          .filter((_, idx) => idx % Math.max(1, Math.floor(activeRig.railPoints.length / 4)) === 0 || idx === activeRig.railPoints.length - 1)
          .map((p) => `    - [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`)
          .join('\n');
        yamlSnippet = [
          'rig:',
          '  type: spline_track',
          '  points:',
          ptsStr,
          ...(activeRig.hasTargetLock
            ? [`target: [${tx}, ${ty}, ${tz}]`]
            : [`pitch: ${pitchDeg}`, `yaw: ${yawDeg}`]),
          ...(hasNonZeroRoll ? [`roll: ${rollDeg}`] : []),
          `lens: ${lensMm}mm`,
        ].join('\n');
      } else {
        yamlSnippet = [
          `target: [${tx}, ${ty}, ${tz}]`,
          `distance: ${distMeters}`,
          `pitch: ${pitchDeg}`,
          `yaw: ${yawDeg}`,
          ...(hasNonZeroRoll ? [`roll: ${rollDeg}`] : []),
          `lens: ${lensMm}mm`,
        ].join('\n');
      }

      navigator.clipboard.writeText(yamlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };

    return (
      <div
        className="absolute bottom-3 right-3 select-none z-20"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Compact Tactile Capsule Button */}
        <button
          type="button"
          onClick={handleCopyYaml}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all cursor-pointer group shadow-md active:scale-95 ${
            copied
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
              : 'bg-surface hover:bg-surface-hover border-border-main text-text-body'
          }`}
          title="Click to copy YAML camera block to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-text-muted shrink-0 group-hover:rotate-45 transition-transform duration-300" />
          )}
          {/* Pitch */}
          <span className="flex items-center gap-0.5">
            <span className="text-[9px] text-text-faint font-mono">P</span>
            <span
              className={
                copied ? 'text-emerald-600 dark:text-emerald-300 font-bold' : 'font-bold text-text-main'
              }
            >
              {pitchDeg}°
            </span>
          </span>

          <span className="text-border-main">·</span>

          {/* Yaw */}
          <span className="flex items-center gap-0.5">
            <span className="text-[9px] text-text-faint font-mono">Y</span>
            <span
              className={
                copied ? 'text-emerald-600 dark:text-emerald-300 font-bold' : 'font-bold text-text-main'
              }
            >
              {yawDeg}°
            </span>
          </span>

          {/* Roll (if non-zero) */}
          {hasNonZeroRoll && (
            <>
              <span className="text-border-main">·</span>
              <span className="flex items-center gap-0.5">
                <span className="text-[9px] text-text-faint font-mono">R</span>
                <span
                  className={
                    copied
                      ? 'text-emerald-600 dark:text-emerald-300 font-bold'
                      : 'font-bold text-violet-600 dark:text-violet-300'
                  }
                  title="Camera Roll (Dutch Angle)"
                >
                  {rollDeg}°
                </span>
              </span>
            </>
          )}

          <span className="text-border-main">·</span>

          {/* Distance */}
          <span className="flex items-center gap-0.5">
            <span className="text-[9px] text-text-faint font-mono">D</span>
            <span
              className={
                copied
                  ? 'text-emerald-600 dark:text-emerald-300 font-bold'
                  : 'font-bold text-amber-600 dark:text-amber-400'
              }
            >
              {distMeters}m
            </span>
          </span>

          {/* Target */}
          {showTargetCoords && (
            <>
              <span className="text-border-main hidden sm:inline">·</span>
              <span className="hidden sm:flex items-center gap-0.5 text-text-muted">
                <span className="text-[9px] text-text-faint font-mono">TGT</span>
                <span>[{tx}, {ty}, {tz}]</span>
              </span>
            </>
          )}

          <span className="text-border-main hidden md:inline">·</span>

          {/* Equivalent Lens */}
          <span className="hidden md:inline text-text-main font-semibold">
            {lensMm}mm
          </span>

          {activeRig && (
            <>
              <span className="text-border-main hidden lg:inline">·</span>
              <span className="hidden lg:inline px-1 py-0.5 rounded text-[8.5px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 uppercase">
                {activeRig.type.replace('_', ' ')}
              </span>
            </>
          )}

          <Copy className="w-3 h-3 text-text-faint group-hover:text-text-main ml-0.5 shrink-0" />
        </button>

        {/* Upward Hover Precision Telemetry Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full mb-2 right-0 w-68 bg-surface border border-border-main rounded-2xl p-3.5 shadow-2xl text-[10.5px] z-50 flex flex-col gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150 text-text-main">
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
              <span className="font-bold uppercase tracking-wider text-text-main font-sans text-[10px]">
                Camera Coordinates (YAML)
              </span>
              <span className="text-[9px] text-text-muted font-mono">
                Click to copy
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono">
              <span className="text-text-muted font-sans">Pitch:</span>
              <span>
                <strong className="text-text-main">{pitchDeg}°</strong>{' '}
                <span className="text-text-faint text-[9.5px]">
                  ({pose.pitch.toFixed(3)} rad)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono">
              <span className="text-text-muted font-sans">Yaw:</span>
              <span>
                <strong className="text-text-main">{yawDeg}°</strong>{' '}
                <span className="text-text-faint text-[9.5px]">
                  ({pose.yaw.toFixed(3)} rad)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono">
              <span className="text-text-muted font-sans">Roll:</span>
              <span>
                <strong
                  className={
                    hasNonZeroRoll ? 'text-violet-600 dark:text-violet-300' : 'text-text-muted'
                  }
                >
                  {rollDeg}°
                </strong>{' '}
                <span className="text-text-faint text-[9.5px]">
                  ({pose.roll.toFixed(3)} rad)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono">
              <span className="text-text-muted font-sans">Distance:</span>
              <span>
                <strong className="text-amber-600 dark:text-amber-400">{distMeters}</strong>{' '}
                <span className="text-text-faint text-[9.5px]">meters</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono">
              <span className="text-text-muted font-sans">Target (X,Y,Z):</span>
              <span className="text-text-main">
                [{tx}, {ty}, {tz}]
              </span>
            </div>

            <div className="flex justify-between items-center text-text-body font-mono pt-1 border-t border-border-subtle">
              <span className="text-text-muted font-sans">Equivalent Lens:</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{lensMm}mm</span>
            </div>

            {activeRig && (
              <div className="flex justify-between items-center text-text-body font-mono">
                <span className="text-text-muted font-sans">Rig Mount:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase">
                  {activeRig.type.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

CameraTelemetryCapsule.displayName = 'CameraTelemetryCapsule';
