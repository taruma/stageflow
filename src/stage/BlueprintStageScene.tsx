/**
 * Reusable 3D Blueprint Stage Scene.
 * Shared by both the main Diorama Canvas and the Stage Cam Monitor Canvas.
 * Renders studio lighting, the metric floor grid, and directional character mannequins.
 */

import React from 'react';
import type { StageFrame, StageScore } from '../core/types';
import { BlueprintFloorGrid } from './BlueprintFloorGrid';
import { DirectionalMannequin } from './DirectionalMannequin';

export interface BlueprintStageSceneProps {
  score: StageScore;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
}

export const BlueprintStageScene: React.FC<BlueprintStageSceneProps> = ({
  score,
  frameRef,
  uiFrame,
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
      />

      {/* Directional Character Mannequins & Stage Props */}
      {uiFrame.entitiesList.map((entityState) => (
        <DirectionalMannequin
          key={entityState.id}
          entityId={entityState.id}
          initialState={entityState}
          frameRef={frameRef}
        />
      ))}
    </group>
  );
};
