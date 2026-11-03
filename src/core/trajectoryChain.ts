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
 * Resolves an anchor key (entity ID, preset name, or Vec3) into a 3D world look-at point.
 */
export function resolveTargetPoint3D(
  targetKey: string | Vec3 | undefined,
  entitiesById: Map<string, EvaluatedEntityState>,
  fallbackTarget: Vec3
): Vec3 {
  if (!targetKey) {
    return { ...fallbackTarget };
  }
  if (typeof targetKey === 'object') {
    return { ...targetKey };
  }

  const clean = targetKey.trim().toLowerCase();
  if (clean === 'center' || clean === 'origin' || clean === 'stage') {
    return { x: 0, y: 1.0, z: 0 };
  }

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
      return {
        x: ent.position.x,
        y: anchorY,
        z: ent.position.z,
      };
    }
  }

  return { ...fallbackTarget };
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
    const target = resolveTargetPoint3D(wp.target, entitiesById, prev.target);
    resolvedWaypoints.push(
      clampSphericalPose({
        target,
        distance: wp.distance ?? prev.distance,
        pitch: wp.pitchRad ?? prev.pitch,
        yaw: wp.yawRad ?? prev.yaw,
        focalLengthMm: wp.focalLengthMm ?? prev.focalLengthMm,
      })
    );
  }

  if (resolvedWaypoints.length === 1) {
    return resolvedWaypoints[0];
  }

  // Unwrap yaw angles across waypoints to prevent 360-deg spin flips
  for (let i = 1; i < resolvedWaypoints.length; i++) {
    const prevYaw = resolvedWaypoints[i - 1].yaw;
    const currYaw = resolvedWaypoints[i].yaw;
    resolvedWaypoints[i].yaw = prevYaw + shortestAngleDiff(currYaw, prevYaw);
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
  entitiesById: Map<string, EvaluatedEntityState>
): SphericalPose {
  const u = evaluateCameraEasing(spec.easing, tRaw);

  if (spec.maneuver === 'spline' && spec.waypoints && spec.waypoints.length > 0) {
    return evaluateSplineCameraPose(P0, spec, u, entitiesById);
  }

  const destTarget = resolveTargetPoint3D(spec.target, entitiesById, P0.target);

  let destYaw = P0.yaw;
  if (spec.yawEndRad !== undefined) {
    destYaw = spec.yawEndRad;
  } else if (spec.yawRad !== undefined) {
    destYaw = spec.yawRad;
  } else if (spec.yawDeltaRad !== undefined) {
    destYaw = P0.yaw + spec.yawDeltaRad;
  }

  const P1: SphericalPose = clampSphericalPose({
    target: destTarget,
    distance: spec.distanceEnd ?? spec.distance ?? P0.distance,
    pitch: spec.pitchEndRad ?? spec.pitchRad ?? P0.pitch,
    yaw: destYaw,
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
      entitiesById
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
    };
  }

  const cueStartPoses = new Map<NormalizedCameraCue, SphericalPose>();
  const cueEndPoses = new Map<NormalizedCameraCue, SphericalPose>();

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const spec = cue.spec;
    const prevPose =
      i > 0
        ? cueEndPoses.get(cues[i - 1]) ?? baselinePose
        : baselinePose;

    const startTarget = spec.from
      ? resolveTargetPoint3D(spec.from, entitiesById, prevPose.target)
      : spec.target && spec.maneuver !== 'dolly' && spec.maneuver !== 'straight'
      ? resolveTargetPoint3D(spec.target, entitiesById, prevPose.target)
      : { ...prevPose.target };

    const P_start = clampSphericalPose({
      target: startTarget,
      distance: spec.distanceStart ?? spec.distance ?? prevPose.distance,
      pitch: spec.pitchStartRad ?? spec.pitchRad ?? prevPose.pitch,
      yaw: spec.yawStartRad ?? prevPose.yaw,
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
      entitiesById
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
      entitiesById
    );
    const trajectoryPoints = sampleTrajectoryPoints(
      startPose,
      spec,
      durationSec,
      entitiesById,
      score.aspectRatio
    );

    return {
      active: true,
      isHold: false,
      shotId: activeCue.id,
      maneuver: spec.maneuver,
      transform: sphericalToCartesian(livePose, score.aspectRatio),
      trajectoryPoints,
    };
  }

  // 2. Before first cue starts
  if (elapsedSec < cues[0].startSec) {
    const firstStart = cueStartPoses.get(cues[0]) ?? baselinePose;
    return {
      active: false,
      isHold: true,
      shotId: null,
      maneuver: 'cut',
      transform: sphericalToCartesian(firstStart, score.aspectRatio),
      trajectoryPoints: [],
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
          score.aspectRatio
        )
      : [],
  };
}
