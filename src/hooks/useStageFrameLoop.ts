/**
 * Dual-Tier Engine hook managing 60fps mutable StageFrame evaluation
 * and ~10Hz throttled React state snapshots for UI readouts.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  CameraViewMode,
  SphericalPose,
  StageFrame,
  StageScore,
} from '../core/types';
import { computeStageFrame } from '../core/frameEngine';
import { cloneSphericalPose } from '../core/sphericalMath';
import type { MediaClockDriver } from '../media/mediaTypes';

export interface StageUiSnapshot {
  timestampSec: number;
  frame: StageFrame;
  liveViewportPose: SphericalPose;
}

export interface UseStageFrameLoopResult {
  cameraMode: CameraViewMode;
  setCameraMode: (mode: CameraViewMode) => void;
  frameRef: React.RefObject<StageFrame>;
  liveViewportPoseRef: React.RefObject<SphericalPose>;
  uiSnapshot: StageUiSnapshot;
  evaluateTick60fps: () => StageFrame;
  notifyFreeOrbitChange: (newPose: SphericalPose) => void;
  forceSyncUi: () => void;
}

export function useStageFrameLoop(
  score: StageScore,
  driverRef: React.RefObject<MediaClockDriver | null>,
  loopActiveShot: boolean,
  isPlaying: boolean
): UseStageFrameLoopResult {
  const [cameraMode, setCameraModeState] = useState<CameraViewMode>('scripted');

  const initialFrame = computeStageFrame(0, score);
  const frameRef = useRef<StageFrame>(initialFrame);
  const liveViewportPoseRef = useRef<SphericalPose>(
    cloneSphericalPose(initialFrame.observerCamera.transform.pose)
  );
  const lastUiSyncPerfMsRef = useRef<number>(0);
  const lockedLoopShotIdRef = useRef<string | null>(null);

  const [uiSnapshot, setUiSnapshot] = useState<StageUiSnapshot>(() => ({
    timestampSec: 0,
    frame: initialFrame,
    liveViewportPose: cloneSphericalPose(
      initialFrame.observerCamera.transform.pose
    ),
  }));

  const forceSyncUi = useCallback(() => {
    lastUiSyncPerfMsRef.current = performance.now();
    setUiSnapshot({
      timestampSec: frameRef.current.timestampSec,
      frame: frameRef.current,
      liveViewportPose: cloneSphericalPose(liveViewportPoseRef.current),
    });
  }, []);

  // Re-evaluate immediately when score or play state changes
  useEffect(() => {
    const t = driverRef.current?.getCurrentTime() ?? 0;
    const nextFrame = computeStageFrame(t, score);
    frameRef.current = nextFrame;
    if (cameraMode === 'scripted') {
      liveViewportPoseRef.current = cloneSphericalPose(
        nextFrame.observerCamera.transform.pose
      );
    } else if (cameraMode === 'stage-pov') {
      liveViewportPoseRef.current = cloneSphericalPose(
        nextFrame.stageCamera.transform.pose
      );
    }
    forceSyncUi();
  }, [score, isPlaying, cameraMode, driverRef, forceSyncUi]);

  // Track which shot to loop when loopActiveShot is toggled on
  useEffect(() => {
    if (loopActiveShot) {
      lockedLoopShotIdRef.current = frameRef.current.activeShot?.id ?? null;
    } else {
      lockedLoopShotIdRef.current = null;
    }
  }, [loopActiveShot]);

  const setCameraMode = useCallback(
    (mode: CameraViewMode) => {
      setCameraModeState(mode);
      if (mode === 'scripted') {
        liveViewportPoseRef.current = cloneSphericalPose(
          frameRef.current.observerCamera.transform.pose
        );
      } else if (mode === 'stage-pov') {
        liveViewportPoseRef.current = cloneSphericalPose(
          frameRef.current.stageCamera.transform.pose
        );
      }
      lastUiSyncPerfMsRef.current = performance.now();
      setUiSnapshot({
        timestampSec: frameRef.current.timestampSec,
        frame: frameRef.current,
        liveViewportPose: cloneSphericalPose(liveViewportPoseRef.current),
      });
    },
    []
  );

  const notifyFreeOrbitChange = useCallback((newPose: SphericalPose) => {
    liveViewportPoseRef.current = cloneSphericalPose(newPose);
    const now = performance.now();
    if (now - lastUiSyncPerfMsRef.current >= 80) {
      lastUiSyncPerfMsRef.current = now;
      setUiSnapshot({
        timestampSec: frameRef.current.timestampSec,
        frame: frameRef.current,
        liveViewportPose: cloneSphericalPose(newPose),
      });
    }
  }, []);

  /**
   * Called at 60fps inside R3F's `useFrame` (and by the Procedural canvas loop).
   * Zero React re-renders per frame; syncs React UI state at a calm ~10Hz cadence.
   */
  const evaluateTick60fps = useCallback((): StageFrame => {
    const drv = driverRef.current;
    let currentSec = drv ? drv.getCurrentTime() : 0;

    // Handle active shot looping
    if (loopActiveShot && drv && drv.isPlaying()) {
      const targetShot =
        score.shots.find((s) => s.id === lockedLoopShotIdRef.current) ??
        frameRef.current.activeShot;
      if (targetShot && currentSec >= targetShot.endSec - 0.02) {
        drv.seek(targetShot.startSec);
        currentSec = targetShot.startSec;
      }
    }

    const prevFrame = frameRef.current;
    const prevShotId = prevFrame.activeShot?.id ?? null;
    const prevTime = prevFrame.timestampSec;
    const nextFrame = computeStageFrame(currentSec, score);
    frameRef.current = nextFrame;

    if (cameraMode === 'scripted' && drv?.isPlaying()) {
      liveViewportPoseRef.current = cloneSphericalPose(
        nextFrame.observerCamera.transform.pose
      );
    } else if (cameraMode === 'stage-pov') {
      liveViewportPoseRef.current = cloneSphericalPose(
        nextFrame.stageCamera.transform.pose
      );
    }

    const now = performance.now();
    const shotChanged = (nextFrame.activeShot?.id ?? null) !== prevShotId;
    const entityCueChanged = nextFrame.entitiesList.some(
      (ent) => ent.cueId !== prevFrame.entitiesById.get(ent.id)?.cueId
    );
    const timeChanged = Math.abs(currentSec - prevTime) > 0.0005;

    if (
      shotChanged ||
      entityCueChanged ||
      (timeChanged && now - lastUiSyncPerfMsRef.current >= 95)
    ) {
      lastUiSyncPerfMsRef.current = now;
      setUiSnapshot({
        timestampSec: nextFrame.timestampSec,
        frame: nextFrame,
        liveViewportPose: cloneSphericalPose(liveViewportPoseRef.current),
      });
    }

    return nextFrame;
  }, [driverRef, loopActiveShot, score, cameraMode]);

  return {
    cameraMode,
    setCameraMode,
    frameRef,
    liveViewportPoseRef,
    uiSnapshot,
    evaluateTick60fps,
    notifyFreeOrbitChange,
    forceSyncUi,
  };
}
