/**
 * Directorial Shot Chips Strip Component.
 * Features:
 *   - Auto-centering active shot chip on cut boundaries
 *   - Smooth free-scrolling with trackpad/mouse-wheel to peek forward/backward
 *   - Edge fade masks indicating off-screen shots without an intrusive scrollbar
 *   - Directorial jump-to-shot interaction
 */

import React, { useEffect, useRef } from 'react';
import type { ShotCue } from '../../core/types';

export interface DirectorialShotChipsStripProps {
  shots: ShotCue[];
  activeShotId: string | null;
  onSeek: (startSec: number) => void;
}

export const DirectorialShotChipsStrip: React.FC<
  DirectorialShotChipsStripProps
> = ({ shots, activeShotId, onSeek }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  // Smoothly center the active shot chip whenever activeShotId changes
  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeShotId]);

  if (!shots || shots.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* Scrollable Chip Row with Edge Fades & Hidden Raw Scrollbars */}
      <div
        ref={containerRef}
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)',
        }}
        className="flex items-center gap-1.5 overflow-x-auto px-6 py-0.5 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shots.map((shot) => {
          const isActive = activeShotId === shot.id;
          const cleanLabel =
            shot.label.replace(/^Shot\s*\d+\s*[·:–-]\s*/i, '').trim() ||
            shot.label;

          return (
            <button
              key={shot.id}
              ref={isActive ? activeChipRef : undefined}
              type="button"
              onClick={() => onSeek(shot.startSec)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-btn-primary-bg text-btn-primary-text border-btn-primary-bg font-semibold shadow-xs'
                  : 'bg-surface hover:bg-surface-subtle border-border-main text-text-muted hover:text-text-main shadow-2xs'
              }`}
              title={`Jump to Shot #${String(shot.shotNumber).padStart(2, '0')}: ${cleanLabel} (${shot.startSec.toFixed(1)}s – ${shot.endSec.toFixed(1)}s)`}
            >
              <span className="font-bold">
                #{String(shot.shotNumber).padStart(2, '0')}
              </span>
              <span className="truncate max-w-[150px]">{cleanLabel}</span>
              <span className="text-[9px] opacity-70">
                {shot.startSec.toFixed(1)}s
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
