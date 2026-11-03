/**
 * Unified forward-chaining trajectory evaluator used by both the Observer Camera
 * and the illustrative Stage Camera.
 */

import type {
  CameraCueSpec,
  EvaluatedCameraTrack,
  EvaluatedEntityState,
  SphericalPose,
  StageScore,
  Vec3,
} from './types';
import { ENTITY_DEFAULTS } from './constants';
import {
  catmullRomScalar,
  evaluateCameraEasing,
  evaluateManeuverPose,
} from './maneuvers';
import {
  clampSphericalPose,
  cloneSphericalPose,
  shortestAngleDiff,
  sphericalToCartesian,
} from './sphericalMath';

export type TrackRole = 'observer' | 'stage';

/**
 * Resolves starting roll for a shot according to Option A semantics:
 * Resets to baselinePose.roll (0 rad) unless explicitly specified or continuing a delta/end.
 */
export function resolveShotStartRoll(
  spec: CameraCueSpec,
  prevPose: SphericalPose,
  baselinePose: SphericalPose
): number {
  if (spec.rollStartRad !== undefined) {
    return spec.rollStartRad;
  }
  if (spec.rollDeltaRad !== undefined) {
    return spec.rollRad ?? prevPose.roll;
  }
  if (spec.rollEndRad !== undefined) {
    return prevPose.roll;
  }
  if (spec.rollRad !== undefined) {
    return spec.rollRad;
  }
  return baselinePose.roll;
}

export function resolveShotDestRoll(
  P0: SphericalPose,
  spec: CameraCueSpec,
  baselinePose: SphericalPose
): number {
  if (spec.rollEndRad !== undefined) {
    return spec.rollEndRad;
  }
  if (spec.rollDeltaRad !== undefined) {
    return P0.roll + spec.rollDeltaRad;
  }
  if (spec.rollRad !== undefined) {
    return spec.rollRad;
  }
  return baselinePose.roll;
}

const ZERO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Resolves starting 3D target offset for a shot according to Option A semantics:
 * Resets to (0, 0, 0) unless explicitly specified or continuing via target_offset_end.
 */
export function resolveShotStartOffset(
  spec: CameraCueSpec,
  prevOffset: Vec3 = ZERO_OFFSET
): Vec3 {
  if (spec.targetOffsetStart !== undefined) {
    return { ...spec.targetOffsetStart };
  }
  if (spec.targetOffsetEnd !== undefined) {
    return spec.targetOffset ? { ...spec.targetOffset } : { ...prevOffset };
  }
  if (spec.targetOffset !== undefined) {
    return { ...spec.targetOffset };
  }
  return { ...ZERO_OFFSET };
}

export function resolveShotDestOffset(spec: CameraCueSpec): Vec3 {
  if (spec.targetOffsetEnd !== undefined) {
    return { ...spec.targetOffsetEnd };
  }
  if (spec.targetOffset !== undefined) {
    return { ...spec.targetOffset };
  }
  return { ...ZERO_OFFSET };
}

/**
 * Resolves an anchor key (entity ID, preset name, or Vec3) into a 3D world look-at point,
 * applying an optional world-space metric offset [dx, dy, dz].
 */
export function resolveTargetPoint3D(
  targetKey: string | Vec3 | undefined,
  entitiesById: Map<string, EvaluatedEntityState>,
  fallbackTarget: Vec3,
  offset?: Vec3
): Vec3 {
  let base: Vec3 | undefined;

  if (!targetKey) {
    base = { ...fallbackTarget };
  } else if (typeof targetKey === 'object') {
    base = { ...targetKey };
  } else {
    const clean = targetKey.trim().toLowerCase();
    if (clean === 'center' || clean === 'origin' || clean === 'stage') {
      base = { x: 0, y: 1.0, z: 0 };
    } else {
      // Match entity by ID or label
      for (const ent of entitiesById.values()) {
        if (
          ent.id.toLowerCase() === clean ||
          ent.def.label.toLowerCase() === clean
        ) {
          const anchorY =
            ent.def.kind === 'character'
              ? ent.position.y +
                ent.def.height * ENTITY_DEFAULTS.CHARACTER_LOOK_ANCHOR_RATIO
              : ent.position.y + ent.def.height * 0.5;
          base = {
            x: ent.position.x,
            y: anchorY,
            z: ent.position.z,
          };
          break;
        }
      }
    }
  }

  const resolved = base ?? { ...fallbackTarget };
  if (!offset) {
    return resolved;
  }
  return {
    x: resolved.x + offset.x,
    y: resolved.y + offset.y,
    z: resolved.z + offset.z,
  };
}

