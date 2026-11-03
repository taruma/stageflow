/**
 * Manages the main Three.js PerspectiveCamera and OrbitControls.
 * Implements:
 *   1. Instant Cut (0ms transition) between 'scripted', 'free', and 'stage-pov'.
 *   2. Scripted lock during playback -> Free Orbit handover on pause -> Instant update on scrub.
 *   3. Gated atomic cut synchronization across React UI state updates.
 */

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type {
  CameraTransform3D,
  CameraViewMode,
  SphericalPose,
  StageFrame,
} from '../core/types';
import { cartesianToSpherical } from '../core/sphericalMath';
import { verticalFovDegToFocalLengthMm } from '../core/opticsMath';

export interface ObserverCameraRigProps {
  cameraMode: CameraViewMode;
  isPlaying: boolean;
  frameRef: React.RefObject<StageFrame>;
  uiFrame?: StageFrame;
  lastManualSeekIdRef: React.RefObject<number>;
  onFreeOrbitPoseChange: (pose: SphericalPose) => void;
}

export const ObserverCameraRig: React.FC<ObserverCameraRigProps> = ({
  cameraMode,
  isPlaying,
  frameRef,
  uiFrame,
  lastManualSeekIdRef,
  onFreeOrbitPoseChange,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const lastHandledSeekIdRef = useRef<number>(lastManualSeekIdRef.current);
  const lastModeRef = useRef<CameraViewMode>(cameraMode);
  const wasPlayingRef = useRef<boolean>(isPlaying);

  // Helper to apply a CameraTransform3D directly to Three.js PerspectiveCamera + OrbitControls
  const applyTransformImperatively = (transform: CameraTransform3D) => {
    const persp = camera as THREE.PerspectiveCamera;
    persp.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );
    if (Math.abs(persp.fov - transform.fovDeg) > 0.05) {
      persp.fov = transform.fovDeg;
      persp.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(
        transform.target.x,
        transform.target.y,
        transform.target.z
      );
      controlsRef.current.update();
    } else {
      persp.lookAt(
        transform.target.x,
        transform.target.y,
        transform.target.z
      );
    }
  };

  // Apply initial camera pose on mount
  useEffect(() => {
    const initialFrame = uiFrame ?? frameRef.current;
    if (!initialFrame) return;
    const targetTransform =
      cameraMode === 'stage-pov'
        ? initialFrame.stageCamera.transform
        : initialFrame.observerCamera.transform;
    applyTransformImperatively(targetTransform);
  }, []);

  useFrame(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const modeChanged = lastModeRef.current !== cameraMode;
    lastModeRef.current = cameraMode;

    const seekOccurred =
      lastManualSeekIdRef.current !== lastHandledSeekIdRef.current;
    lastHandledSeekIdRef.current = lastManualSeekIdRef.current;

    const justStartedPlaying = !wasPlayingRef.current && isPlaying;
    wasPlayingRef.current = isPlaying;

    // 1. STAGE CAMERA POV MODE: Always locked to the illustrative Stage Camera's exact frustum
    if (cameraMode === 'stage-pov') {
      const isShotDesynced =
        uiFrame !== undefined &&
        Boolean(frame.stageCamera.shotId) &&
        Boolean(uiFrame.stageCamera.shotId) &&
        frame.stageCamera.shotId !== uiFrame.stageCamera.shotId;

      const transform = isShotDesynced
        ? uiFrame.stageCamera.transform
        : frame.stageCamera.transform;

      applyTransformImperatively(transform);
      return;
    }

    // 2. SCRIPTED OBSERVER MODE:
    //    - Locked to observerCamera track while playing
    //    - Snaps on mode switch or when scrubbing while paused
    //    - Releases lock to OrbitControls when paused so user can freely orbit/inspect
    if (cameraMode === 'scripted') {
      if (isPlaying || modeChanged || seekOccurred || justStartedPlaying) {
        const isObserverShotDesynced =
          uiFrame !== undefined &&
          Boolean(frame.observerCamera.shotId) &&
          Boolean(uiFrame.observerCamera.shotId) &&
          frame.observerCamera.shotId !== uiFrame.observerCamera.shotId;

        const transform = isObserverShotDesynced
          ? uiFrame.observerCamera.transform
          : frame.observerCamera.transform;

        applyTransformImperatively(transform);
      }
      return;
    }

    // 3. FREE ORBIT MODE:
    //    - OrbitControls remains in full user control even while playing
  });

  // OrbitControls is enabled in 'free' mode or in 'scripted' mode while paused
  const isOrbitEnabled =
    cameraMode === 'free' || (cameraMode === 'scripted' && !isPlaying);

  const handleControlsChange = () => {
    if (!isOrbitEnabled || !controlsRef.current) return;
    const persp = camera as THREE.PerspectiveCamera;
    const tgt = controlsRef.current.target;
    const aspect = frameRef.current?.observerCamera.transform.aspectRatio ?? 16 / 9;
    const focalMm = verticalFovDegToFocalLengthMm(persp.fov, aspect);
    const livePose = cartesianToSpherical(
      { x: persp.position.x, y: persp.position.y, z: persp.position.z },
      { x: tgt.x, y: tgt.y, z: tgt.z },
      focalMm
    );
    onFreeOrbitPoseChange(livePose);
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={isOrbitEnabled}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={38}
      maxPolarAngle={Math.PI * 0.49}
      onChange={handleControlsChange}
    />
  );
};
