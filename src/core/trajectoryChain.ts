/**
 * Unified forward-chaining trajectory evaluator used by both the Observer Camera
 * and the illustrative Stage Camera.
 * Pure Layer 1 module with zero React or DOM dependencies.
 */

import type {
  CameraCueSpec,
  EvaluatedCameraTrack,
  EvaluatedEntityState,
  SphericalPose,
  StageScore,
  Vec3,
} from './types';
import { evaluateCameraEasing } from './maneuvers';
import {
  clampSphericalPose,
  cloneSphericalPose,
  sphericalToCartesian,
} from './sphericalMath';
import {
  ZERO_OFFSET,
  resolveShotDestOffset,
  resolveShotDestRoll,
  resolveShotStartOffset,
  resolveShotStartRoll,
  resolveTargetPoint3D,
} from './cameraTargetResolver';
import {
  evaluateShotCameraPose,
  evaluateSplineCameraPose,
  sampleTrajectoryPoints,
} from './shotPoseEvaluator';

// Re-export target resolution and shot-boundary reset helpers for backward compatibility
export {
  ZERO_OFFSET,
  resolveShotDestOffset,
  resolveShotDestRoll,
  resolveShotStartOffset,
  resolveShotStartRoll,
  resolveTargetPoint3D,
};

// Re-export single-shot pose evaluators and sampling helpers for backward compatibility
export {
  evaluateShotCameraPose,
  evaluateSplineCameraPose,
  sampleTrajectoryPoints,
};

export type TrackRole = 'observer' | 'stage';

interface NormalizedCameraCue {
  id: string;
  startSec: number;
  endSec: number;
  spec: CameraCueSpec;
}

