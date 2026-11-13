/**
 * Dedicated offscreen Clean Film Gate WebGL Canvas for deterministic MP4 export.
 * Reuses BlueprintStageScene, StageCamViewRig, and StageCamDofEffect with
 * gateScale = 1.0 (un-widened Stage Camera FOV), zero borders, and auto-hidden labels.
 * Mounted strictly while an export is actively encoding.
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { AppThemeCategory, StageFrame, StageScore } from '../core/types';
import { BlueprintStageScene } from './BlueprintStageScene';
import { StageCamViewRig } from './StageCamViewRig';
import { StageCamDofEffect } from './StageCamDofEffect';
import { getDioramaThemeColors } from './dioramaTheme';

export interface CleanStageCamExportHandle {
  renderFrame: (nextFrame: StageFrame) => Promise<HTMLCanvasElement>;
}

export interface CleanStageCamExportCanvasProps {
  score: StageScore;
  initialFrame: StageFrame;
  width: number;
  height: number;
  dofBlurEnabled: boolean;
  themeCategory: AppThemeCategory;
}

interface ExportBridgeState {
  advance: (timestamp: number, runGlobalEffects?: boolean) => void;
  canvas: HTMLCanvasElement;
  committedRevision: number;
  isSized: boolean;
}

const ExportAdvanceBridge: React.FC<{
  bridgeRef: React.MutableRefObject<ExportBridgeState | null>;
  revision: number;
  expectedWidth: number;
  expectedHeight: number;
}> = ({ bridgeRef, revision, expectedWidth, expectedHeight }) => {
  const advance = useThree((state) => state.advance);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);

  // Runs inside the R3F inner Fiber root after BlueprintStageScene,
  // DirectionalMannequin, StageCamViewRig, and StageCamDofEffect useEffects
  // (including FBO renderTarget.setSize) have completed.
  useEffect(() => {
    const isSized =
      Math.abs(size.width - expectedWidth) <= 1 &&
      Math.abs(size.height - expectedHeight) <= 1;
    bridgeRef.current = {
      advance,
      canvas: gl.domElement,
      committedRevision: revision,
      isSized,
    };
  }, [advance, gl, size.width, size.height, expectedWidth, expectedHeight, bridgeRef, revision]);

  useEffect(() => {
    return () => {
      bridgeRef.current = null;
    };
  }, [bridgeRef]);

  return null;
};

function hasBoundaryStateChanged(prev: StageFrame, next: StageFrame): boolean {
  if (prev.stageCamera.shotId !== next.stageCamera.shotId) {
    return true;
  }
  if (prev.entitiesList.length !== next.entitiesList.length) {
    return true;
  }
  for (let i = 0; i < next.entitiesList.length; i++) {
    const a = prev.entitiesList[i];
    const b = next.entitiesList[i];
    if (
      a.id !== b.id ||
      a.cueId !== b.cueId ||
      a.highlighted !== b.highlighted ||
      a.visible !== b.visible ||
      a.trailPoints !== b.trailPoints
    ) {
      return true;
    }
  }
  return false;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export const CleanStageCamExportCanvas = forwardRef<
  CleanStageCamExportHandle,
  CleanStageCamExportCanvasProps
>(({ score, initialFrame, width, height, dofBlurEnabled, themeCategory }, ref) => {
  const frameRef = useRef<StageFrame>(initialFrame);
  const uiFrameRef = useRef<StageFrame>(initialFrame);
  const revisionRef = useRef<number>(0);

  const [renderState, setRenderState] = useState<{
    uiFrame: StageFrame;
    revision: number;
  }>({
    uiFrame: initialFrame,
    revision: 0,
  });

  const bridgeRef = useRef<ExportBridgeState | null>(null);

  const themeColors = useMemo(
    () => getDioramaThemeColors(themeCategory),
    [themeCategory]
  );

  useImperativeHandle(
    ref,
    () => ({
      renderFrame: async (nextFrame: StageFrame): Promise<HTMLCanvasElement> => {
        frameRef.current = nextFrame;

        if (hasBoundaryStateChanged(uiFrameRef.current, nextFrame)) {
          uiFrameRef.current = nextFrame;
          const nextRev = revisionRef.current + 1;
          revisionRef.current = nextRev;
          setRenderState({
            uiFrame: nextFrame,
            revision: nextRev,
          });
        }

        const targetRevision = revisionRef.current;

        // Wait until the inner R3F Fiber root has sized the canvas/FBO and committed targetRevision
        let attempts = 0;
        while (
          (!bridgeRef.current ||
            !bridgeRef.current.isSized ||
            bridgeRef.current.committedRevision < targetRevision) &&
          attempts < 60
        ) {
          await nextAnimationFrame();
          attempts++;
        }

        const bridge = bridgeRef.current;
        if (!bridge) {
          throw new Error('Offscreen Stage Cam WebGL canvas failed to initialize.');
        }

        bridge.advance(performance.now());
        return bridge.canvas;
      },
    }),
    []
  );

  return (
    <div
      aria-hidden="true"
      className="fixed -left-[99999px] top-0 pointer-events-none overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <Canvas
        frameloop="never"
        dpr={1}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: initialFrame.stageCamera.transform.fovDeg,
          near: 0.1,
          far: 250,
        }}
      >
        <color attach="background" args={[themeColors.bg]} />
        <fog attach="fog" args={[themeColors.fog, 45, 160]} />

        <BlueprintStageScene
          score={score}
          frameRef={frameRef}
          uiFrame={renderState.uiFrame}
          labelMode="off"
          isPlaying={true}
          cameraMode="stage-pov"
          themeCategory={themeCategory}
        />

        <StageCamViewRig frameRef={frameRef} />

        {dofBlurEnabled && (
          <StageCamDofEffect frameRef={frameRef} uiFrame={renderState.uiFrame} />
        )}

        <ExportAdvanceBridge
          bridgeRef={bridgeRef}
          revision={renderState.revision}
          expectedWidth={width}
          expectedHeight={height}
        />
      </Canvas>
    </div>
  );
});

CleanStageCamExportCanvas.displayName = 'CleanStageCamExportCanvas';
