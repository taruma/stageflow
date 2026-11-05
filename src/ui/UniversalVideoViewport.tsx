/**
 * Universal Video Viewport Component.
 * Seamlessly renders:
 *   1. Native HTML5 <video> (local .mp4 / .webm or dropped file blob)
 *   2. YouTube IFrame Player (with unified transport & 60fps drift-corrected sync)
 *   3. True 3D Stage Cam Monitor Viewport (for zero-asset `procedural://` demos)
 * Styled with SceneFlow tactile pill and rounded card design tokens.
 */

import React, { useState } from 'react';
import { Film, Globe, Sparkles, Check, Link2 } from 'lucide-react';
import type { AppThemeCategory, LabelDisplayMode, StageFrame, StageScore } from '../core/types';
import type { MediaSourceInfo } from '../media/mediaTypes';
import { StageCamMonitorCanvas } from '../stage/StageCamMonitorCanvas';
import { UI_TOKENS } from './tokens/ui';

export interface UniversalVideoViewportProps {
  score: StageScore;
  sourceInfo: MediaSourceInfo;
  html5VideoRef: React.RefObject<HTMLVideoElement | null>;
  youtubeContainerRef: React.RefObject<HTMLDivElement | null>;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
  isPlaying: boolean;
  labelMode?: LabelDisplayMode;
  showGuides?: boolean;
  themeCategory?: AppThemeCategory;
  onApplyVideoUrlOverride: (url: string) => void;
}

export const UniversalVideoViewport: React.FC<UniversalVideoViewportProps> = ({
  score,
  sourceInfo,
  html5VideoRef,
  youtubeContainerRef,
  frameRef,
  uiFrame,
  isPlaying,
  labelMode,
  showGuides = true,
  themeCategory = 'dark',
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
    <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center bg-app select-none overflow-hidden">
      {/* Top Overlay Bar: Source Mode Badge & YouTube / URL Switcher */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
        <div className="px-2.5 py-1 rounded-xl bg-surface border border-border-main flex items-center gap-1.5 text-[10px] font-mono text-text-body shadow-xs">
          {sourceInfo.kind === 'youtube' ? (
            <>
              <Globe className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-text-main font-semibold">YOUTUBE SYNC</span>
              <span className="text-text-muted">· {sourceInfo.youtubeId}</span>
            </>
          ) : sourceInfo.kind === 'html5' ? (
            <>
              <Film className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-text-main font-semibold">
                LOCAL VIDEO
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-text-main font-semibold">
                STAGE CAM SIMULATOR
              </span>
              <span className="text-text-muted hidden sm:inline">
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
            className={`${
              isUrlPopoverOpen
                ? UI_TOKENS.button.settingsPillActive
                : UI_TOKENS.button.settingsPill
            } flex items-center gap-1.5`}
            title="Bind a YouTube link or direct video URL"
          >
            <Link2 className="w-3.5 h-3.5 text-text-muted" />
            <span>YouTube / URL</span>
          </button>

          {isUrlPopoverOpen && (
            <form
              onSubmit={handleApplyUrl}
              className="absolute right-0 mt-2 w-72 sm:w-80 p-3 rounded-2xl bg-surface border border-border-main shadow-2xl flex flex-col gap-2 z-30 animate-in fade-in zoom-in-95 duration-200"
            >
              <label className={UI_TOKENS.input.label}>
                YouTube URL or Video Path
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 min-w-0 bg-surface-subtle text-text-main text-xs font-mono px-3 py-2 rounded-xl border border-border-main focus:outline-none focus:border-text-main shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  className={UI_TOKENS.button.primary}
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
                  className="text-[10px] font-mono text-text-muted hover:text-text-main text-left cursor-pointer transition-colors mt-1"
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
          className="relative w-full max-h-full bg-surface-dark rounded-2xl border border-border-main shadow-xl overflow-hidden flex items-center justify-center"
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
              labelMode={labelMode}
              isPlaying={isPlaying}
              showGuides={showGuides}
              themeCategory={themeCategory}
            />
          )}
        </div>
      </div>
    </div>
  );
};
