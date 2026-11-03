/**
 * Crisp 3D floating billboard badge for actors, props, and the Stage Camera.
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
}

export const StageBillboardLabel: React.FC<StageBillboardLabelProps> = React.memo(
  ({
    position,
    label,
    sublabel,
    accentColor,
    highlighted = false,
  }) => {
    return (
      <Html
        position={position}
        center
        distanceFactor={9}
        zIndexRange={[40, 0]}
      >
        <div
          className={`flex flex-col items-center select-none pointer-events-none transition-transform duration-150 ${
            highlighted ? 'scale-105' : ' opacity-90'
          }`}
        >
          <div
            className="px-2 py-0.5 rounded-md bg-slate-950/90 backdrop-blur-md border shadow-lg flex items-center gap-1.5 whitespace-nowrap"
            style={{
              borderColor: highlighted ? accentColor : `${accentColor}55`,
              boxShadow: highlighted ? `0 0 12px ${accentColor}33` : undefined,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-[10px] font-mono font-semibold text-slate-100 tracking-tight">
              {label}
            </span>
            {sublabel && (
              <span className="text-[9px] font-mono text-slate-400 border-l border-slate-800 pl-1.5">
                {sublabel}
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
    prev.position[0] === next.position[0] &&
    prev.position[1] === next.position[1] &&
    prev.position[2] === next.position[2]
);