/**
 * Evaluates a Catmull-Rom spline camera path across multiple waypoints.
 */
function evaluateSplineCameraPose(
  startPose: SphericalPose,
  spec: CameraCueSpec,
  u: number,
  entitiesById: Map<string, EvaluatedEntityState>
): SphericalPose {
  const rawWaypoints = spec.waypoints ?? [];
  if (rawWaypoints.length === 0) {
    return cloneSphericalPose(startPose);
  }

  const resolvedWaypoints: SphericalPose[] = [cloneSphericalPose(startPose)];
  for (const wp of rawWaypoints) {
    const prev = resolvedWaypoints[resolvedWaypoints.length - 1];
    const target =
      wp.target !== undefined
        ? resolveTargetPoint3D(
            wp.target,
            entitiesById,
            prev.target,
            wp.targetOffset
          )
        : wp.targetOffset !== undefined
        ? {
            x: prev.target.x + wp.targetOffset.x,
            y: prev.target.y + wp.targetOffset.y,
            z: prev.target.z + wp.targetOffset.z,
          }
        : { ...prev.target };
    resolvedWaypoints.push(
      clampSphericalPose({
        target,
        distance: wp.distance ?? prev.distance,
        pitch: wp.pitchRad ?? prev.pitch,
        yaw: wp.yawRad ?? prev.yaw,
        roll: wp.rollRad ?? prev.roll,
        focalLengthMm: wp.focalLengthMm ?? prev.focalLengthMm,
      })
    );
  }

  if (resolvedWaypoints.length === 1) {
    return resolvedWaypoints[0];
  }

  // Unwrap yaw and roll angles across waypoints to prevent 360-deg spin flips
  for (let i = 1; i < resolvedWaypoints.length; i++) {
    const prevYaw = resolvedWaypoints[i - 1].yaw;
    const currYaw = resolvedWaypoints[i].yaw;
    resolvedWaypoints[i].yaw = prevYaw + shortestAngleDiff(currYaw, prevYaw);

    const prevRoll = resolvedWaypoints[i - 1].roll;
    const currRoll = resolvedWaypoints[i].roll;
    resolvedWaypoints[i].roll = prevRoll + shortestAngleDiff(currRoll, prevRoll);
  }

  const numSegments = resolvedWaypoints.length - 1;
  const scaledT = Math.max(0, Math.min(1, u)) * numSegments;
  const segIdx = Math.min(numSegments - 1, Math.floor(scaledT));
  const segFrac = scaledT - segIdx;

  const p0 = resolvedWaypoints[Math.max(0, segIdx - 1)];
  const p1 = resolvedWaypoints[segIdx];
  const p2 = resolvedWaypoints[Math.min(resolvedWaypoints.length - 1, segIdx + 1)];
  const p3 = resolvedWaypoints[Math.min(resolvedWaypoints.length - 1, segIdx + 2)];

  return clampSphericalPose({
    target: {
      x: catmullRomScalar(
        p0.target.x,
        p1.target.x,
        p2.target.x,
        p3.target.x,
        segFrac
      ),
      y: catmullRomScalar(
        p0.target.y,
        p1.target.y,
        p2.target.y,
        p3.target.y,
        segFrac
      ),
      z: catmullRomScalar(
        p0.target.z,
        p1.target.z,
        p2.target.z,
        p3.target.z,
        segFrac
      ),
    },
    distance: catmullRomScalar(
      p0.distance,
      p1.distance,
      p2.distance,
      p3.distance,
      segFrac
    ),
    pitch: catmullRomScalar(p0.pitch, p1.pitch, p2.pitch, p3.pitch, segFrac),
    yaw: catmullRomScalar(p0.yaw, p1.yaw, p2.yaw, p3.yaw, segFrac),
    roll: catmullRomScalar(p0.roll, p1.roll, p2.roll, p3.roll, segFrac),
    focalLengthMm: catmullRomScalar(
      p0.focalLengthMm,
      p1.focalLengthMm,
      p2.focalLengthMm,
      p3.focalLengthMm,
      segFrac
    ),
  });
}

