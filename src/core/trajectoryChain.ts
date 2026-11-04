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
import { evaluateEntitiesAtTime } from './entityEngine';

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

interface CueTrackCache {
  cues: NormalizedCameraCue[];
  cueStartOffsets: Map<string, Vec3>;
  cueEndOffsets: Map<string, Vec3>;
  cueBaseStartPoses: Map<string, SphericalPose>;
  cueEndPoses: Map<string, SphericalPose>;
  cueTrajectoryPoints: Map<string, Vec3[]>;
}

const trackCache = new WeakMap<StageScore, Map<string, CueTrackCache>>();

function sampleCueTrajectoryPoints(
  cue: NormalizedCameraCue,
  score: StageScore,
  prevEndPose: SphericalPose,
  baselinePose: SphericalPose,
  prevEndOffset: Vec3,
  role: TrackRole,
  isFirst: boolean,
  samples = 32
): Vec3[] {
  const spec = cue.spec;
  if (spec.maneuver === 'cut') {
    return [];
  }

  const durationSec = Math.max(0.016, cue.endSec - cue.startSec);
  const startOffset = resolveShotStartOffset(spec, prevEndOffset);
  const isContinuousStageMove =
    role === 'stage' &&
    Boolean(score.continuous) &&
    !isFirst;

  const startDistance =
    spec.distanceStart ??
    (isContinuousStageMove
      ? prevEndPose.distance
      : spec.distance ?? prevEndPose.distance);

  const startPitch =
    spec.pitchStartRad ??
    (isContinuousStageMove
      ? prevEndPose.pitch
      : spec.pitchRad ?? prevEndPose.pitch);

  const startYaw =
    spec.yawStartRad ??
    (isContinuousStageMove || spec.yawDeltaRad !== undefined
      ? prevEndPose.yaw
      : spec.yawRad ?? prevEndPose.yaw);

  const startRoll = resolveShotStartRoll(spec, prevEndPose, baselinePose);

  const points: Vec3[] = [];
  for (let i = 0; i <= samples; i++) {
    const frac = i / samples;
    const t = cue.startSec + frac * durationSec;
    const { entitiesById } = evaluateEntitiesAtTime(t, score);

    const targetAtT = spec.from
      ? resolveTargetPoint3D(
          spec.from,
          entitiesById,
          prevEndPose.target,
          startOffset
        )
      : spec.target
      ? resolveTargetPoint3D(
          spec.target,
          entitiesById,
          prevEndPose.target,
          startOffset
        )
      : {
          x: prevEndPose.target.x + startOffset.x,
          y: prevEndPose.target.y + startOffset.y,
          z: prevEndPose.target.z + startOffset.z,
        };

    const P_start = clampSphericalPose({
      target: targetAtT,
      distance: startDistance,
      pitch: startPitch,
      yaw: startYaw,
      roll: startRoll,
      focalLengthMm:
        spec.focalLengthStartMm ?? spec.focalLengthMm ?? prevEndPose.focalLengthMm,
    });

    const pose = evaluateShotCameraPose(
      P_start,
      spec,
      frac,
      durationSec,
      entitiesById,
      baselinePose,
      startOffset
    );
    const cart = sphericalToCartesian(pose, score.aspectRatio);
    points.push(cart.position);
  }

  return points;
}