function extractTrackCues(
  role: TrackRole,
  score: StageScore
): NormalizedCameraCue[] {
  if (role === 'observer' && score.observerShots !== undefined) {
    return score.observerShots
      .map((os) => ({
        id: os.id,
        startSec: os.startSec,
        endSec: os.endSec,
        spec: os.camera,
      }))
      .sort((a, b) => a.startSec - b.startSec);
  }

  const cues: NormalizedCameraCue[] = [];
  for (const s of score.shots) {
    const spec = role === 'observer' ? s.observerCamera : s.stageCamera;
    if (spec !== undefined) {
      cues.push({
        id: s.id,
        startSec: s.startSec,
        endSec: s.endSec,
        spec,
      });
    }
  }
  return cues.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Evaluates the complete deterministic camera trajectory chain for either 'observer' or 'stage'.
 */
export function evaluateCameraTrack(
  role: TrackRole,
  elapsedSec: number,
  score: StageScore,
  entitiesById: Map<string, EvaluatedEntityState>,
  initialPoseOverride?: SphericalPose
): EvaluatedCameraTrack {
  const defaultPose =
    role === 'observer'
      ? initialPoseOverride ?? score.stage.defaultObserverPose
      : score.stage.defaultStageCameraPose;

  const baselinePose = cloneSphericalPose(defaultPose);

  const cues = extractTrackCues(role, score);

  if (cues.length === 0) {
    return {
      active: false,
      isHold: true,
      shotId: null,
      maneuver: 'cut',
      transform: sphericalToCartesian(baselinePose, score.aspectRatio),
      trajectoryPoints: [],
      baseTarget: { ...baselinePose.target },
      targetOffset: ZERO_OFFSET,
    };
  }

  const cueStartPoses = new Map<NormalizedCameraCue, SphericalPose>();
  const cueEndPoses = new Map<NormalizedCameraCue, SphericalPose>();
  const cueStartOffsets = new Map<NormalizedCameraCue, Vec3>();
  const cueEndOffsets = new Map<NormalizedCameraCue, Vec3>();

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const spec = cue.spec;
    const prevPose =
      i > 0
        ? cueEndPoses.get(cues[i - 1]) ?? baselinePose
        : baselinePose;
    const prevOffset =
      i > 0
        ? cueEndOffsets.get(cues[i - 1]) ?? ZERO_OFFSET
        : ZERO_OFFSET;

    const startOffset = resolveShotStartOffset(spec, prevOffset);
    const endOffset = resolveShotDestOffset(spec);
    cueStartOffsets.set(cue, startOffset);
    cueEndOffsets.set(cue, endOffset);

    const startTarget = spec.from
      ? resolveTargetPoint3D(
          spec.from,
          entitiesById,
          prevPose.target,
          startOffset
        )
      : spec.target
      ? resolveTargetPoint3D(
          spec.target,
          entitiesById,
          prevPose.target,
          startOffset
        )
      : {
          x: prevPose.target.x + startOffset.x,
          y: prevPose.target.y + startOffset.y,
          z: prevPose.target.z + startOffset.z,
        };

    const isContinuousStageMove =
      role === 'stage' &&
      Boolean(score.continuous) &&
      i > 0 &&
      spec.maneuver !== 'cut';

    const startDistance =
      spec.distanceStart ??
      (isContinuousStageMove
        ? prevPose.distance
        : spec.distance ?? prevPose.distance);

    const startPitch =
      spec.pitchStartRad ??
      (isContinuousStageMove
        ? prevPose.pitch
        : spec.pitchRad ?? prevPose.pitch);

    const startYaw =
      spec.yawStartRad ??
      (isContinuousStageMove || spec.yawDeltaRad !== undefined
        ? prevPose.yaw
        : spec.yawRad ?? prevPose.yaw);

    const startRoll = resolveShotStartRoll(spec, prevPose, baselinePose);

    const P_start = clampSphericalPose({
      target: startTarget,
      distance: startDistance,
      pitch: startPitch,
      yaw: startYaw,
      roll: startRoll,
      focalLengthMm:
        spec.focalLengthStartMm ?? spec.focalLengthMm ?? prevPose.focalLengthMm,
    });

    cueStartPoses.set(cue, P_start);

    const durationSec = Math.max(0.016, cue.endSec - cue.startSec);
    const P_end = evaluateShotCameraPose(
      P_start,
      spec,
      1.0,
      durationSec,
      entitiesById,
      baselinePose,
      startOffset
    );
    cueEndPoses.set(cue, P_end);
  }

  // 1. Check if a cue is currently active at elapsedSec
  const activeCue = cues
    .slice()
    .reverse()
    .find((c) => elapsedSec >= c.startSec && elapsedSec < c.endSec);

  if (activeCue) {
    const spec = activeCue.spec;
    const startPose = cueStartPoses.get(activeCue) ?? baselinePose;
    const startOffset = cueStartOffsets.get(activeCue) ?? ZERO_OFFSET;
    const durationSec = Math.max(0.016, activeCue.endSec - activeCue.startSec);
    const tRaw = Math.min(
      1,
      Math.max(0, (elapsedSec - activeCue.startSec) / durationSec)
    );
    const livePose = evaluateShotCameraPose(
      startPose,
      spec,
      tRaw,
      durationSec,
      entitiesById,
      baselinePose,
      startOffset
    );
    const trajectoryPoints = sampleTrajectoryPoints(
      startPose,
      spec,
      durationSec,
      entitiesById,
      score.aspectRatio,
      baselinePose,
      startOffset
    );

    const u = evaluateCameraEasing(spec.easing, tRaw);
    const endOffset = resolveShotDestOffset(spec);
    const liveOffset: Vec3 = {
      x: startOffset.x + (endOffset.x - startOffset.x) * u,
      y: startOffset.y + (endOffset.y - startOffset.y) * u,
      z: startOffset.z + (endOffset.z - startOffset.z) * u,
    };
    const baseTarget: Vec3 = {
      x: livePose.target.x - liveOffset.x,
      y: livePose.target.y - liveOffset.y,
      z: livePose.target.z - liveOffset.z,
    };

    return {
      active: true,
      isHold: false,
      shotId: activeCue.id,
      maneuver: spec.maneuver,
      transform: sphericalToCartesian(livePose, score.aspectRatio),
      trajectoryPoints,
      baseTarget,
      targetOffset: liveOffset,
    };
  }

  // 2. Before first cue starts
  if (elapsedSec < cues[0].startSec) {
    const firstStart = cueStartPoses.get(cues[0]) ?? baselinePose;
    const firstOffset = cueStartOffsets.get(cues[0]) ?? ZERO_OFFSET;
    return {
      active: false,
      isHold: true,
      shotId: null,
      maneuver: 'cut',
      transform: sphericalToCartesian(firstStart, score.aspectRatio),
      trajectoryPoints: [],
      baseTarget: {
        x: firstStart.target.x - firstOffset.x,
        y: firstStart.target.y - firstOffset.y,
        z: firstStart.target.z - firstOffset.z,
      },
      targetOffset: firstOffset,
    };
  }

  // 3. In a gap between cues or at/after the end of the timeline
  const lastFinished = cues
    .slice()
    .reverse()
    .find((c) => elapsedSec >= c.endSec);

  const heldPose =
    (lastFinished ? cueEndPoses.get(lastFinished) : undefined) ?? baselinePose;
  const heldSpec = lastFinished?.spec;
  const heldStart =
    (lastFinished ? cueStartPoses.get(lastFinished) : undefined) ?? heldPose;
  const heldStartOffset =
    (lastFinished ? cueStartOffsets.get(lastFinished) : undefined) ??
    ZERO_OFFSET;
  const heldEndOffset = heldSpec ? resolveShotDestOffset(heldSpec) : ZERO_OFFSET;
  const heldDuration = lastFinished
    ? Math.max(0.016, lastFinished.endSec - lastFinished.startSec)
    : 1.0;

  return {
    active: false,
    isHold: true,
    shotId: lastFinished?.id ?? null,
    maneuver: heldSpec?.maneuver ?? 'cut',
    transform: sphericalToCartesian(heldPose, score.aspectRatio),
    trajectoryPoints: heldSpec
      ? sampleTrajectoryPoints(
          heldStart,
          heldSpec,
          heldDuration,
          entitiesById,
          score.aspectRatio,
          baselinePose,
          heldStartOffset
        )
      : [],
    baseTarget: {
      x: heldPose.target.x - heldEndOffset.x,
      y: heldPose.target.y - heldEndOffset.y,
      z: heldPose.target.z - heldEndOffset.z,
    },
    targetOffset: heldEndOffset,
  };
}
