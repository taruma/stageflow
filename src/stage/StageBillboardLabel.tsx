/**
 * Crisp 3D floating billboard badge for actors, props, and the Stage Camera.
 * Rendered with clamped perspective scaling (1.65x near -> 0.80x far) and
 * prominent HUD-grade typography (14px font-mono, glowing dot), preventing both
 * microscopic text at mid/far distances and giant ballooning close-up.
 * Proximity culling (< 1.2m) smoothly fades out extreme foreground badges.
 * Memoized with deep position equality to prevent redundant DOM re-paints during playback.
 */

import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface StageBillboardLabelProps {
  position: [number, number, number];
  label: string;
  sublabel?: string;
  accentColor: string;
  highlighted?: boolean;
  ghosted?: boolean;
  visible?: boolean;
}

const _tempVec = new THREE.Vector3();

// Clamped perspective scaling constants:
// Dampened square-root falloff curve anchored at 12m reference distance.
const REF_DISTANCE_M = 12.0;
const MIN_PERSPECTIVE_SCALE = 0.80; // Never shrink to an unreadable speck at far pullback (35m+)
const MAX_PERSPECTIVE_SCALE = 1.65; // Never balloon into a giant banner close up (<= 2m)
const PROXIMITY_CULL_M = 1.2;       // Smoothly fade out when camera lens gets within 1.2m

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
    const groupRef = useRef<THREE.Group>(null);
    const badgeRef = useRef<HTMLDivElement>(null);
    const [isTooClose, setIsTooClose] = useState(false);

    // True world-space camera distance check for proximity culling & clamped perspective scaling
    useFrame(({ camera }) => {
      if (!groupRef.current) return;
      groupRef.current.getWorldPosition(_tempVec);
      const dist = camera.position.distanceTo(_tempVec);

      // Proximity culling threshold (< 1.2m)
      const tooClose = dist < PROXIMITY_CULL_M;
      if (tooClose !== isTooClose) {
        setIsTooClose(tooClose);
      }

      // Clamped perspective scaling (60fps direct DOM transform mutation, zero React re-renders)
      if (badgeRef.current) {
        const rawScale = Math.sqrt(REF_DISTANCE_M / Math.max(dist, 1.0));
        const clampedScale = Math.min(
          Math.max(rawScale, MIN_PERSPECTIVE_SCALE),
          MAX_PERSPECTIVE_SCALE
        );
        badgeRef.current.style.transform = `scale(${clampedScale.toFixed(3)})`;
      }
    });

    if (!visible) return null;

    const opacityClass = isTooClose
      ? 'opacity-0 pointer-events-none'
      : ghosted
        ? 'opacity-20'
        : highlighted
          ? 'opacity-100'
          : 'opacity-85';

    return (
      <group ref={groupRef} position={position}>
        <Html center zIndexRange={[40, 0]}>
          <div
            className={`flex flex-col items-center select-none pointer-events-none transition-opacity duration-200 ${opacityClass}`}
          >
            <div
              ref={badgeRef}
              style={{ transformOrigin: 'center center' }}
              className="px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md flex items-center gap-2 whitespace-nowrap shadow-2xl border border-slate-700/80"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-shadow duration-200"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: highlighted
                    ? `0 0 10px ${accentColor}`
                    : `0 0 4px ${accentColor}88`,
                }}
              />
              <span
                className={`text-sm font-mono tracking-tight ${
                  highlighted
                    ? 'font-bold text-white'
                    : 'font-semibold text-slate-100'
                }`}
              >
                {label}
              </span>
              {sublabel && (
                <span className="text-xs font-mono text-slate-400 pl-0.5">
                  · {sublabel}
                </span>
              )}
            </div>
          </div>
        </Html>
      </group>
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
