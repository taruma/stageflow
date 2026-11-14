/**
 * Visual track, shot cut ticks, selected range bar, hover hairline, and
 * dual Start/End slider thumbs for `ExportRangeScrubber`.
 */

import React from 'react';
import type { ScrubberHandle, ScrubberVisualState } from '../core/exportScrubberMath';
import type { ShotCue } from '../core/types';

export interface ExportRangeScrubberTrackProps {
  trackRef: React.RefObject<HTMLDivElement | null>;
  shots: ShotCue[];
  visuals: ScrubberVisualState;
  hoverSec: number | null;
  activeHandle: ScrubberHandle | null;
  lastHandle: ScrubberHandle;
  isInvalidVisual: boolean;
  onTrackPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTrackPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTrackPointerEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTrackPointerLeave: () => void;
  onBeginThumbDrag: (
    e: React.PointerEvent<HTMLElement>,
    handle: ScrubberHandle
  ) => void;
  onThumbKeyDown: (
    handle: ScrubberHandle,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => void;
}

interface ThumbSpec {
  handle: ScrubberHandle;
  ariaLabel: string;
  valueNow: number;
  thumbPct: number;
  ringClass: string;
  validColorClass: string;
}

export const ExportRangeScrubberTrack: React.FC<ExportRangeScrubberTrackProps> = ({
  trackRef,
  shots,
  visuals,
  hoverSec,
  activeHandle,
  lastHandle,
  isInvalidVisual,
  onTrackPointerDown,
  onTrackPointerMove,
  onTrackPointerEnd,
  onTrackPointerLeave,
  onBeginThumbDrag,
  onThumbKeyDown,
}) => {
  const thumbs: ThumbSpec[] = [
    {
      handle: 'start',
      ariaLabel: 'Export start time in seconds',
      valueNow: visuals.safeStartSec,
      thumbPct: visuals.startThumbPct,
      ringClass: 'focus:ring-amber-500/50',
      validColorClass: 'bg-amber-500 border-white text-white',
    },
    {
      handle: 'end',
      ariaLabel: 'Export end time in seconds',
      valueNow: visuals.safeEndSec,
      thumbPct: visuals.endThumbPct,
      ringClass: 'focus:ring-emerald-500/50',
      validColorClass: 'bg-emerald-500 border-white text-white',
    },
  ];

  return (
    <div
      ref={trackRef}
      onPointerDown={onTrackPointerDown}
      onPointerMove={onTrackPointerMove}
      onPointerUp={onTrackPointerEnd}
      onPointerCancel={onTrackPointerEnd}
      onPointerLeave={onTrackPointerLeave}
      className="relative flex items-center w-full h-6 select-none touch-none cursor-pointer"
      title="Drag Start or End handle to set export range"
    >
      {/* Track Background + Shot Cut Ticks */}
      <div className="absolute inset-x-0 h-2.5 rounded-full bg-surface-muted border border-border-main overflow-hidden pointer-events-none">
        {shots.map((shot, idx) => {
          const leftPct = (shot.startSec / visuals.safeDuration) * 100;
          const widthPct =
            ((shot.endSec - shot.startSec) / visuals.safeDuration) * 100;
          return (
            <div
              key={shot.id}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              className={`absolute top-0 bottom-0 ${
                idx % 2 === 0 ? 'bg-surface-hover/35' : 'bg-transparent'
              }`}
            />
          );
        })}

        {/* Selected Range Fill Bar */}
        <div
          style={{
            left: `${visuals.rangeLeftPct}%`,
            width: `${visuals.rangeWidthPct}%`,
          }}
          className={`absolute top-0 bottom-0 transition-colors ${
            isInvalidVisual
              ? 'bg-red-500/25 border-y border-red-500/70'
              : 'bg-gradient-to-r from-amber-500/45 via-amber-500/35 to-emerald-500/45 border-y border-amber-500/80'
          }`}
        />

        {/* Razor Cut Dividers */}
        {shots.map((shot) => {
          if (
            shot.startSec <= 0.05 ||
            shot.startSec >= visuals.safeDuration - 0.05
          ) {
            return null;
          }
          const pct = (shot.startSec / visuals.safeDuration) * 100;
          return (
            <div
              key={`cut-${shot.id}`}
              style={{ left: `${pct}%` }}
              className="absolute top-0 bottom-0 w-[1.5px] -translate-x-1/2 bg-text-faint/70 dark:bg-text-muted/60"
            />
          );
        })}
      </div>

      {/* Hover Hairline */}
      {hoverSec != null && (
        <div
          style={{ left: `${(hoverSec / visuals.safeDuration) * 100}%` }}
          className="absolute top-0.5 bottom-0.5 w-px bg-amber-400/90 pointer-events-none z-10"
        />
      )}

      {/* Start & End Thumbs */}
      {thumbs.map((thumb) => {
        const isFront =
          lastHandle === thumb.handle || activeHandle === thumb.handle;
        const isDragging = activeHandle === thumb.handle;
        return (
          <div
            key={thumb.handle}
            role="slider"
            tabIndex={0}
            aria-label={thumb.ariaLabel}
            aria-valuemin={0}
            aria-valuemax={visuals.safeDuration}
            aria-valuenow={thumb.valueNow}
            style={{ left: `${thumb.thumbPct}%` }}
            onPointerDown={(e) => onBeginThumbDrag(e, thumb.handle)}
            onKeyDown={(e) => onThumbKeyDown(thumb.handle, e)}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-5 rounded-md border shadow-sm flex items-center justify-center transition-transform cursor-ew-resize focus:outline-none focus:ring-2 ${thumb.ringClass} ${
              isFront ? 'z-30' : 'z-20'
            } ${isDragging ? 'scale-110' : 'hover:scale-105'} ${
              isInvalidVisual
                ? 'bg-red-500 border-white text-white'
                : thumb.validColorClass
            }`}
          >
            <span className="w-0.5 h-2.5 rounded-full bg-white/90" />
          </div>
        );
      })}
    </div>
  );
};
