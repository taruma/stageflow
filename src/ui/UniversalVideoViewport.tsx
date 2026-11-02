/**
 * Universal Video Viewport Component.
 * Seamlessly renders:
 *   1. Native HTML5 <video> (local .mp4 / .webm or dropped file blob)
 *   2. YouTube IFrame Player (with unified transport & 60fps drift-corrected sync)
 *   3. Procedural Blueprint Monitor Slate (for zero-asset `procedural://` demos)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Film, Globe, Sparkles, Check, Link2 } from 'lucide-react';
import type { StageFrame, StageScore } from '../core/types';
import type { MediaSourceInfo } from '../media/mediaTypes';
import { radToDeg } from '../core/sphericalMath';

export interface UniversalVideoViewportProps {
  score: StageScore;
  sourceInfo: MediaSourceInfo;
  html5VideoRef: React.RefObject<HTMLVideoElement | null>;
  youtubeContainerRef: React.RefObject<HTMLDivElement | null>;
  frameRef: React.RefObject<StageFrame>;
  isPlaying: boolean;
  onApplyVideoUrlOverride: (url: string) => void;
}

export const UniversalVideoViewport: React.FC<UniversalVideoViewportProps> = ({
  score,
  sourceInfo,
  html5VideoRef,
  youtubeContainerRef,
  frameRef,
  onApplyVideoUrlOverride,
}) => {
  const [isUrlPopoverOpen, setIsUrlPopoverOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const proceduralCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render live 60fps procedural blueprint monitor when sourceInfo.kind === 'procedural'
  useEffect(() => {
    if (sourceInfo.kind !== 'procedural') return;
    let rafId: number;

    const drawSlate = () => {
      const canvas = proceduralCanvasRef.current;
      const frame = frameRef.current;
      if (canvas && frame) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // 1. Dark Blueprint Monitor Background
          ctx.fillStyle = '#060a15';
          ctx.fillRect(0, 0, w, h);

          // 2. Subtle Horizon & Optical Grid
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
          ctx.lineWidth = 1;
          const gridCols = 12;
          const gridRows = 6;
          for (let i = 1; i < gridCols; i++) {
            const x = (w / gridCols) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let j = 1; j < gridRows; j++) {
            const y = (h / gridRows) * j;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // 3. Project Scene Entities from the Stage Camera's exact POV
          const camPos = frame.stageCamera.transform.position;
          const camTgt = frame.stageCamera.transform.target;
          const fovRad = (frame.stageCamera.transform.fovDeg * Math.PI) / 180;
          const focalPx = (h * 0.5) / Math.tan(fovRad * 0.5);

          // Forward, Right, Up basis vectors for Stage Camera
          const fx = camTgt.x - camPos.x;
          const fy = camTgt.y - camPos.y;
          const fz = camTgt.z - camPos.z;
          const flen = Math.hypot(fx, fy, fz) || 1;
          const fnx = fx / flen;
          const fny = fy / flen;
          const fnz = fz / flen;

          // Right = normalize(cross(forward, worldUp(0,1,0)))
          let rx = -fnz;
          let ry = 0;
          let rz = fnx;
          const rlen = Math.hypot(rx, ry, rz) || 1;
          rx /= rlen;
          rz /= rlen;

          // Up = cross(right, forward)
          const ux = ry * fnz - rz * fny;
          const uy = rz * fnx - rx * fnz;
          const uz = rx * fny - ry * fnx;

          // Draw horizon line
          const horizonY = h * 0.5 + fny * focalPx;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          ctx.lineTo(w, horizonY);
          ctx.stroke();

          // Sort entities back-to-front relative to Stage Camera
          const projectedEntities = frame.entitiesList
            .map((ent) => {
              const centerY = ent.position.y + ent.def.height * 0.5;
              const dx = ent.position.x - camPos.x;
              const dy = centerY - camPos.y;
              const dz = ent.position.z - camPos.z;
              const depth = dx * fnx + dy * fny + dz * fnz;
              const camX = dx * rx + dy * ry + dz * rz;
              const camY = dx * ux + dy * uy + dz * uz;
              return { ent, depth, camX, camY };
            })
            .filter((item) => item.depth > 0.2)
            .sort((a, b) => b.depth - a.depth);

          for (const { ent, depth, camX, camY } of projectedEntities) {
            const screenX = w * 0.5 + (camX / depth) * focalPx;
            const screenY = h * 0.5 - (camY / depth) * focalPx;
            const pixelHeight = (ent.def.height / depth) * focalPx;
            const pixelWidth = (ent.def.radius * 2.2 / depth) * focalPx;

            // Silhouette capsule on monitor
            ctx.save();
            ctx.strokeStyle = ent.def.color;
            ctx.fillStyle = `${ent.def.color}28`;
            ctx.lineWidth = ent.highlighted ? 2.5 : 1.5;

            ctx.beginPath();
            ctx.roundRect(
              screenX - pixelWidth * 0.5,
              screenY - pixelHeight * 0.5,
              pixelWidth,
              pixelHeight,
              Math.min(24, pixelWidth * 0.4)
            );
            ctx.fill();
            ctx.stroke();

            // Head circle inside monitor
            const headRadius = Math.max(6, pixelWidth * 0.28);
            const headCenterY =
              screenY - pixelHeight * 0.5 + headRadius * 1.25;
            ctx.beginPath();
            ctx.arc(screenX, headCenterY, headRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Entity label under silhouette
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '600 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              `${ent.def.label} (${depth.toFixed(1)}m)`,
              screenX,
              screenY + pixelHeight * 0.5 + 16
            );
            ctx.restore();
          }

          // 4. Cinema Gate Safe-Action Guide & Center Crosshair
          const marginX = w * 0.06;
          const marginY = h * 0.06;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(marginX, marginY, w - marginX * 2, h - marginY * 2);

          // Center optical reticle
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, 10, 0, Math.PI * 2);
          ctx.stroke();

          // 5. Bottom Monitor Telemetry Strip
          const pose = frame.stageCamera.transform.pose;
          ctx.fillStyle = 'rgba(5, 8, 17, 0.82)';
          ctx.fillRect(marginX + 8, h - marginY - 34, w - (marginX + 8) * 2, 26);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `STAGE CAM MONITOR · ${Math.round(pose.focalLengthMm)}mm LENS · DIST ${pose.distance.toFixed(2)}m · YAW ${radToDeg(pose.yaw).toFixed(1)}°`,
            marginX + 18,
            h - marginY - 17
          );
          ctx.textAlign = 'right';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(
            `T+ ${frame.timestampSec.toFixed(2)}s`,
            w - marginX - 18,
            h - marginY - 17
          );
        }
      }
      rafId = requestAnimationFrame(drawSlate);
    };

    rafId = requestAnimationFrame(drawSlate);
    return () => cancelAnimationFrame(rafId);
  }, [sourceInfo.kind, frameRef]);

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onApplyVideoUrlOverride(urlInput.trim());
      setIsUrlPopoverOpen(false);
    }
  };

  return (
    <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center bg-[#050811] select-none overflow-hidden">
      {/* Top Overlay Bar: Source Mode Badge & YouTube / URL Switcher */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-slate-950/90 backdrop-blur-md border border-slate-800 flex items-center gap-1.5 text-[10px] font-mono text-slate-300 shadow-md">
          {sourceInfo.kind === 'youtube' ? (
            <>
              <Globe className="w-3 h-3 text-rose-400" />
              <span className="text-rose-300 font-semibold">YOUTUBE SYNC</span>
              <span className="text-slate-500">· {sourceInfo.youtubeId}</span>
            </>
          ) : sourceInfo.kind === 'html5' ? (
            <>
              <Film className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">
                LOCAL VIDEO
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-semibold">
                STAGE CAM SIMULATOR
              </span>
              <span className="text-slate-500 hidden sm:inline">
                · Drop .MP4 or Link YouTube
              </span>
            </>
          )}
        </div>

        {/* Paste YouTube / Video URL Popover Trigger */}
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsUrlPopoverOpen((prev) => !prev)}
            className="px-2.5 py-1 rounded-md bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-[10px] font-mono text-slate-300 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Bind a YouTube link or direct video URL"
          >
            <Link2 className="w-3 h-3 text-sky-400" />
            <span>YouTube / URL</span>
          </button>

          {isUrlPopoverOpen && (
            <form
              onSubmit={handleApplyUrl}
              className="absolute right-0 mt-1.5 w-72 sm:w-80 p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-slate-800 shadow-2xl flex flex-col gap-2 z-30"
            >
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                YouTube URL or Video Path
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 min-w-0 bg-slate-900 text-slate-100 text-xs font-mono px-2.5 py-1.5 rounded-md border border-slate-700 focus:outline-none focus:border-sky-400"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Sync</span>
                </button>
              </div>
              {sourceInfo.kind !== 'procedural' && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyVideoUrlOverride('procedural://demo');
                    setIsUrlPopoverOpen(false);
                  }}
                  className="text-[10px] font-mono text-amber-400/90 hover:text-amber-300 text-left cursor-pointer"
                >
                  ↺ Return to Stage Cam Blueprint Simulator
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* 16:9 / Gate Aspect Ratio Responsive Frame */}
      <div className="w-full h-full flex items-center justify-center p-3">
        <div
          style={{ aspectRatio: String(score.aspectRatio) }}
          className="relative w-full max-h-full bg-slate-950 rounded-xl border border-slate-800/90 shadow-2xl overflow-hidden flex items-center justify-center"
        >
          {/* 1. Native HTML5 <video> */}
          <video
            ref={html5VideoRef}
            src={sourceInfo.kind === 'html5' ? sourceInfo.url : undefined}
            playsInline
            preload="auto"
            className={`w-full h-full object-contain ${
              sourceInfo.kind === 'html5' ? 'block' : 'hidden'
            }`}
          />

          {/* 2. YouTube IFrame Container */}
          <div
            ref={youtubeContainerRef}
            className={`w-full h-full ${
              sourceInfo.kind === 'youtube' ? 'block' : 'hidden'
            }`}
          />

          {/* 3. Procedural Blueprint Monitor Slate */}
          {sourceInfo.kind === 'procedural' && (
            <canvas
              ref={proceduralCanvasRef}
              width={960}
              height={540}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
};
