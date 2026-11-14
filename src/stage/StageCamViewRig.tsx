/**
 * Dedicated PerspectiveCamera rig for the Stage Cam Viewport.
 * Locks the Three.js camera directly to the illustrative Stage Camera's 60fps transform,
 * gated to cut atomically with the committed React UI state.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StageFrame } from '../core/types';
import { resolveGatedState } from './stageSyncGate';

export interface StageCamViewRigProps {
  frameRef: React.RefObject<StageFrame>;
  uiFrame?: StageFrame;
}

export const StageCamViewRig: React.FC<StageCamViewRigProps> = ({
  frameRef,
  uiFrame,
}) => {
  const { camera } = useThree();
  const lastSyncedCamRef = useRef<StageFrame['stageCamera'] | null>(null);

  const syncCamera = (
    liveFrame: StageFrame | null,
    forceProjectionUpdate = false
  ) => {
    const resolvedCam = uiFrame
      ? resolveGatedState(
          liveFrame?.stageCamera,
          uiFrame.stageCamera,
          lastSyncedCamRef.current,
          (cam) => cam.shotId
        ).state
      : liveFrame?.stageCamera;

    if (!resolvedCam) return;
    lastSyncedCamRef.current = resolvedCam;

    const { position, target, fovDeg, pose } = resolvedCam.transform;
    const persp = camera as THREE.PerspectiveCamera;
    persp.position.set(position.x, position.y, position.z);
    persp.lookAt(target.x, target.y, target.z);
    if (Math.abs(pose.roll) > 1e-6) {
      persp.rotateZ(pose.roll);
    }

    if (forceProjectionUpdate || Math.abs(persp.fov - fovDeg) > 0.01) {
      persp.fov = fovDeg;
      persp.updateProjectionMatrix();
    }
  };

  useLayoutEffect(() => {
    syncCamera(frameRef.current, true);
  }, [camera, frameRef, uiFrame]);

  useFrame(() => {
    const frame = frameRef.current;
    if (!frame) return;
    syncCamera(frame, false);
  });

  return null;
};
