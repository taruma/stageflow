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
import { ENTITY_DEFAULTS } from '../core/constants';
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
    const liveEntity = liveFrame.entitiesById.get(entityId);
    if (!liveEntity) return initialState;

    const isCueDesynced =
      uiFrame !== undefined &&
      liveEntity.cueId !== undefined &&
      initialState.cueId !== undefined &&
      liveEntity.cueId !== initialState.cueId;

    if (isCueDesynced) {
      return initialState;
    }

    return liveEntity;
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

  const headY = height * ENTITY_DEFAULTS.CHARACTER_LOOK_ANCHOR_RATIO;
  const torsoHeight = Math.max(0.4, height - 0.55);
  const torsoY = torsoHeight * 0.5 + 0.12;

  const renderPropShape = () => {
    const shape = def.shape ?? 'box';
    const material = (
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={highlighted ? 0.35 : 0.15}
        transparent
        opacity={highlighted ? 0.85 : 0.55}
        roughness={0.35}
        metalness={0.15}
      />
    );

    switch (shape) {
      case 'sphere': {
        const sphereRadius = radius > 0 ? radius : height * 0.5;
        return (
          <mesh position={[0, sphereRadius, 0]}>
            <sphereGeometry args={[sphereRadius, 32, 32]} />
            {material}
          </mesh>
        );
      }
      case 'cylinder': {
        return (
          <mesh position={[0, height * 0.5, 0]}>
            <cylinderGeometry args={[radius, radius, height, 32]} />
            {material}
          </mesh>
        );
      }
      case 'capsule': {
        const capRadius = radius;
        const bodyLen = Math.max(0.01, height - capRadius * 2);
        return (
          <mesh position={[0, height * 0.5, 0]}>
            <capsuleGeometry args={[capRadius, bodyLen, 8, 20]} />
            {material}
          </mesh>
        );
      }
      case 'box':
      default: {
        return (
          <mesh position={[0, height * 0.5, 0]}>
            <boxGeometry args={[radius * 2, height, radius * 2]} />
            {material}
          </mesh>
        );
      }
    }
  };

  const renderMarkerShape = () => {
    const shape = def.shape ?? 'x';
    const tapeThickness = 0.003;
    const stripWidth = Math.max(0.04, radius * 0.28);
    const stripLen = radius * 2;
    const tapeMaterial = (
      <meshBasicMaterial
        color={color}
        transparent
        opacity={highlighted ? 0.95 : 0.8}
        side={THREE.DoubleSide}
      />
    );

    switch (shape) {
      case 't': {
        const stemLen = radius * 1.5;
        return (
          <group position={[0, 0.005, 0]}>
            {/* Top crossbar (horizontal along X) */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[stripLen, tapeThickness, stripWidth]} />
              {tapeMaterial}
            </mesh>
            {/* Vertical stem (pointing along -Z) */}
            <mesh position={[0, 0.0005, -stemLen * 0.5]}>
              <boxGeometry args={[stripWidth, tapeThickness, stemLen]} />
              {tapeMaterial}
            </mesh>
          </group>
        );
      }
      case 'circle': {
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[radius * 0.72, radius, 32]} />
            {tapeMaterial}
          </mesh>
        );
      }
      case 'puck': {
        return (
          <mesh position={[0, Math.max(0.04, height * 0.5), 0]}>
            <cylinderGeometry
              args={[radius * 0.6, radius, Math.max(0.08, height), 16]}
            />
            {tapeMaterial}
          </mesh>
        );
      }
      case 'x':
      default: {
        return (
          <group position={[0, 0.005, 0]}>
            {/* Diagonal tape 1 (+45 deg) */}
            <mesh rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[stripWidth, tapeThickness, stripLen]} />
              {tapeMaterial}
            </mesh>
            {/* Diagonal tape 2 (-45 deg) */}
            <mesh rotation={[0, -Math.PI / 4, 0]} position={[0, 0.0005, 0]}>
              <boxGeometry args={[stripWidth, tapeThickness, stripLen]} />
              {tapeMaterial}
            </mesh>
          </group>
        );
      }
    }
  };

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
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.012, 0]}
          visible={def.kind !== 'marker' || highlighted}
        >
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
        {(def.kind !== 'marker' || def.shape === 'puck' || def.rotationYRad !== 0) && (
          <Line
            points={forwardIndicatorPoints}
            color={color}
            lineWidth={highlighted ? 2.2 : 1.4}
            transparent
            opacity={highlighted ? 0.95 : 0.65}
          />
        )}

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
          renderPropShape()
        ) : (
          renderMarkerShape()
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
