/**
 * Root React Three Fiber Canvas orchestrating the 60fps evaluation tick,
 * Blueprint Floor Grid, Observer Camera Rig, Illustrative Stage Camera Rig,
 * and Directional Mannequins.
 */

import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type {
  CameraViewMode,
  SphericalPose,
  StageFrame,
  StageScore,
} from '../core/types';
import { BlueprintFloorGrid } from './BlueprintFloorGrid';
import { ObserverCameraRig } from './ObserverCameraRig';
import { StageCameraRig } from './StageCameraRig';
import { DirectionalMannequin } from './DirectionalMannequin';

export interface DioramaCanvasProps {
  score: StageScore;
  cameraMode: CameraViewMode;
  isPlaying: boolean;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
  lastManualSeekIdRef: React.RefObject<number>;
  evaluateTick60fps: () => StageFrame;
  onFreeOrbitPoseChange: (pose: SphericalPose) => void;
}

const FrameLoopTicker: React.FC<{ onTick: () => void }> = ({ onTick }) => {
  // Run priority -1 so `frameRef.current` is freshly computed before Camera and Mannequin rigs read it
  useFrame(() => {
    onTick();
  }, -1);
  return null;
};

export const DioramaCanvas: React.FC<DioramaCanvasProps> = ({
  score,
  cameraMode,
  isPlaying,
  frameRef,
  uiFrame,
  lastManualSeekIdRef,
  evaluateTick60fps,
  onFreeOrbitPoseChange,
}) => {
  return (
    <div className="relative w-full h-full bg-[#050811] select-none overflow-hidden">
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        camera={{
          fov: 40,
          near: 0.1,
          far: 150,
          position: [4.5, 3.5, 6.0],
        }}
      >
        <color attach="background" args={['#050811']} />
        <fog attach="fog" args={['#050811', 16, 42]} />

        {/* 60fps Stateless Frame Evaluator Tick */}
        <FrameLoopTicker onTick={evaluateTick60fps} />

        {/* Clean Blueprint Studio Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 12, 8]} intensity={1.1} />
        <directionalLight
          position={[-6, 8, -6]}
          intensity={0.45}
          color="#38bdf8"
        />

        {/* 1. Metric Blueprint Stage Floor Grid */}
        <BlueprintFloorGrid
          width={score.stage.width}
          depth={score.stage.depth}
          gridStep={score.stage.gridStep}
        />

        {/* 2. Viewport Observer Camera & Free-Orbit Handover Rig */}
        <ObserverCameraRig
          cameraMode={cameraMode}
          isPlaying={isPlaying}
          frameRef={frameRef}
          lastManualSeekIdRef={lastManualSeekIdRef}
          onFreeOrbitPoseChange={onFreeOrbitPoseChange}
        />

        {/* 3. Illustrative Stage Camera with Rectangular Film Gate Frustum */}
        <StageCameraRig
          frameRef={frameRef}
          cameraMode={cameraMode}
          uiFrame={uiFrame}
        />

        {/* 4. Directional Character Mannequins & Stage Props */}
        {uiFrame.entitiesList.map((entityState) => (
          <DirectionalMannequin
            key={entityState.id}
            entityId={entityState.id}
            initialState={entityState}
            frameRef={frameRef}
          />
        ))}
      </Canvas>
    </div>
  );
};
