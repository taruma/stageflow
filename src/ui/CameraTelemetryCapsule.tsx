/**
 * Floating Telemetry Capsule + 1-Click YAML Snippet Copy (Taruma-Film Pattern).
 * Displays live human degrees and metric meters for the current viewport camera,
 * and copies a ready-to-paste YAML camera block to clipboard on click.
 */

import React, { useState, memo } from 'react';
import { Check, Compass, Copy } from 'lucide-react';
import type { SphericalPose } from '../core/types';
import { radToDeg } from '../core/sphericalMath';

export interface CameraTelemetryCapsuleProps {
  pose: SphericalPose;
}

export const CameraTelemetryCapsule: React.FC<CameraTelemetryCapsuleProps> =
  memo(({ pose }) => {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const pitchDeg = radToDeg(pose.pitch).toFixed(1);
    const yawDeg = radToDeg(pose.yaw).toFixed(1);
    const distMeters = pose.distance.toFixed(2);
    const tx = pose.target.x.toFixed(2);
    const ty = pose.target.y.toFixed(2);
    const tz = pose.target.z.toFixed(2);
    const lensMm = Math.round(pose.focalLengthMm);

    const handleCopyYaml = (e: React.MouseEvent) => {
      e.stopPropagation();
      const yamlSnippet = [
        `target: [${tx}, ${ty}, ${tz}]`,
        `distance: ${distMeters}`,
        `pitch: ${pitchDeg}`,
        `yaw: ${yawDeg}`,
        `lens: ${lensMm}mm`,
      ].join('\n');

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
        {/* Compact Glassmorphic Capsule Button */}
        <button
          type="button"
          onClick={handleCopyYaml}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer group shadow-xl backdrop-blur-xl ${
            copied
              ? 'bg-emerald-950/85 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-950/90 hover:bg-slate-900 border-slate-800 text-slate-300'
          }`}
          title="Click to copy YAML camera block to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover:rotate-45 transition-transform duration-300" />
          )}
          <span
            className={
              copied ? 'text-emerald-300 font-bold' : 'font-bold text-sky-300'
            }
          >
            {pitchDeg}°
          </span>
          <span className="text-slate-600">/</span>
          <span
            className={
              copied ? 'text-emerald-300 font-bold' : 'font-bold text-sky-300'
            }
          >
            {yawDeg}°
          </span>
          <span className="text-slate-600">·</span>
          <span
            className={
              copied
                ? 'text-emerald-300 font-bold'
                : 'font-bold text-amber-300'
            }
          >
            {distMeters}m
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-400 hidden sm:inline">
            ({tx}, {ty}, {tz})
          </span>
          <Copy className="w-3 h-3 text-slate-500 group-hover:text-sky-300 ml-0.5 shrink-0" />
        </button>

        {/* Upward Hover Precision Telemetry Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full mb-2 right-0 w-68 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 shadow-2xl text-[10.5px] z-50 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="font-bold uppercase tracking-wider text-slate-300 font-sans text-[10px]">
                Camera Coordinates (YAML)
              </span>
              <span className="text-[9px] text-sky-400 font-mono">
                Click to copy
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300 font-mono">
              <span className="text-slate-500 font-sans">Pitch:</span>
              <span>
                <strong className="text-sky-300">{pitchDeg}°</strong>{' '}
                <span className="text-slate-600 text-[9.5px]">
                  ({pose.pitch.toFixed(3)} rad)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300 font-mono">
              <span className="text-slate-500 font-sans">Yaw:</span>
              <span>
                <strong className="text-sky-300">{yawDeg}°</strong>{' '}
                <span className="text-slate-600 text-[9.5px]">
                  ({pose.yaw.toFixed(3)} rad)
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300 font-mono">
              <span className="text-slate-500 font-sans">Distance:</span>
              <span>
                <strong className="text-amber-300">{distMeters}</strong>{' '}
                <span className="text-slate-500 text-[9.5px]">meters</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300 font-mono">
              <span className="text-slate-500 font-sans">Target (X,Y,Z):</span>
              <span className="text-slate-200">
                [{tx}, {ty}, {tz}]
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300 font-mono pt-1 border-t border-slate-800/60">
              <span className="text-slate-500 font-sans">Equivalent Lens:</span>
              <span className="text-amber-300 font-semibold">{lensMm}mm</span>
            </div>
          </div>
        )}
      </div>
    );
  });

CameraTelemetryCapsule.displayName = 'CameraTelemetryCapsule';
