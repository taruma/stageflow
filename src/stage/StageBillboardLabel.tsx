/**
 * Crisp 3D floating billboard badge for actors, props, and the Stage Camera.
 * Rendered as an ultra-compact borderless micro-pill with selective playback ghosting.
 * Memoized with deep position equality to prevent redundant DOM re-paints during playback.
 */

import React from 'react';
import { Html } from '@react-three/drei';

export interface StageBillboardLabelProps {
  position: [number, number, number];
  label: string;
  sublabel?: string;
  accentColor: string;
  highlighted?: boolean;
  ghosted?: boolean;
  visible?: boolean;
}

export const StageBillboardLabel: React.FC<StageBillboardLabelProps> = React.memo(
  ({
    position,
    label,
    sublabel,
    accentColor,
    highlighted = false,
    ghosted = false,
    visible = true,
  }) => {
    if (!visible) return null;

    const opacityClass = ghosted
      ? 'opacity-20'
      : highlighted
        ? 'opacity-100'
        : 'opacity-75';

    return (
      <Html
        position={position}
        center
        distanceFactor={9}
        zIndexRange={[40, 0]}
      >
        <div
          className={`flex flex-col items-center select-none pointer-events-none transition-opacity duration-200 ${opacityClass}`}
        >
          <div className="px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-sm flex items-center gap-1 whitespace-nowrap">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 transition-shadow duration-200"
              style={{
                backgroundColor: accentColor,
                boxShadow: highlighted ? `0 0 6px ${accentColor}` : undefined,
              }}
            />
            <span
              className={`text-[9px] font-mono tracking-tight ${
                highlighted
                  ? 'font-semibold text-slate-100'
                  : 'font-medium text-slate-300'
              }`}
            >
              {label}
            </span>
            {sublabel && (
              <span className="text-[8px] font-mono text-slate-400/90 pl-1">
                · {sublabel}
              </span>
            )}
          </div>
        </div>
      </Html>
    );
  },
  (prev, next) =>
    prev.label === next.label &&
    prev.sublabel === next.sublabel &&
    prev.accentColor === next.accentColor &&
    Boolean(prev.highlighted) === Boolean(next.highlighted) &&
    Boolean(prev.ghosted) === Boolean(next.ghosted) &&
    Boolean(prev.visible) === Boolean(next.visible) &&
    prev.position[0] === next.position[0] &&
    prev.position[1] === next.position[1] &&
    prev.position[2] === next.position[2]
);
