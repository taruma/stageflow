/**
 * Simple dual-handle timeline range scrubber with compact inline numeric
 * Start / End inputs for custom MP4 export windows.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ExportFps } from '../core/exportMath';
import {
  applyScrubberHandleChange,
  computeMinScrubberSpanSec,
  computeScrubberVisualState,
  formatScrubberSecondsInput,
  pickNearestScrubberHandle,
  type ScrubberHandle,
} from '../core/exportScrubberMath';
import type { ShotCue } from '../core/types';
import { formatTimecode } from './transport/DirectorialTimelineTrack';
import { UI_TOKENS } from './tokens/ui';

export interface ExportRangeScrubberProps {
  shots: ShotCue[];
  sceneDurationSec: number;
  fps: ExportFps;
  customStartInput: string;
  customEndInput: string;
  onChangeRangeInputs: (startInput: string, endInput: string) => void;
  onChangeCustomStartInput: (value: string) => void;
  onChangeCustomEndInput: (value: string) => void;
  customRangeError: string | null;
}

interface ActiveDragState {
  handle: ScrubberHandle;
  pointerId: number;
}

const DRAG_STEP_SEC = 0.1;

function parseInputSec(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export const ExportRangeScrubber: React.FC<ExportRangeScrubberProps> = ({
  shots,
  sceneDurationSec,
  fps,
  customStartInput,
  customEndInput,
  onChangeRangeInputs,
  onChangeCustomStartInput,
  onChangeCustomEndInput,
  customRangeError,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<ActiveDragState | null>(null);
  const [activeHandle, setActiveHandle] = useState<ScrubberHandle | null>(null);
  const [lastHandle, setLastHandle] = useState<ScrubberHandle>('end');
  const [hoverSec, setHoverSec] = useState<number | null>(null);

  const parsedStart = parseInputSec(customStartInput);
  const parsedEnd = parseInputSec(customEndInput);
  const minSpanSec = useMemo(() => computeMinScrubberSpanSec(fps), [fps]);

  const visuals = useMemo(
    () => computeScrubberVisualState(parsedStart, parsedEnd, sceneDurationSec),
    [parsedStart, parsedEnd, sceneDurationSec]
  );

  const pointerClientXToSec = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * visuals.safeDuration;
    },
    [visuals.safeDuration]
  );

  const applyHandleAtSec = useCallback(
    (handle: ScrubberHandle, targetSec: number) => {
      const next = applyScrubberHandleChange(
        handle,
        targetSec,
        visuals.safeStartSec,
        visuals.safeEndSec,
        visuals.safeDuration,
        minSpanSec,
        DRAG_STEP_SEC
      );
      onChangeRangeInputs(
        formatScrubberSecondsInput(next.startSec),
        formatScrubberSecondsInput(next.endSec)
      );
    },
    [
      minSpanSec,
      onChangeRangeInputs,
      visuals.safeDuration,
      visuals.safeEndSec,
      visuals.safeStartSec,
    ]
  );

  const beginDrag = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      handle: ScrubberHandle,
      jumpSec?: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const track = trackRef.current;
      if (!track) return;

      track.setPointerCapture(e.pointerId);
      setLastHandle(handle);
      setActiveHandle(handle);
      dragRef.current = { handle, pointerId: e.pointerId };

      const pointerSec = jumpSec ?? pointerClientXToSec(e.clientX);
      setHoverSec(pointerSec);
      if (jumpSec !== undefined) {
        applyHandleAtSec(handle, jumpSec);
      }
    },
    [applyHandleAtSec, pointerClientXToSec]
  );

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pointerSec = pointerClientXToSec(e.clientX);
      const nearest = pickNearestScrubberHandle(
        pointerSec,
        visuals.safeStartSec,
        visuals.safeEndSec,
        visuals.safeDuration
      );
      beginDrag(e, nearest, pointerSec);
    },
    [
      beginDrag,
      pointerClientXToSec,
      visuals.safeDuration,
      visuals.safeEndSec,
      visuals.safeStartSec,
    ]
  );

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pointerSec = pointerClientXToSec(e.clientX);
      setHoverSec(pointerSec);

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      applyHandleAtSec(drag.handle, pointerSec);
    },
    [applyHandleAtSec, pointerClientXToSec]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (trackRef.current?.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setActiveHandle(null);
  }, []);

  const handleThumbKeyDown = useCallback(
    (handle: ScrubberHandle, e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const currentVal =
        handle === 'start' ? visuals.safeStartSec : visuals.safeEndSec;
      setLastHandle(handle);
      applyHandleAtSec(handle, currentVal + dir * DRAG_STEP_SEC);
    },
    [applyHandleAtSec, visuals.safeEndSec, visuals.safeStartSec]
  );

  const inspectedShot = useMemo(() => {
    if (hoverSec == null) return null;
    return (
      shots.find((s) => hoverSec >= s.startSec && hoverSec < s.endSec) ??
      shots[shots.length - 1] ??
      null
    );
  }, [shots, hoverSec]);

  const isInvalidVisual = Boolean(customRangeError) || visuals.isInverted;

  return (
    <div
      className="pt-1 space-y-2 rounded-xl bg-surface-subtle/70 border border-border-subtle px-3 py-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dual-Handle Timeline Scrubber (Drag Only) */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (!dragRef.current) setHoverSec(null);
        }}
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

        {/* Start Thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Export start time in seconds"
          aria-valuemin={0}
          aria-valuemax={visuals.safeDuration}
          aria-valuenow={visuals.safeStartSec}
          style={{ left: `${visuals.startThumbPct}%` }}
          onPointerDown={(e) => beginDrag(e, 'start')}
          onKeyDown={(e) => handleThumbKeyDown('start', e)}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-5 rounded-md border shadow-sm flex items-center justify-center transition-transform cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
            lastHandle === 'start' || activeHandle === 'start' ? 'z-30' : 'z-20'
          } ${
            activeHandle === 'start' ? 'scale-110' : 'hover:scale-105'
          } ${
            isInvalidVisual
              ? 'bg-red-500 border-white text-white'
              : 'bg-amber-500 border-white text-white'
          }`}
        >
          <span className="w-0.5 h-2.5 rounded-full bg-white/90" />
        </div>

        {/* End Thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Export end time in seconds"
          aria-valuemin={0}
          aria-valuemax={visuals.safeDuration}
          aria-valuenow={visuals.safeEndSec}
          style={{ left: `${visuals.endThumbPct}%` }}
          onPointerDown={(e) => beginDrag(e, 'end')}
          onKeyDown={(e) => handleThumbKeyDown('end', e)}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-5 rounded-md border shadow-sm flex items-center justify-center transition-transform cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            lastHandle === 'end' || activeHandle === 'end' ? 'z-30' : 'z-20'
          } ${
            activeHandle === 'end' ? 'scale-110' : 'hover:scale-105'
          } ${
            isInvalidVisual
              ? 'bg-red-500 border-white text-white'
              : 'bg-emerald-500 border-white text-white'
          }`}
        >
          <span className="w-0.5 h-2.5 rounded-full bg-white/90" />
        </div>
      </div>

      {/* Compact Inline Start / Readout / End Row */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 shrink-0">
          <span className={`${UI_TOKENS.input.labelMini} text-amber-600 dark:text-amber-400`}>
            Start
          </span>
          <div className="w-20">
            <input
              type="number"
              step="0.1"
              min={0}
              max={sceneDurationSec}
              value={customStartInput}
              onChange={(e) => onChangeCustomStartInput(e.target.value)}
              aria-label="Custom start time in seconds"
              className={`${UI_TOKENS.input.numberBox} text-xs px-2 py-1 ${
                customRangeError
                  ? 'border-red-500/60 focus:ring-red-500/20'
                  : ''
              }`}
            />
          </div>
        </label>

        <div className="min-w-0 flex-1 text-center text-[10px] font-mono text-text-muted truncate px-1">
          {hoverSec != null ? (
            <span className="text-text-body">
              <span className="font-bold text-amber-500">
                {formatTimecode(hoverSec)}
              </span>
              {inspectedShot && (
                <span>
                  {' '}
                  · #{String(inspectedShot.shotNumber).padStart(2, '0')}
                </span>
              )}
            </span>
          ) : (
            <span>
              {formatTimecode(visuals.safeStartSec)} →{' '}
              {formatTimecode(visuals.safeEndSec)}
            </span>
          )}
        </div>

        <label className="flex items-center gap-1.5 shrink-0">
          <div className="w-20">
            <input
              type="number"
              step="0.1"
              min={0}
              max={sceneDurationSec}
              value={customEndInput}
              onChange={(e) => onChangeCustomEndInput(e.target.value)}
              aria-label="Custom end time in seconds"
              className={`${UI_TOKENS.input.numberBox} text-xs px-2 py-1 text-right ${
                customRangeError
                  ? 'border-red-500/60 focus:ring-red-500/20'
                  : ''
              }`}
            />
          </div>
          <span className={`${UI_TOKENS.input.labelMini} text-emerald-600 dark:text-emerald-400`}>
            End
          </span>
        </label>
      </div>

      {customRangeError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] font-sans text-red-600 dark:text-red-400"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{customRangeError}</span>
        </div>
      )}
    </div>
  );
};
