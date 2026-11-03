/**
 * Resizable Split Workspace Container.
 * Side-by-side on desktop (`lg+`) with a smooth draggable divider bar,
 * collapsing to stacked top/bottom on narrow viewports.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import type { SplitPreset } from './WorkspaceHeader';

export interface ResizableSplitWorkspaceProps {
  splitPreset: SplitPreset;
  onCustomDragSplit: () => void;
  leftVideoPane: React.ReactNode;
  rightStagePane: React.ReactNode;
}

export const ResizableSplitWorkspace: React.FC<
  ResizableSplitWorkspaceProps
> = ({ splitPreset, onCustomDragSplit, leftVideoPane, rightStagePane }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videoWidthPct, setVideoWidthPct] = useState<number>(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  // Sync percentage whenever a header preset is clicked
  useEffect(() => {
    if (splitPreset === '50-50') setVideoWidthPct(50);
    else if (splitPreset === '30-70') setVideoWidthPct(32);
    else if (splitPreset === '70-30') setVideoWidthPct(68);
    else if (splitPreset === '0-100') setVideoWidthPct(0);
  }, [splitPreset]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPct = Math.max(18, Math.min(82, rawPct));
      setVideoWidthPct(clampedPct);
      onCustomDragSplit();
    };

    const handlePointerUp = () => {
      setIsDraggingDivider(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingDivider, onCustomDragSplit]);

  const isVideoHidden = videoWidthPct <= 1;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden bg-[#050811]"
    >
      {/* Left / Top: Reference Video Viewport (Continuously mounted so media clock & audio never pause or reset) */}
      <div
        style={
          isVideoHidden
            ? undefined
            : ({ '--video-pct': `${videoWidthPct}%` } as React.CSSProperties)
        }
        className={
          isVideoHidden
            ? 'fixed -left-[99999px] top-0 w-[320px] h-[180px] opacity-0 pointer-events-none overflow-hidden -z-50'
            : 'w-full h-[38%] lg:h-full lg:w-[var(--video-pct)] shrink-0 flex flex-col bg-[#070b16] border-b lg:border-b-0 border-slate-800/80 overflow-hidden'
        }
        aria-hidden={isVideoHidden}
      >
        {leftVideoPane}
      </div>

      {/* Draggable Split Divider Bar (Desktop lg+) */}
      {!isVideoHidden && (
        <div
          onPointerDown={handlePointerDown}
          className={`hidden lg:flex w-2 shrink-0 items-center justify-center cursor-col-resize select-none transition-colors z-10 ${
            isDraggingDivider
              ? 'bg-sky-500/40'
              : 'bg-slate-900/90 hover:bg-sky-500/25 border-x border-slate-800/90'
          }`}
          title="Drag to resize Video and 3D Diorama panels"
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-500" />
        </div>
      )}

      {/* Right / Bottom: 3D Blueprint Diorama Viewport */}
      <div className="flex-1 min-w-0 min-h-0 h-full relative overflow-hidden">
        {rightStagePane}
      </div>
    </div>
  );
};
