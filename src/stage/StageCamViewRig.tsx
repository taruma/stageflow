/**
 * Dedicated PerspectiveCamera rig for the Stage Cam Viewport.
 * Locks the Three.js camera directly to the illustrative Stage Camera's 60fps transform.
 */

import React, { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StageFrame } from '../core/types';

export interface StageCamViewRigProps {
  frameRef: React.RefObject<StageFrame>;
}

export const StageCamViewRig: React.FC<StageCamViewRigProps> = ({
  frameRef,
}) => {
  const { camera } = useThree();

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const { position, target, fovDeg } = frame.stageCamera.transform;
    const persp = camera as THREE.PerspectiveCamera;
    persp.position.set(position.x, position.y, position.z);
    persp.fov = fovDeg;
    persp.updateProjectionMatrix();
    persp.lookAt(target.x, target.y, target.z);
  }, [camera, frameRef]);

  useFrame(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const { position, target, fovDeg } = frame.stageCamera.transform;
    const persp = camera as THREE.PerspectiveCamera;
    persp.position.set(position.x, position.y, position.z);
    persp.lookAt(target.x, target.y, target.z);

    if (Math.abs(persp.fov - fovDeg) > 0.05) {
      persp.fov = fovDeg;
      persp.updateProjectionMatrix();
    }
  });

  return null;
};
