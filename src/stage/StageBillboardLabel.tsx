/**
 * Crisp 3D floating billboard badge for actors, props, markers, and the Stage Camera.
 * Evaluates distance-based semantic collapse (full pill <-> glowing accent dot),
 * kind-based opacity hierarchy (camera > focus > character > prop > marker),
 * and priority z-index ranges strictly within the [0, 8] viewport band.
 *
 * Governed by:
 *   - AGENTS.md Invariant 7 (Dual-Tier 60fps Loop: 0 React re-renders in Tier 1).
 *   - Visual Design System §6.3 (Stacking Context Isolation: 3D <Html> z-index < 10).
 *
 * Memoized with deep equality to prevent redundant DOM re-mounts during playback.
 */

import React, { useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  computeBillboardLodMetrics,
  getBillboardZIndexRange,
  type BillboardLabelKind,
} from './labelLodMath';

export interface StageBillboardLabelProps {
  position: [number, number, number];
  label: string;
  sublabel?: string;
  accentColor: string;
  kind?: BillboardLabelKind;
  highlighted?: boolean;
  ghosted?: boolean;
  visible?: boolean;
}

const _tempVec = new THREE.Vector3();

export const StageBillboardLabel: React.FC<StageBillboardLabelProps> = React.memo(
  ({
    position,
    label,
    sublabel,
    accentColor,
    kind = 'character',
    highlighted = false,
    ghosted = false,
    visible = true,
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const pillRef = useRef<HTMLDivElement>(null);
    const dotRef = useRef<HTMLDivElement>(null);
    const camera = useThree((s) => s.camera);

    const lastStyleCacheRef = useRef<{
      pillEl: HTMLDivElement | null;
      dotEl: HTMLDivElement | null;
      pillVisibility: string;
      pillOpacity: string;
      pillTransform: string;
      dotVisibility: string;
      dotOpacity: string;
      dotTransform: string;
    } | null>(null);

    const syncDomStyles = (cam: THREE.Camera) => {
      if (!groupRef.current) return;
      groupRef.current.getWorldPosition(_tempVec);
      const dist = cam.position.distanceTo(_tempVec);
      const metrics = computeBillboardLodMetrics(
        dist,
        kind,
        highlighted,
        ghosted
      );

      const nextPillHidden = !metrics.showPill || metrics.pillOpacity <= 0.001;
      const nextPillVisibility = nextPillHidden ? 'hidden' : 'visible';
      const nextPillOpacity = nextPillHidden
        ? '0'
        : metrics.pillOpacity.toFixed(3);
      const nextPillTransform = nextPillHidden
        ? ''
        : `scale(${metrics.pillScale.toFixed(3)})`;

      const nextDotHidden = !metrics.showDot || metrics.dotOpacity <= 0.001;
      const nextDotVisibility = nextDotHidden ? 'hidden' : 'visible';
      const nextDotOpacity = nextDotHidden
        ? '0'
        : metrics.dotOpacity.toFixed(3);
      const nextDotTransform = nextDotHidden
        ? ''
        : `scale(${metrics.dotScale.toFixed(3)})`;

      const prev = lastStyleCacheRef.current;
      const pill = pillRef.current;
      if (pill) {
        const pillChanged = prev === null || prev.pillEl !== pill;
        if (pillChanged || prev.pillVisibility !== nextPillVisibility) {
          pill.style.visibility = nextPillVisibility;
        }
        if (pillChanged || prev.pillOpacity !== nextPillOpacity) {
          pill.style.opacity = nextPillOpacity;
        }
        if (
          !nextPillHidden &&
          (pillChanged || prev.pillTransform !== nextPillTransform)
        ) {
          pill.style.transform = nextPillTransform;
        }
      }

      const dot = dotRef.current;
      if (dot) {
        const dotChanged = prev === null || prev.dotEl !== dot;
        if (dotChanged || prev.dotVisibility !== nextDotVisibility) {
          dot.style.visibility = nextDotVisibility;
        }
        if (dotChanged || prev.dotOpacity !== nextDotOpacity) {
          dot.style.opacity = nextDotOpacity;
        }
        if (
          !nextDotHidden &&
          (dotChanged || prev.dotTransform !== nextDotTransform)
        ) {
          dot.style.transform = nextDotTransform;
        }
      }

      lastStyleCacheRef.current = {
        pillEl: pill,
        dotEl: dot,
        pillVisibility: nextPillVisibility,
        pillOpacity: nextPillOpacity,
        pillTransform: nextPillTransform,
        dotVisibility: nextDotVisibility,
        dotOpacity: nextDotOpacity,
        dotTransform: nextDotTransform,
      };
    };

    // Synchronous layout effect ensures frame-0 / scrubbed poses style DOM before paint
    useLayoutEffect(() => {
      if (visible) {
        syncDomStyles(camera);
      } else {
        lastStyleCacheRef.current = null;
      }
    });

    // 60fps/144fps imperative DOM mutation loop (0 React re-renders)
    useFrame(({ camera: activeCam }) => {
      if (visible) {
        syncDomStyles(activeCam);
      }
    });

    if (!visible) return null;

    const zIndexRange = getBillboardZIndexRange(kind, highlighted);

    const isHexColor = accentColor.startsWith('#') && accentColor.length === 7;
    const accentBorderColor = isHexColor ? `${accentColor}99` : accentColor;
    const accentShadow = isHexColor
      ? `0 0 14px ${accentColor}44, 0 4px 20px rgba(0, 0, 0, 0.5)`
      : undefined;

    return (
      <group ref={groupRef} position={position}>
        <Html center zIndexRange={zIndexRange}>
          <div className="relative flex items-center justify-center select-none pointer-events-none">
            {/* 1. Full Telemetry / Identity Badge */}
            <div
              ref={pillRef}
              style={{
                transformOrigin: 'center center',
                borderColor: highlighted ? accentBorderColor : undefined,
                boxShadow: highlighted ? accentShadow : undefined,
              }}
              className={`px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md flex items-center gap-2 whitespace-nowrap shadow-2xl border transition-colors duration-200 ${
                highlighted ? '' : 'border-slate-700/80'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-shadow duration-200"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: highlighted
                    ? `0 0 12px ${accentColor}`
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
                <span
                  className={`text-xs font-mono pl-0.5 ${
                    highlighted ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  · {sublabel}
                </span>
              )}
            </div>

            {/* 2. Collapsed Minimal Glowing Accent Dot (Distance Pullback / Crane LOD) */}
            <div
              ref={dotRef}
              style={{
                transformOrigin: 'center center',
                backgroundColor: accentColor,
                boxShadow: highlighted
                  ? `0 0 14px ${accentColor}, 0 0 4px #ffffff`
                  : `0 0 10px ${accentColor}, 0 2px 6px rgba(0, 0, 0, 0.65)`,
              }}
              className="absolute w-2.5 h-2.5 rounded-full border border-white/50 shrink-0 pointer-events-none"
            />
          </div>
        </Html>
      </group>
    );
  },
  (prev, next) =>
    prev.label === next.label &&
    prev.sublabel === next.sublabel &&
    prev.accentColor === next.accentColor &&
    prev.kind === next.kind &&
    Boolean(prev.highlighted) === Boolean(next.highlighted) &&
    Boolean(prev.ghosted) === Boolean(next.ghosted) &&
    Boolean(prev.visible) === Boolean(next.visible) &&
    prev.position[0] === next.position[0] &&
    prev.position[1] === next.position[1] &&
    prev.position[2] === next.position[2]
);
