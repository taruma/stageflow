/**
 * Directorial Transport Deck with Shot Markers, Click-to-Jump Shot Chips,
 * Variable Slow-Motion Playback Rates (0.25x, 0.5x, 1x, 2x), Frame-Stepping (`[` / `]`),
 * Loop-Active-Shot Toggle, and 3-Way Instant-Cut Camera Mode Selector.
 */

import React from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Orbit,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CameraViewMode, StageFrame, StageScore } from '../core/types';

export interface DirectorialTransportBarProps {
  score: StageScore;
  frame: StageFrame;
  durationSec: number;
  isPlaying: boolean;
  playbackRate: number;
  isMuted: boolean;
  loopActiveShot: boolean;
  cameraMode: CameraViewMode;
  onTogglePlay: () => void;
  onSeek: (targetSec: number) => void;
  onStepFrames: (frames: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleMute: () => void;
  onToggleLoopActiveShot: () => void;
  onSetCameraMode: (mode: CameraViewMode) => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 1, 2] as const;

function formatTimecode(sec: number): string {
  const clamped = Math.max(0, sec);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
}

export const DirectorialTransportBar: React.FC<
  DirectorialTransportBarProps
> = ({
  score,
  frame,
  durationSec,
  isPlaying,
  playbackRate,
  isMuted,
  loopActiveShot,
  cameraMode,
  onTogglePlay,
  onSeek,
  onStepFrames,
  onSetPlaybackRate,
  onToggleMute,
  onToggleLoopActiveShot,
  onSetCameraMode,
}) => {
  const safeDuration = Math.max(0.1, durationSec);
  const currentSec = frame.timestampSec;

  return (
    <footer className="shrink-0 bg-[#0a0f1d] border-t border-slate-800/90 px-3 py-2 flex flex-col gap-2 select-none z-20">
      {/* Row 1: Scrubber Track with Visual Shot Cut Markers & Clickable Shot Chips */}
      <div className="flex flex-col gap-1">
        <div className="relative flex items-center w-full h-5">
          {/* Shot Boundary Tick Marks under Scrubber */}
          <div className="absolute inset-x-0 h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden pointer-events-none">
            {score.shots.map((shot) => {
              const leftPct = (shot.startSec / safeDuration) * 100;
              const widthPct =
                ((shot.endSec - shot.startSec) / safeDuration) * 100;
              const isActive = frame.activeShot?.id === shot.id;
              return (
                <div
                  key={shot.id}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                  className={`absolute top-0 bottom-0 border-r border-slate-700/80 transition-colors ${
                    isActive ? 'bg-sky-500/25' : 'bg-slate-800/40'
                  }`}
                />
              );
            })}
            {/* Active Progress Fill */}
            <div
              style={{
                width: `${Math.min(100, (currentSec / safeDuration) * 100)}%`,
              }}
              className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400"
            />
          </div>

          {/* Interactive Range Input Scrubber */}
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.01}
            value={currentSec}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="relative w-full h-5 appearance-none bg-transparent cursor-pointer accent-amber-400 z-10"
            title="Scrub timeline (deterministically reconstructs 3D stage at any timestamp)"
          />
        </div>

        {/* Click-to-Jump Shot Cut Chips */}
        {score.shots.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
            {score.shots.map((shot) => {
              const isActive = frame.activeShot?.id === shot.id;
              return (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => onSeek(shot.startSec)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Jump to Shot ${shot.shotNumber}: ${shot.label} (${shot.startSec.toFixed(1)}s – ${shot.endSec.toFixed(1)}s)`}
                >
                  <span>S{String(shot.shotNumber).padStart(2, '0')}</span>
                  <span className="truncate max-w-[140px]">{shot.label}</span>
                  <span className="text-[9px] opacity-60">
                    {shot.startSec.toFixed(1)}s
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Transport Deck Controls, Playback Rates & 3-Way Camera POV Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Play/Pause, Frame Step `[` `]`, Loop Shot & Timecode */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            title="Restart to 00:00.00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onStepFrames(-1)}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Step 1 Frame Backward (Hotkey: [)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>[</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-3.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
            }`}
            title="Play / Pause (Hotkey: Space)"
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

          <button
            type="button"
            onClick={() => onStepFrames(1)}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-0.5 transition-colors cursor-pointer"
            title="Step 1 Frame Forward (Hotkey: ])"
          >
            <span>]</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleLoopActiveShot}
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              loopActiveShot
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Loop currently active shot"
          >
            <Repeat className="w-3 h-3" />
            <span className="hidden sm:inline">Loop Shot</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          {/* Timecode Readout */}
          <div className="pl-2 font-mono text-xs text-slate-300 flex items-center gap-1">
            <span className="text-sky-300 font-bold">
              {formatTimecode(currentSec)}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-500">
              {formatTimecode(safeDuration)}
            </span>
          </div>
        </div>

        {/* Center: Slow-Motion & Variable Playback Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 font-mono text-[10px]">
          {PLAYBACK_RATES.map((rate) => {
            const active = Math.abs(playbackRate - rate) < 0.01;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => onSetPlaybackRate(rate)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Set playback speed to ${rate}x`}
              >
                {rate}x
              </button>
            );
          })}
        </div>

        {/* Right: 3-Way Camera POV Mode Toggle (Instant Cut) */}
        <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800/90 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => onSetCameraMode('scripted')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              cameraMode === 'scripted'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Scripted Observer View (Driven by timeline while playing; releases to Free Orbit when paused)"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Scripted Observer</span>
          </button>

          <button
            type="button"
            onClick={() => onSetCameraMode('free')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              cameraMode === 'free'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Free Orbit View (Unlocks OrbitControls even during playback)"
          >
            <Orbit className="w-3.5 h-3.5 text-emerald-400" />
            <span>Free Orbit</span>
          </button>

          <button
            type="button"
            onClick={() => onSetCameraMode('stage-pov')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              cameraMode === 'stage-pov'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Stage Camera POV (Instant cut to look directly through the 3D Stage Camera lens)"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Stage Cam POV</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
