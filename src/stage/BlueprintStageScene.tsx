/**
 * Reusable 3D Blueprint Stage Scene.
 * Shared by both the main Diorama Canvas and the Stage Cam Monitor Canvas.
 * Renders studio lighting, the metric floor grid, and directional character mannequins.
 */

import React from 'react';
import type {
  CameraViewMode,
  LabelDisplayMode,
  StageFrame,
  StageScore,
} from '../core/types';
import { BlueprintFloorGrid } from './BlueprintFloorGrid';
import { DirectionalMannequin } from './DirectionalMannequin';

export interface BlueprintStageSceneProps {
  score: StageScore;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
  labelMode?: LabelDisplayMode;
  isPlaying?: boolean;
  cameraMode?: CameraViewMode;
}

export const BlueprintStageScene: React.FC<BlueprintStageSceneProps> = ({
  score,
  frameRef,
  uiFrame,
  labelMode = 'all',
  isPlaying = false,
  cameraMode,
}) => {
  return (
    <group>
      {/* Clean Blueprint Studio Lighting */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 8]} intensity={1.1} />
      <directionalLight
        position={[-6, 8, -6]}
        intensity={0.45}
        color="#38bdf8"
      />

      {/* Metric Blueprint Stage Floor Grid */}
      <BlueprintFloorGrid
        width={score.stage.width}
        depth={score.stage.depth}
        gridStep={score.stage.gridStep}
        showLabels={labelMode !== 'off'}
        cameraMode={cameraMode}
      />

      {/* Directional Character Mannequins & Stage Props */}
      {uiFrame.entitiesList.map((entityState) => (
        <DirectionalMannequin
          key={entityState.id}
          entityId={entityState.id}
          initialState={entityState}
          frameRef={frameRef}
          uiFrame={uiFrame}
          labelMode={labelMode}
          isPlaying={isPlaying}
          cameraMode={cameraMode}
        />
      ))}
    </group>
  );
};