/**
 * Evaluates a single shot's camera pose at normalized progress tRaw in [0, 1].
 */
export function evaluateShotCameraPose(
  P0: SphericalPose,
  spec: CameraCueSpec,
  tRaw: number,
  durationSec: number,
  entitiesById: Map<string, EvaluatedEntityState>,
  baselinePose?: SphericalPose,
  startOffset: Vec3 = ZERO_OFFSET
): SphericalPose {
  const u = evaluateCameraEasing(spec.easing, tRaw);

  if (spec.maneuver === 'spline' && spec.waypoints && spec.waypoints.length > 0) {
    return evaluateSplineCameraPose(P0, spec, u, entitiesById);
  }

  const endOffset = resolveShotDestOffset(spec);
  const destTarget =
    spec.target !== undefined
      ? resolveTargetPoint3D(spec.target, entitiesById, P0.target, endOffset)
      : {
          x: P0.target.x + (endOffset.x - startOffset.x),
          y: P0.target.y + (endOffset.y - startOffset.y),
          z: P0.target.z + (endOffset.z - startOffset.z),
        };

  let destYaw = P0.yaw;
  if (spec.yawEndRad !== undefined) {
    destYaw = spec.yawEndRad;
  } else if (spec.yawRad !== undefined) {
    destYaw = spec.yawRad;
  } else if (spec.yawDeltaRad !== undefined) {
    destYaw = P0.yaw + spec.yawDeltaRad;
  }

  const effectiveBaseline = baselinePose ?? { ...P0, roll: 0 };
  const destRoll = resolveShotDestRoll(P0, spec, effectiveBaseline);

  const P1: SphericalPose = clampSphericalPose({
    target: destTarget,
    distance: spec.distanceEnd ?? spec.distance ?? P0.distance,
    pitch: spec.pitchEndRad ?? spec.pitchRad ?? P0.pitch,
    yaw: destYaw,
    roll: destRoll,
    focalLengthMm:
      spec.focalLengthEndMm ?? spec.focalLengthMm ?? P0.focalLengthMm,
  });

  return evaluateManeuverPose(P0, P1, spec, tRaw, u, durationSec);
}

/**
 * Samples 3D world-space camera eye positions along a shot's trajectory for visual path rendering.
 */
function sampleTrajectoryPoints(
  P0: SphericalPose,
  spec: CameraCueSpec,
  durationSec: number,
  entitiesById: Map<string, EvaluatedEntityState>,
  aspectRatio: number,
  baselinePose?: SphericalPose,
  startOffset: Vec3 = ZERO_OFFSET,
  samples = 32
): Vec3[] {
  if (spec.maneuver === 'cut') {
    return [];
  }
  const points: Vec3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pose = evaluateShotCameraPose(
      P0,
      spec,
      t,
      durationSec,
      entitiesById,
      baselinePose,
      startOffset
    );
    const cart = sphericalToCartesian(pose, aspectRatio);
    points.push(cart.position);
  }
  return points;
}

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

    const startYaw =
      spec.yawStartRad ??
      (spec.yawDeltaRad === undefined ? spec.yawRad : undefined) ??
      prevPose.yaw;

    const startRoll = resolveShotStartRoll(spec, prevPose, baselinePose);

    const P_start = clampSphericalPose({
      target: startTarget,
      distance: spec.distanceStart ?? spec.distance ?? prevPose.distance,
      pitch: spec.pitchStartRad ?? spec.pitchRad ?? prevPose.pitch,
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
