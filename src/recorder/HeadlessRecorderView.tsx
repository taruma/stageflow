/**
 * Headless Recorder Viewport Component.
 * Dedicated, chrome-free rendering environment mounted when ?mode=headless-render is present.
 * Exposes window.__STAGEFLOW_RECORDER__ for deterministic, frame-by-frame Playwright stepping.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { StageFrame, StageScore } from '../core/types';
import { parseStageScore } from '../core/scoreParser';
import { computeStageFrame } from '../core/frameEngine';
import { INITIAL_CATALOG_ITEMS } from '../core/scoreCatalog';
import { DioramaCanvas } from '../stage/DioramaCanvas';
import { StageCamViewfinderOverlay } from '../ui/StageCamViewfinderOverlay';
import { ShotBreakdownHud } from '../ui/ShotBreakdownHud';
import { CameraTelemetryCapsule } from '../ui/CameraTelemetryCapsule';
import type {
  RecorderConfig,
  RecorderFrameResult,
  HeadlessRecorderBridge,
} from './recorderTypes';

const DEFAULT_CONFIG: RecorderConfig = {
  scoreYaml: INITIAL_CATALOG_ITEMS[0].rawYaml,
  cameraMode: 'scripted',
  labelMode: 'all',
  showGuides: false,
  showHud: false,
  fps: 60,
  width: 1920,
  height: 1080,
  startSec: 0,
  endSec: 0,
};

export const HeadlessRecorderView: React.FC = () => {
  const [config, setConfig] = useState<RecorderConfig>(() => {
    if (typeof window !== 'undefined' && window.__STAGEFLOW_RECORDER_CONFIG__) {
      return window.__STAGEFLOW_RECORDER_CONFIG__;
    }
    return DEFAULT_CONFIG;
  });

  const parsedScoreResult = React.useMemo(() => {
    try {
      const res = parseStageScore(config.scoreYaml);
      return res.score ?? INITIAL_CATALOG_ITEMS[0].score;
    } catch {
      return INITIAL_CATALOG_ITEMS[0].score;
    }
  }, [config.scoreYaml]);

  const score: StageScore = parsedScoreResult;
  const initialFrame = React.useMemo(
    () => computeStageFrame(config.startSec, score),
    [config.startSec, score]
  );

  const [uiFrame, setUiFrame] = useState<StageFrame>(initialFrame);
  const frameRef = useRef<StageFrame>(initialFrame);
  const lastManualSeekIdRef = useRef<number>(0);

  const configRef = useRef<RecorderConfig>(config);
  configRef.current = config;

  const scoreRef = useRef<StageScore>(score);
  scoreRef.current = score;

  // Synchronize ref on uiFrame change
  useEffect(() => {
    frameRef.current = uiFrame;
  }, [uiFrame]);

  // Frame evaluation tick passed to DioramaCanvas
  const evaluateTick60fps = useCallback(() => {
    return frameRef.current;
  }, []);

  // Frame step execution called by Playwright bridge
  const stepFrame = useCallback((frameIndex: number): Promise<RecorderFrameResult> => {
    return new Promise((resolve) => {
      const cfg = configRef.current;
      const currentScore = scoreRef.current;
      const timeOffsetSec = frameIndex / cfg.fps;
      const currentTimestampSec = Math.min(
        cfg.startSec + timeOffsetSec,
        cfg.endSec > cfg.startSec ? cfg.endSec : currentScore.durationSec
      );

      const nextFrame = computeStageFrame(currentTimestampSec, currentScore);
      frameRef.current = nextFrame;
      setUiFrame(nextFrame);
      lastManualSeekIdRef.current += 1;

      // Two animation frames ensure React state flush + R3F WebGL draw + Drei HTML positioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const shotId = nextFrame.activeShot?.id ?? null;
          const total = Math.max(
            1,
            Math.ceil(
              ((cfg.endSec > cfg.startSec
                ? cfg.endSec
                : currentScore.durationSec) -
                cfg.startSec) *
                cfg.fps
            )
          );
          resolve({
            frameIndex,
            timestampSec: currentTimestampSec,
            shotId,
            totalFrames: total,
          });
        });
      });
    });
  }, []);

  // Initialize and register bridge on window
  useEffect(() => {
    const bridge: HeadlessRecorderBridge = {
      ready: true,
      init: async (newConfig: RecorderConfig) => {
        configRef.current = newConfig;
        setConfig(newConfig);
        const res = parseStageScore(newConfig.scoreYaml);
        const parsed = res.score ?? INITIAL_CATALOG_ITEMS[0].score;
        scoreRef.current = parsed;
        const effectiveEnd =
          newConfig.endSec > newConfig.startSec
            ? newConfig.endSec
            : parsed.durationSec;
        const total = Math.max(
          1,
          Math.ceil((effectiveEnd - newConfig.startSec) * newConfig.fps)
        );
        const firstFrame = computeStageFrame(newConfig.startSec, parsed);
        frameRef.current = firstFrame;
        setUiFrame(firstFrame);
        return {
          totalFrames: total,
          durationSec: effectiveEnd - newConfig.startSec,
          fps: newConfig.fps,
        };
      },
      stepFrame,
    };

    window.__STAGEFLOW_RECORDER__ = bridge;

    return () => {
      delete window.__STAGEFLOW_RECORDER__;
    };
  }, [stepFrame]);

  return (
    <div
      id="stageflow-recorder-root"
      className="relative w-screen h-screen bg-[#050811] overflow-hidden select-none"
      style={{ width: `${config.width}px`, height: `${config.height}px` }}
    >
      {/* 3D Blueprint Diorama */}
      <DioramaCanvas
        score={score}
        cameraMode={config.cameraMode}
        isPlaying={true}
        frameRef={frameRef}
        uiFrame={uiFrame}
        lastManualSeekIdRef={lastManualSeekIdRef}
        evaluateTick60fps={evaluateTick60fps}
        onFreeOrbitPoseChange={() => {}}
        labelMode={config.labelMode}
      />

      {/* Stage Camera POV Director's Optical Viewfinder Overlay */}
      {config.cameraMode === 'stage-pov' && (
        <StageCamViewfinderOverlay
          score={score}
          frame={uiFrame}
          showGuides={config.showGuides}
        />
      )}

      {/* Optional 2D Viewport HUD Chrome */}
      {config.showHud && (
        <>
          <ShotBreakdownHud
            score={score}
            frame={uiFrame}
            cameraMode={config.cameraMode}
            isPlaying={false}
          />
          <CameraTelemetryCapsule
            pose={
              config.cameraMode === 'stage-pov'
                ? uiFrame.stageCamera.transform.pose
                : uiFrame.observerCamera.transform.pose
            }
          />
        </>
      )}
    </div>
  );
};