function getOrCreateCueTrackCache(
  role: TrackRole,
  score: StageScore,
  baselinePose: SphericalPose,
  initialPoseOverride?: SphericalPose
): CueTrackCache {
  let scoreMap = trackCache.get(score);
  if (!scoreMap) {
    scoreMap = new Map();
    trackCache.set(score, scoreMap);
  }

  const cacheKey = `${role}:${
    initialPoseOverride
      ? `${initialPoseOverride.yaw.toFixed(4)}_${initialPoseOverride.pitch.toFixed(4)}_${initialPoseOverride.distance.toFixed(4)}`
      : 'default'
  }`;

  const cached = scoreMap.get(cacheKey);
  if (cached) {
    return cached;
  }

  const cues = extractTrackCues(role, score);
  const cueStartOffsets = new Map<string, Vec3>();
  const cueEndOffsets = new Map<string, Vec3>();
  const cueBaseStartPoses = new Map<string, SphericalPose>();
  const cueEndPoses = new Map<string, SphericalPose>();
  const cueTrajectoryPoints = new Map<string, Vec3[]>();

  let runningPose = baselinePose;
  let runningOffset = ZERO_OFFSET;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const points = sampleCueTrajectoryPoints(
      cue,
      score,
      runningPose,
      baselinePose,
      runningOffset,
      role,
      i === 0
    );
    cueTrajectoryPoints.set(cue.id, points);

    // Advance runningPose and runningOffset for contiguous chaining
    const { entitiesById: endEntities } = evaluateEntitiesAtTime(cue.endSec, score);
    const startOffset = resolveShotStartOffset(cue.spec, runningOffset);
    const endOffset = resolveShotDestOffset(cue.spec);
    cueStartOffsets.set(cue.id, startOffset);
    cueEndOffsets.set(cue.id, endOffset);
    runningOffset = endOffset;

    const startTarget = cue.spec.from
      ? resolveTargetPoint3D(
          cue.spec.from,
          endEntities,
          runningPose.target,
          startOffset
        )
      : cue.spec.target
      ? resolveTargetPoint3D(
          cue.spec.target,
          endEntities,
          runningPose.target,
          startOffset
        )
      : {
          x: runningPose.target.x + startOffset.x,
          y: runningPose.target.y + startOffset.y,
          z: runningPose.target.z + startOffset.z,
        };

    const isContinuous =
      role === 'stage' &&
      Boolean(score.continuous) &&
      i > 0 &&
      cue.spec.maneuver !== 'cut';

    const pStart = clampSphericalPose({
      target: startTarget,
      distance:
        cue.spec.distanceStart ??
        (isContinuous ? runningPose.distance : cue.spec.distance ?? runningPose.distance),
      pitch:
        cue.spec.pitchStartRad ??
        (isContinuous ? runningPose.pitch : cue.spec.pitchRad ?? runningPose.pitch),
      yaw:
        cue.spec.yawStartRad ??
        (isContinuous || cue.spec.yawDeltaRad !== undefined
          ? runningPose.yaw
          : cue.spec.yawRad ?? runningPose.yaw),
      roll: resolveShotStartRoll(cue.spec, runningPose, baselinePose),
      focalLengthMm:
        cue.spec.focalLengthStartMm ?? cue.spec.focalLengthMm ?? runningPose.focalLengthMm,
    });

    cueBaseStartPoses.set(cue.id, pStart);

    const dur = Math.max(0.016, cue.endSec - cue.startSec);
    runningPose = evaluateShotCameraPose(
      pStart,
      cue.spec,
      1.0,
      dur,
      endEntities,
      baselinePose,
      startOffset
    );
    cueEndPoses.set(cue.id, runningPose);
  }

  const data: CueTrackCache = {
    cues,
    cueStartOffsets,
    cueEndOffsets,
    cueBaseStartPoses,
    cueEndPoses,
    cueTrajectoryPoints,
  };

  scoreMap.set(cacheKey, data);
  return data;
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

  const trackCacheData = getOrCreateCueTrackCache(
    role,
    score,
    baselinePose,
    initialPoseOverride
  );
  const cues = trackCacheData.cues;

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

  // 1. Check if a cue is currently active at elapsedSec
  const activeCue = cues
    .slice()
    .reverse()
    .find((c) => elapsedSec >= c.startSec && elapsedSec < c.endSec);

  if (activeCue) {
    const spec = activeCue.spec;
    const basePose =
      trackCacheData.cueBaseStartPoses.get(activeCue.id) ?? baselinePose;
    const startOffset =
      trackCacheData.cueStartOffsets.get(activeCue.id) ?? ZERO_OFFSET;
    const durationSec = Math.max(0.016, activeCue.endSec - activeCue.startSec);
    const tRaw = Math.min(
      1,
      Math.max(0, (elapsedSec - activeCue.startSec) / durationSec)
    );

    const startTarget = spec.from
      ? resolveTargetPoint3D(
          spec.from,
          entitiesById,
          basePose.target,
          startOffset
        )
      : spec.target
      ? resolveTargetPoint3D(
          spec.target,
          entitiesById,
          basePose.target,
          startOffset
        )
      : {
          x: basePose.target.x + startOffset.x,
          y: basePose.target.y + startOffset.y,
          z: basePose.target.z + startOffset.z,
        };

    const startPose = clampSphericalPose({
      ...basePose,
      target: startTarget,
    });

    const livePose = evaluateShotCameraPose(
      startPose,
      spec,
      tRaw,
      durationSec,
      entitiesById,
      baselinePose,
      startOffset
    );
    const trajectoryPoints =
      trackCacheData.cueTrajectoryPoints.get(activeCue.id) ?? [];

    const u = evaluateCameraEasing(spec.easing, tRaw);
    const endOffset =
      trackCacheData.cueEndOffsets.get(activeCue.id) ?? resolveShotDestOffset(spec);
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
    const firstBase =
      trackCacheData.cueBaseStartPoses.get(cues[0].id) ?? baselinePose;
    const firstOffset =
      trackCacheData.cueStartOffsets.get(cues[0].id) ?? ZERO_OFFSET;
    return {
      active: false,
      isHold: true,
      shotId: null,
      maneuver: 'cut',
      transform: sphericalToCartesian(firstBase, score.aspectRatio),
      trajectoryPoints: [],
      baseTarget: {
        x: firstBase.target.x - firstOffset.x,
        y: firstBase.target.y - firstOffset.y,
        z: firstBase.target.z - firstOffset.z,
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
    (lastFinished
      ? trackCacheData.cueEndPoses.get(lastFinished.id)
      : undefined) ?? baselinePose;
  const heldSpec = lastFinished?.spec;
  const heldEndOffset = lastFinished
    ? trackCacheData.cueEndOffsets.get(lastFinished.id) ?? ZERO_OFFSET
    : ZERO_OFFSET;
  const heldTrajectoryPoints = lastFinished
    ? trackCacheData.cueTrajectoryPoints.get(lastFinished.id) ?? []
    : [];

  return {
    active: false,
    isHold: true,
    shotId: lastFinished?.id ?? null,
    maneuver: heldSpec?.maneuver ?? 'cut',
    transform: sphericalToCartesian(heldPose, score.aspectRatio),
    trajectoryPoints: heldTrajectoryPoints,
    baseTarget: {
      x: heldPose.target.x - heldEndOffset.x,
      y: heldPose.target.y - heldEndOffset.y,
      z: heldPose.target.z - heldEndOffset.z,
    },
    targetOffset: heldEndOffset,
  };
}
