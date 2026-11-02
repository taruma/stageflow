/**
 * Universal Video Viewport Component.
 * Seamlessly renders:
 *   1. Native HTML5 <video> (local .mp4 / .webm or dropped file blob)
 *   2. YouTube IFrame Player (with unified transport & 60fps drift-corrected sync)
 *   3. True 3D Stage Cam Monitor Viewport (for zero-asset `procedural://` demos)
 */

import React, { useState } from 'react';
import { Film, Globe, Sparkles, Check, Link2 } from 'lucide-react';
import type { StageFrame, StageScore } from '../core/types';
import type { MediaSourceInfo } from '../media/mediaTypes';
import { StageCamMonitorCanvas } from '../stage/StageCamMonitorCanvas';

export interface UniversalVideoViewportProps {
  score: StageScore;
  sourceInfo: MediaSourceInfo;
  html5VideoRef: React.RefObject<HTMLVideoElement | null>;
  youtubeContainerRef: React.RefObject<HTMLDivElement | null>;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
  isPlaying: boolean;
  onApplyVideoUrlOverride: (url: string) => void;
}

export const UniversalVideoViewport: React.FC<UniversalVideoViewportProps> = ({
  score,
  sourceInfo,
  html5VideoRef,
  youtubeContainerRef,
  frameRef,
  uiFrame,
  onApplyVideoUrlOverride,
}) => {
  const [isUrlPopoverOpen, setIsUrlPopoverOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

          {/* 3. True 3D Optical Stage Cam Monitor Viewport */}
          {sourceInfo.kind === 'procedural' && (
            <StageCamMonitorCanvas
              score={score}
              frameRef={frameRef}
              uiFrame={uiFrame}
            />
          )}
        </div>
      </div>
    </div>
  );
};
