/**
 * Directional Minimalist Mannequin & Prop Proxy Component.
 * Features:
 *   - Stylized geometric figure (torso capsule + head sphere)
 *   - Luminous directional facing visor wedge + ground chevron arrow (+Z local forward)
 *   - Ground contact shadow ring
 *   - Floating identity badge
 *   - Dynamic floor movement trail when moving across a shot
 *   - Gated cut synchronization across shot boundaries
 */

import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type {
  CameraViewMode,
  EvaluatedEntityState,
  LabelDisplayMode,
  StageFrame,
} from '../core/types';
import { StageBillboardLabel } from './StageBillboardLabel';

export interface DirectionalMannequinProps {
  entityId: string;
  initialState: EvaluatedEntityState;
  frameRef: React.RefObject<StageFrame>;
  uiFrame?: StageFrame;
  labelMode?: LabelDisplayMode;
  isPlaying?: boolean;
  cameraMode?: CameraViewMode;
}

export const DirectionalMannequin: React.FC<DirectionalMannequinProps> = ({
  entityId,
  initialState,
  frameRef,
  uiFrame,
  labelMode = 'all',
  isPlaying = false,
  cameraMode,
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const { def, highlighted, trailPoints } = initialState;
  const color = def.color;
  const height = def.height;
  const radius = def.radius;

  // Helper to get synchronized live entity state
  const getSynchronizedEntity = (liveFrame: StageFrame | null) => {
    if (!liveFrame) return initialState;

    const isShotDesynced =
      uiFrame !== undefined &&
      Boolean(liveFrame.activeShot?.id) &&
      Boolean(uiFrame.activeShot?.id) &&
      liveFrame.activeShot?.id !== uiFrame.activeShot?.id;

    if (isShotDesynced) {
      return initialState;
    }

    return liveFrame.entitiesById.get(entityId) ?? initialState;
  };

  // Ensure synchronous pre-paint alignment so React reconciler never resets 60fps transform
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const entity = getSynchronizedEntity(frameRef.current);
    groupRef.current.visible = entity.visible;
    groupRef.current.position.set(
      entity.position.x,
      entity.position.y,
      entity.position.z
    );
    groupRef.current.rotation.set(0, entity.rotationYRad, 0);
  });

  // Imperatively sync 3D position and facing rotation at 60fps
  useFrame(() => {
    if (!groupRef.current) return;
    const entity = getSynchronizedEntity(frameRef.current);

    groupRef.current.visible = entity.visible;
    groupRef.current.position.set(
      entity.position.x,
      entity.position.y,
      entity.position.z
    );
    groupRef.current.rotation.set(0, entity.rotationYRad, 0);
  });

  // Floor trail points in world space
  const trailLinePoints = useMemo<Array<[number, number, number]>>(() => {
    if (!trailPoints || trailPoints.length < 2) return [];
    return trailPoints.map((p) => [p.x, p.y, p.z]);
  }, [trailPoints]);

  // Forward ground gaze vector line in local +Z space
  const forwardIndicatorPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [0, 0.02, radius * 0.8],
      [0, 0.02, radius * 2.5],
      [-0.08, 0.02, radius * 2.0],
      [0, 0.02, radius * 2.5],
      [0.08, 0.02, radius * 2.0],
    ],
    [radius]
  );

  const headY = height - 0.18;
  const torsoHeight = Math.max(0.4, height - 0.55);
  const torsoY = torsoHeight * 0.5 + 0.12;

  return (
    <group>
      {/* Dynamic Floor Movement Trail (World Space) */}
      {trailLinePoints.length >= 2 && (
        <Line
          points={trailLinePoints}
          color={color}
          lineWidth={1.6}
          dashed
          dashScale={10}
          dashSize={0.25}
          gapSize={0.15}
          transparent
          opacity={0.65}
        />
      )}

      {/* 60fps Animated Entity Transform Group (controlled imperatively to avoid JSX prop overwrite) */}
      <group ref={groupRef}>
        {/* Ground Contact Shadow & Selection Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry
            args={[
              radius * 0.92,
              highlighted ? radius * 1.35 : radius * 1.12,
              32,
            ]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={highlighted ? 0.9 : 0.45}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Ground Facing Direction Arrow (+Z Forward) */}
        <Line
          points={forwardIndicatorPoints}
          color={color}
          lineWidth={highlighted ? 2.2 : 1.4}
          transparent
          opacity={highlighted ? 0.95 : 0.65}
        />

        {def.kind === 'character' ? (
          <group>
            {/* Stylized Architectural Torso Column */}
            <mesh position={[0, torsoY, 0]}>
              <capsuleGeometry args={[radius * 0.72, torsoHeight * 0.55, 8, 20]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={highlighted ? 0.35 : 0.14}
                transparent
                opacity={highlighted ? 0.82 : 0.52}
                roughness={0.35}
                metalness={0.2}
              />
            </mesh>

            {/* Shoulder Cross-Bar to make body silhouette immediately clear */}
            <mesh position={[0, height - 0.42, 0]}>
              <boxGeometry args={[radius * 2.1, 0.12, radius * 0.95]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={highlighted ? 0.3 : 0.12}
                transparent
                opacity={highlighted ? 0.75 : 0.45}
              />
            </mesh>

            {/* Mannequin Head Sphere */}
            <mesh position={[0, headY, 0]}>
              <sphereGeometry args={[0.14, 20, 20]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={highlighted ? 0.45 : 0.2}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Directional Eye Visor / Nose Wedge (+Z Forward) */}
            <mesh position={[0, headY, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.065, 0.14, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ) : def.kind === 'prop' ? (
          <mesh position={[0, height * 0.5, 0]}>
            <boxGeometry args={[radius * 2, height, radius * 2]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.15}
              transparent
              opacity={0.55}
              wireframe={false}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[radius * 0.6, radius, 0.14, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.75} />
          </mesh>
        )}

        {/* Floating Identity Badge (Ultra-Compact Micro-Pill) */}
        <StageBillboardLabel
          position={[0, height + 0.28, 0]}
          label={def.label}
          accentColor={color}
          highlighted={highlighted}
          ghosted={isPlaying}
          visible={labelMode === 'all' && cameraMode !== 'stage-pov'}
        />
      </group>
    </group>
  );
};
