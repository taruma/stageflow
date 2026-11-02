/**
 * Illustrative 3D Stage Camera Rig inside the diorama.
 * Renders:
 *   1. Blueprint camera body + cinema lens barrel + matte box
 *   2. Rectangular Cinematic Gate Frustum (16:9 / 2.39:1) matching lens focal length (mm)
 *   3. Luminous Focus Plane Frame + Reticle at the look-at target distance
 *   4. 3D Trajectory Path Curve across the active shot
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraViewMode, StageFrame } from '../core/types';
import { computeFrustumGateDimensions } from '../core/opticsMath';
import { StageBillboardLabel } from './StageBillboardLabel';

export interface StageCameraRigProps {
  frameRef: React.RefObject<StageFrame>;
  cameraMode: CameraViewMode;
  uiFrame: StageFrame;
}

export const StageCameraRig: React.FC<StageCameraRigProps> = ({
  frameRef,
  cameraMode,
  uiFrame,
}) => {
  const rigGroupRef = useRef<THREE.Group | null>(null);
  const frustumVolumeRef = useRef<THREE.Mesh | null>(null);
  const focusPlaneGroupRef = useRef<THREE.Group | null>(null);

  const stageCam = uiFrame.stageCamera;
  const pose = stageCam.transform.pose;
  const aspectRatio = stageCam.transform.aspectRatio;
  const color = stageCam.frustumColor || '#f59e0b';

  // Compute rectangular gate dimensions for the current UI snapshot
  const gate = useMemo(
    () =>
      computeFrustumGateDimensions(
        pose.focalLengthMm,
        stageCam.frustumDepth,
        aspectRatio
      ),
    [pose.focalLengthMm, stageCam.frustumDepth, aspectRatio]
  );

  // Frustum pyramid lines in local camera space (camera looks down +Z in group local space after lookAt)
  const frustumLines = useMemo(() => {
    const d = stageCam.frustumDepth;
    const hw = gate.halfWidth;
    const hh = gate.halfHeight;

    const tl: [number, number, number] = [-hw, hh, d];
    const tr: [number, number, number] = [hw, hh, d];
    const br: [number, number, number] = [hw, -hh, d];
    const bl: [number, number, number] = [-hw, -hh, d];
    const origin: [number, number, number] = [0, 0, 0];

    return {
      rays: [
        [origin, tl],
        [origin, tr],
        [origin, br],
        [origin, bl],
      ] as Array<Array<[number, number, number]>>,
      gateFrame: [tl, tr, br, bl, tl] as Array<[number, number, number]>,
      sightLine: [origin, [0, 0, d]] as Array<[number, number, number]>,
      ruleOfThirdsH1: [
        [-hw, hh / 3, d],
        [hw, hh / 3, d],
      ] as Array<[number, number, number]>,
      ruleOfThirdsH2: [
        [-hw, -hh / 3, d],
        [hw, -hh / 3, d],
      ] as Array<[number, number, number]>,
    };
  }, [stageCam.frustumDepth, gate.halfWidth, gate.halfHeight]);

  // 3D trajectory path points in world space
  const trajectoryLinePoints = useMemo<Array<[number, number, number]>>(() => {
    if (!stageCam.showPath || stageCam.trajectoryPoints.length < 2) {
      return [];
    }
    return stageCam.trajectoryPoints.map((pt) => [pt.x, pt.y, pt.z]);
  }, [stageCam.showPath, stageCam.trajectoryPoints]);

  // Update 3D position and orientation imperatively at 60fps
  useFrame(() => {
    const liveFrame = frameRef.current;
    if (!liveFrame || !rigGroupRef.current) return;

    const { position, target } = liveFrame.stageCamera.transform;
    rigGroupRef.current.position.set(position.x, position.y, position.z);
    rigGroupRef.current.lookAt(target.x, target.y, target.z);
  });

  // Hide the 3D camera body mesh when viewing directly through Stage Camera POV
  const isBodyVisible = cameraMode !== 'stage-pov';

  return (
    <group>
      {/* 1. World-Space 3D Trajectory Curve for Moving Shots */}
      {trajectoryLinePoints.length >= 2 && (
        <group>
          <Line
            points={trajectoryLinePoints}
            color={color}
            lineWidth={2}
            dashed
            dashScale={8}
            dashSize={0.35}
            gapSize={0.2}
            transparent
            opacity={0.75}
          />
          {/* Start & End Waypoint Beacons along the camera track */}
          <mesh position={trajectoryLinePoints[0]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh
            position={trajectoryLinePoints[trajectoryLinePoints.length - 1]}
          >
            <octahedronGeometry args={[0.075, 0]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      )}

      {/* 2. 60fps Animated Stage Camera Rig Group */}
      <group
        ref={rigGroupRef}
        position={[
          stageCam.transform.position.x,
          stageCam.transform.position.y,
          stageCam.transform.position.z,
        ]}
      >
        {isBodyVisible && (
          <group>
            {/* Camera Body Chassis */}
            <mesh position={[0, 0, -0.14]}>
              <boxGeometry args={[0.24, 0.22, 0.28]} />
              <meshStandardMaterial
                color="#0f172a"
                emissive={color}
                emissiveIntensity={0.25}
                roughness={0.3}
                metalness={0.7}
              />
            </mesh>

            {/* Cinema Lens Barrel & Matte Box at Nodal Point (0,0,0) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
              <cylinderGeometry args={[0.075, 0.085, 0.12, 20]} />
              <meshStandardMaterial
                color="#1e293b"
                emissive={color}
                emissiveIntensity={0.4}
              />
            </mesh>

            {/* Top Carry Handle */}
            <mesh position={[0, 0.15, -0.14]}>
              <boxGeometry args={[0.05, 0.06, 0.2]} />
              <meshBasicMaterial color={color} transparent opacity={0.85} />
            </mesh>

            {/* Floating Camera Lens & Maneuver Badge */}
            <StageBillboardLabel
              position={[0, 0.36, -0.1]}
              label="STAGE CAM"
              sublabel={`${Math.round(pose.focalLengthMm)}mm · ${stageCam.maneuver.toUpperCase()}`}
              accentColor={color}
              highlighted
            />
          </group>
        )}

        {/* 3. Rectangular Cinematic Gate Frustum & Sight-Line */}
        {isBodyVisible && (
          <group>
            {/* Central Optical Axis Sight-Line */}
            <Line
              points={frustumLines.sightLine}
              color={color}
              lineWidth={1.2}
              dashed
              dashScale={12}
              dashSize={0.25}
              gapSize={0.2}
              transparent
              opacity={0.65}
            />

            {/* 4 Corner Frustum Pyramid Edge Rays */}
            {frustumLines.rays.map((ray, idx) => (
              <Line
                key={idx}
                points={ray}
                color={color}
                lineWidth={1.3}
                transparent
                opacity={0.55}
              />
            ))}

            {/* Rectangular Focus Plane Frame at Target Distance */}
            <group ref={focusPlaneGroupRef}>
              <Line
                points={frustumLines.gateFrame}
                color={color}
                lineWidth={2.0}
                transparent
                opacity={0.9}
              />
              {/* Subtle Rule-of-Thirds Horizon Guides on Focus Gate */}
              <Line
                points={frustumLines.ruleOfThirdsH1}
                color={color}
                lineWidth={0.7}
                transparent
                opacity={0.2}
              />
              <Line
                points={frustumLines.ruleOfThirdsH2}
                color={color}
                lineWidth={0.7}
                transparent
                opacity={0.2}
              />

              {/* Translucent Focus Plane Glass Fill */}
              <mesh
                ref={frustumVolumeRef}
                position={[0, 0, stageCam.frustumDepth]}
              >
                <planeGeometry args={[gate.gateWidth, gate.gateHeight]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.05}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Focus Target Center Crosshair Ring */}
              <mesh position={[0, 0, stageCam.frustumDepth]}>
                <ringGeometry args={[0.06, 0.085, 24]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </group>
        )}
      </group>
    </group>
  );
};
