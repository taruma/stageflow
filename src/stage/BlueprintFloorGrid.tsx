/**
 * Minimalist Blueprint Architectural Floor Grid & Compass Reference.
 * 1 unit = 1 meter. Y = 0 is the stage floor plane.
 */

import React, { useMemo } from 'react';
import { Grid, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

export interface BlueprintFloorGridProps {
  width: number;
  depth: number;
  gridStep: number;
  showLabels?: boolean;
}

export const BlueprintFloorGrid: React.FC<BlueprintFloorGridProps> = ({
  width,
  depth,
  gridStep,
  showLabels = true,
}) => {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  // Perimeter stage boundary rectangle
  const borderPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [-halfW, 0.005, -halfD],
      [halfW, 0.005, -halfD],
      [halfW, 0.005, halfD],
      [-halfW, 0.005, halfD],
      [-halfW, 0.005, -halfD],
    ],
    [halfW, halfD]
  );

  // Origin center crosshairs (X and Z axes)
  const xAxisPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [-halfW, 0.006, 0],
      [halfW, 0.006, 0],
    ],
    [halfW]
  );
  const zAxisPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [0, 0.006, -halfD],
      [0, 0.006, halfD],
    ],
    [halfD]
  );

  const ringGeom = useMemo(
    () => new THREE.RingGeometry(0.18, 0.21, 32),
    []
  );

  return (
    <group>
      {/* Subtle dark matte ground floor to anchor shadows/grids */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[width * 2.4, depth * 2.4]} />
        <meshBasicMaterial color="#050811" transparent opacity={0.92} />
      </mesh>

      {/* Dual-cadence precision metric grid (1m major, 0.25m minor) */}
      <Grid
        position={[0, 0, 0]}
        args={[width, depth]}
        cellSize={gridStep * 0.25}
        cellThickness={0.5}
        cellColor="#0f172a"
        sectionSize={gridStep}
        sectionThickness={1.1}
        sectionColor="#1e293b"
        fadeDistance={28}
        fadeStrength={1.2}
        infiniteGrid
      />

      {/* Active Stage Perimeter Frame */}
      <Line
        points={borderPoints}
        color="#38bdf8"
        lineWidth={1.2}
        transparent
        opacity={0.35}
      />

      {/* Center X & Z Axis Guides */}
      <Line
        points={xAxisPoints}
        color="#38bdf8"
        lineWidth={1}
        transparent
        opacity={0.2}
      />
      <Line
        points={zAxisPoints}
        color="#38bdf8"
        lineWidth={1}
        transparent
        opacity={0.2}
      />

      {/* Origin (0,0,0) Center Reticle */}
      <mesh
        geometry={ringGeom}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
      >
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cardinal Stage Orientation Markers */}
      {showLabels && (
        <>
          <Html
            position={[0, 0.02, halfD + 0.45]}
            center
            distanceFactor={12}
            zIndexRange={[10, 0]}
          >
            <div className="px-2 py-0.5 rounded-full bg-slate-950/65 backdrop-blur-sm text-[8px] font-mono text-sky-400/80 tracking-widest uppercase select-none pointer-events-none whitespace-nowrap">
              +Z · Downstage / Front
            </div>
          </Html>

          <Html
            position={[0, 0.02, -halfD - 0.45]}
            center
            distanceFactor={12}
            zIndexRange={[10, 0]}
          >
            <div className="px-2 py-0.5 rounded-full bg-slate-950/65 backdrop-blur-sm text-[8px] font-mono text-slate-500 tracking-widest uppercase select-none pointer-events-none whitespace-nowrap">
              -Z · Upstage / Back
            </div>
          </Html>
        </>
      )}
    </group>
  );
};
