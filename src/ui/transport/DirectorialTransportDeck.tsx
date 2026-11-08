/**
 * Directorial Transport Deck Component.
 * Unified centered island housing:
 *   1. Left Segment: Precision Timecode Readout (Current / Duration)
 *   2. Center Segment: Core Kinetic Transport (Restart to 0, Hero Play/Pause Toggle)
 *   3. Right Segment: Directorial Modifiers (Loop Active Shot, Audio Mute, Variable Slow-Motion Speeds)
 * Frame-step buttons (< [ and ] >) are omitted to maximize visual clarity (keyboard shortcuts [ and ] remain globally active).
 * Balanced layout leaving both left and right outer flanks open.
 */

import React from 'react';
import {
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTimecode } from './DirectorialTimelineTrack';

export interface DirectorialTransportDeckProps {
  currentSec: number;
  safeDuration: number;
  isPlaying: boolean;
  playbackRate: number;
  isMuted: boolean;
  loopActiveShot: boolean;
  onTogglePlay: () => void;
  onSeek: (targetSec: number) => void;
  onStepFrames?: (frames: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleMute: () => void;
  onToggleLoopActiveShot: () => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 1, 2] as const;

export const DirectorialTransportDeck: React.FC<
  DirectorialTransportDeckProps
> = ({
  currentSec,
  safeDuration,
  isPlaying,
  playbackRate,
  isMuted,
  loopActiveShot,
  onTogglePlay,
  onSeek,
  onSetPlaybackRate,
  onToggleMute,
  onToggleLoopActiveShot,
}) => {
  return (
    <div className="flex items-center justify-center w-full py-0.5">
      {/* Unified Centered Island with Left-to-Right Hierarchy */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
        {/* Segment 1 (Left): Timecode Readout */}
        <div className="px-2.5 py-1.5 rounded-xl bg-surface-muted border border-border-main font-mono text-xs text-text-muted flex items-center gap-1 shadow-inner select-text">
          <span className="text-text-main font-bold">
            {formatTimecode(currentSec)}
          </span>
          <span className="text-text-faint">/</span>
          <span className="text-text-faint">
            {formatTimecode(safeDuration)}
          </span>
        </div>

        {/* Subtle Visual Divider */}
        <div className="w-px h-4 bg-border-main shrink-0 hidden sm:block" />

        {/* Segment 2 (Center): Core Kinetic Transport */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Restart to 00:00.00 */}
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-main text-text-muted hover:text-text-main transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Restart to 00:00.00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Primary Hero: Play / Pause Toggle `Space` */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover'
            }`}
            title="Play / Pause (Hotkey: Space · Frame Step: [ and ])"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>
        </div>

        {/* Subtle Visual Divider */}
        <div className="w-px h-4 bg-border-main shrink-0 hidden sm:block" />

        {/* Segment 3 (Right): Directorial Modifiers */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Loop Active Shot */}
          <button
            type="button"
            onClick={onToggleLoopActiveShot}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 ${
              loopActiveShot
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300 font-semibold shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-main text-text-muted hover:text-text-main'
            }`}
            title="Loop currently active shot"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loop Shot</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-main text-text-muted hover:text-text-main transition-all cursor-pointer shadow-2xs active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>

          {/* Playback Speed Pills */}
          <div className="flex items-center gap-0.5 bg-surface-muted p-0.5 rounded-xl border border-border-main font-mono text-[10px] shadow-xs">
            {PLAYBACK_RATES.map((rate) => {
              const active = Math.abs(playbackRate - rate) < 0.01;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onSetPlaybackRate(rate)}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-surface text-text-main font-bold shadow-xs'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                  title={`Set playback speed to ${rate}x`}
                >
                  {rate}x
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
