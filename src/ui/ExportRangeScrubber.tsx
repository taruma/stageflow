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
  parseScrubberSecondsInput,
  pickNearestScrubberHandle,
  type ScrubberHandle,
} from '../core/exportScrubberMath';
import type { ShotCue } from '../core/types';
import { ExportRangeScrubberTrack } from './ExportRangeScrubberTrack';
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

  const parsedStart = parseScrubberSecondsInput(customStartInput);
  const parsedEnd = parseScrubberSecondsInput(customEndInput);
  const minSpanSec = useMemo(() => computeMinScrubberSpanSec(fps), [fps]);
  const visuals = useMemo(
    () => computeScrubberVisualState(parsedStart, parsedEnd, sceneDurationSec),
    [parsedStart, parsedEnd, sceneDurationSec]
  );

  const pointerClientXToSec = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * visuals.safeDuration;
    },
    [visuals.safeDuration]
  );

  const applyHandleAtSec = useCallback(
    (handle: ScrubberHandle, targetSec: number) => {
      const next = applyScrubberHandleChange(
        handle, targetSec, visuals.safeStartSec, visuals.safeEndSec, visuals.safeDuration, minSpanSec, DRAG_STEP_SEC
      );
      onChangeRangeInputs(formatScrubberSecondsInput(next.startSec), formatScrubberSecondsInput(next.endSec));
    },
    [minSpanSec, onChangeRangeInputs, visuals.safeDuration, visuals.safeEndSec, visuals.safeStartSec]
  );

  const beginDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>, handle: ScrubberHandle, jumpSec?: number) => {
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
      if (jumpSec !== undefined) applyHandleAtSec(handle, jumpSec);
    },
    [applyHandleAtSec, pointerClientXToSec]
  );

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pointerSec = pointerClientXToSec(e.clientX);
      const nearest = pickNearestScrubberHandle(pointerSec, visuals.safeStartSec, visuals.safeEndSec, visuals.safeDuration);
      beginDrag(e, nearest, pointerSec);
    },
    [beginDrag, pointerClientXToSec, visuals.safeDuration, visuals.safeEndSec, visuals.safeStartSec]
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
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      setHoverSec(null);
    }
  }, []);

  const handleTrackPointerLeave = useCallback(() => {
    if (!dragRef.current) setHoverSec(null);
  }, []);

  const handleThumbKeyDown = useCallback(
    (handle: ScrubberHandle, e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const currentVal = handle === 'start' ? visuals.safeStartSec : visuals.safeEndSec;
      setLastHandle(handle);
      applyHandleAtSec(handle, currentVal + dir * DRAG_STEP_SEC);
    },
    [applyHandleAtSec, visuals.safeEndSec, visuals.safeStartSec]
  );

  const inspectedShot = useMemo(() => {
    if (hoverSec == null) return null;
    return shots.find((s) => hoverSec >= s.startSec && hoverSec < s.endSec) ?? shots[shots.length - 1] ?? null;
  }, [shots, hoverSec]);

  const isInvalidVisual = Boolean(customRangeError) || visuals.isInverted;
  const inputErrorClass = customRangeError ? 'border-red-500/60 focus:ring-red-500/20' : '';
  const renderTimeInput = (value: string, onChange: (next: string) => void, ariaLabel: string, alignRight = false) => (
    <div className="w-20">
      <input
        type="number"
        step="0.1"
        min={0}
        max={sceneDurationSec}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`${UI_TOKENS.input.numberBox} text-xs px-2 py-1 ${alignRight ? 'text-right' : ''} ${inputErrorClass}`}
      />
    </div>
  );

  return (
    <div
      className="pt-1 space-y-2 rounded-xl bg-surface-subtle/70 border border-border-subtle px-3 py-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <ExportRangeScrubberTrack
        trackRef={trackRef}
        shots={shots}
        visuals={visuals}
        hoverSec={hoverSec}
        activeHandle={activeHandle}
        lastHandle={lastHandle}
        isInvalidVisual={isInvalidVisual}
        onTrackPointerDown={handleTrackPointerDown}
        onTrackPointerMove={handleTrackPointerMove}
        onTrackPointerEnd={endDrag}
        onTrackPointerLeave={handleTrackPointerLeave}
        onBeginThumbDrag={beginDrag}
        onThumbKeyDown={handleThumbKeyDown}
      />

      {/* Compact Inline Start / Readout / End Row */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 shrink-0">
          <span className={`${UI_TOKENS.input.labelMini} text-amber-600 dark:text-amber-400`}>Start</span>
          {renderTimeInput(customStartInput, onChangeCustomStartInput, 'Custom start time in seconds')}
        </label>

        <div className="min-w-0 flex-1 text-center text-[10px] font-mono text-text-muted truncate px-1">
          {hoverSec != null ? (
            <span className="text-text-body">
              <span className="font-bold text-amber-500">{formatTimecode(hoverSec)}</span>
              {inspectedShot && <span> · #{String(inspectedShot.shotNumber).padStart(2, '0')}</span>}
            </span>
          ) : (
            <span>
              {formatTimecode(visuals.safeStartSec)} → {formatTimecode(visuals.safeEndSec)}
            </span>
          )}
        </div>

        <label className="flex items-center gap-1.5 shrink-0">
          {renderTimeInput(customEndInput, onChangeCustomEndInput, 'Custom end time in seconds', true)}
          <span className={`${UI_TOKENS.input.labelMini} text-emerald-600 dark:text-emerald-400`}>End</span>
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
