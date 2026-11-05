/**
 * Resizable Split Workspace Container.
 * Side-by-side on desktop (`lg+`) with a smooth draggable divider bar,
 * collapsing to stacked top/bottom on narrow viewports.
 * Enforces SceneFlow 60fps drag performance with .is-resizing-split.
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
  const [videoWidthPct, setVideoWidthPct] = useState<number>(30);
  const lastSplitWidthRef = useRef<number>(30);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  // Sync percentage whenever a header preset is clicked
  useEffect(() => {
    if (splitPreset === 'split') {
      setVideoWidthPct(lastSplitWidthRef.current > 1 ? lastSplitWidthRef.current : 30);
    } else if (splitPreset === 'full') {
      setVideoWidthPct(0);
    }
  }, [splitPreset]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;

    if (typeof document !== 'undefined') {
      document.body.classList.add('is-resizing-split');
    }

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPct = Math.max(18, Math.min(82, rawPct));
      setVideoWidthPct(clampedPct);
      lastSplitWidthRef.current = clampedPct;
      onCustomDragSplit();
    };

    const handlePointerUp = () => {
      setIsDraggingDivider(false);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('is-resizing-split');
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('is-resizing-split');
      }
    };
  }, [isDraggingDivider, onCustomDragSplit]);

  const isVideoHidden = videoWidthPct <= 1;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden bg-app"
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
            : 'w-full h-[38%] lg:h-full lg:w-[var(--video-pct)] shrink-0 flex flex-col bg-surface border-b lg:border-b-0 border-border-main overflow-hidden'
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
              ? 'bg-text-main'
              : 'bg-surface-subtle hover:bg-surface-hover border-x border-border-main'
          }`}
          title="Drag to resize Video and 3D Diorama panels"
        >
          <GripVertical className="w-3.5 h-3.5 text-text-faint" />
        </div>
      )}

      {/* Right / Bottom: 3D Blueprint Diorama Viewport */}
      <div className="flex-1 min-w-0 min-h-0 h-full relative overflow-hidden bg-app isolate">
        {rightStagePane}
      </div>
    </div>
  );
};
