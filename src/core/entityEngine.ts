/**
 * Deterministic per-shot entity kinematics evaluator.
 * Traces entity positions, facing rotations, look_at targets, and ground trails across shots.
 */

import type {
  EvaluatedEntityState,
  SceneEntityDef,
  ShotCue,
  StageScore,
  Vec3,
} from './types';
import { evaluateCameraEasing } from './maneuvers';
import {
  cloneVec3,
  computeLookAtYawRad,
  shortestAngleDiff,
} from './sphericalMath';

interface EntityPoseSnapshot {
  position: Vec3;
  rotationYRad: number;
  visible: boolean;
}

/**
 * Resolves a lookAt target (either an entity ID or explicit Vec3) into world coordinates.
 */
function resolveLookAtPoint(
  lookAt: string | Vec3 | undefined,
  currentPositions: Map<string, Vec3>
): Vec3 | null {
  if (!lookAt) return null;
  if (typeof lookAt === 'object') {
    return lookAt;
  }
  const trimmed = lookAt.trim().toLowerCase();
  for (const [id, pos] of currentPositions.entries()) {
    if (id.toLowerCase() === trimmed) {
      return pos;
    }
  }
  return null;
}

/**
 * Evaluates all scene entities at a given timestamp (in seconds).
 * Traces forward state across preceding shots so entity movements persist across cuts.
 */
export function evaluateEntitiesAtTime(
  elapsedSec: number,
  score: StageScore
): {
  entitiesById: Map<string, EvaluatedEntityState>;
  entitiesList: EvaluatedEntityState[];
} {
  const sortedShots = [...score.shots].sort((a, b) => a.startSec - b.startSec);

  // Initialize baseline poses from SceneEntityDef
  const baselinePoses = new Map<string, EntityPoseSnapshot>();
  for (const def of score.entities) {
    baselinePoses.set(def.id, {
      position: cloneVec3(def.position),
      rotationYRad: def.rotationYRad,
      visible: true,
    });
  }

  // Track start and end poses per shot for every entity
  const shotStartPoses = new Map<ShotCue, Map<string, EntityPoseSnapshot>>();
  const shotEndPoses = new Map<ShotCue, Map<string, EntityPoseSnapshot>>();

  let runningPoses = new Map<string, EntityPoseSnapshot>();
  for (const [id, pose] of baselinePoses.entries()) {
    runningPoses.set(id, {
      position: cloneVec3(pose.position),
      rotationYRad: pose.rotationYRad,
      visible: pose.visible,
    });
  }

  for (const shot of sortedShots) {
    const startMap = new Map<string, EntityPoseSnapshot>();
    const endMap = new Map<string, EntityPoseSnapshot>();

    // First pass: determine start and end positions for this shot
    const endPositions = new Map<string, Vec3>();
    for (const def of score.entities) {
      const prev = runningPoses.get(def.id)!;
      const override = shot.entities[def.id];

      const startPos = override?.fromPosition
        ? cloneVec3(override.fromPosition)
        : cloneVec3(prev.position);
      const endPos = override?.position
        ? cloneVec3(override.position)
        : cloneVec3(startPos);

      startMap.set(def.id, {
        position: startPos,
        rotationYRad: prev.rotationYRad,
        visible: override?.visible ?? prev.visible,
      });
      endPositions.set(def.id, endPos);
    }

    // Second pass: resolve end rotations (including lookAt)
    for (const def of score.entities) {
      const startSnap = startMap.get(def.id)!;
      const override = shot.entities[def.id];
      const endPos = endPositions.get(def.id)!;

      let endRot = startSnap.rotationYRad;
      if (override?.rotationYRad !== undefined) {
        endRot = override.rotationYRad;
      } else if (override?.lookAt) {
        const targetPt = resolveLookAtPoint(override.lookAt, endPositions);
        if (targetPt) {
          endRot = computeLookAtYawRad(endPos, targetPt);
        }
      } else if (
        Math.hypot(
          endPos.x - startSnap.position.x,
          endPos.z - startSnap.position.z
        ) > 0.05
      ) {
        // Automatically face along walking direction if moving without explicit rotation
        endRot = computeLookAtYawRad(startSnap.position, endPos);
      }

      const endSnap: EntityPoseSnapshot = {
        position: endPos,
        rotationYRad: endRot,
        visible: override?.visible ?? startSnap.visible,
      };
      endMap.set(def.id, endSnap);
    }

    shotStartPoses.set(shot, startMap);
    shotEndPoses.set(shot, endMap);
    runningPoses = endMap;
  }

  // Find active shot or most recent finished shot at elapsedSec
  const activeShot = sortedShots
    .slice()
    .reverse()
    .find((s) => elapsedSec >= s.startSec && elapsedSec < s.endSec);

  const lastFinishedShot = sortedShots
    .slice()
    .reverse()
    .find((s) => elapsedSec >= s.endSec);

  const entitiesById = new Map<string, EvaluatedEntityState>();
  const entitiesList: EvaluatedEntityState[] = [];

  // First pass at current timestamp: interpolate positions
  const livePositions = new Map<string, Vec3>();
  const rawStates = new Map<
    string,
    {
      def: SceneEntityDef;
      startSnap: EntityPoseSnapshot;
      endSnap: EntityPoseSnapshot;
      u: number;
      highlighted: boolean;
      visible: boolean;
      note?: string;
    }
  >();

  for (const def of score.entities) {
    if (activeShot) {
      const startSnap =
        shotStartPoses.get(activeShot)?.get(def.id) ??
        baselinePoses.get(def.id)!;
      const endSnap =
        shotEndPoses.get(activeShot)?.get(def.id) ?? startSnap;
      const override = activeShot.entities[def.id];
      const shotDuration = Math.max(0.016, activeShot.endSec - activeShot.startSec);
      const tRaw = Math.min(
        1,
        Math.max(0, (elapsedSec - activeShot.startSec) / shotDuration)
      );
      const u = evaluateCameraEasing(override?.easing ?? 'smooth', tRaw);

      const pos: Vec3 = {
        x:
          startSnap.position.x +
          u * (endSnap.position.x - startSnap.position.x),
        y:
          startSnap.position.y +
          u * (endSnap.position.y - startSnap.position.y),
        z:
          startSnap.position.z +
          u * (endSnap.position.z - startSnap.position.z),
      };
      livePositions.set(def.id, pos);
      rawStates.set(def.id, {
        def,
        startSnap,
        endSnap,
        u,
        highlighted: Boolean(override?.highlighted),
        visible: override?.visible ?? startSnap.visible,
        note: override?.note,
      });
    } else if (lastFinishedShot) {
      const heldSnap =
        shotEndPoses.get(lastFinishedShot)?.get(def.id) ??
        baselinePoses.get(def.id)!;
      livePositions.set(def.id, cloneVec3(heldSnap.position));
      rawStates.set(def.id, {
        def,
        startSnap: heldSnap,
        endSnap: heldSnap,
        u: 1,
        highlighted: false,
        visible: heldSnap.visible,
      });
    } else {
      const baseSnap = baselinePoses.get(def.id)!;
      livePositions.set(def.id, cloneVec3(baseSnap.position));
      rawStates.set(def.id, {
        def,
        startSnap: baseSnap,
        endSnap: baseSnap,
        u: 0,
        highlighted: false,
        visible: baseSnap.visible,
      });
    }
  }

  // Second pass: resolve live facing angles (including dynamic lookAt) & floor trails
  for (const def of score.entities) {
    const item = rawStates.get(def.id)!;
    const pos = livePositions.get(def.id)!;
    const override = activeShot?.entities[def.id];

    let rotY =
      item.startSnap.rotationYRad +
      item.u *
        shortestAngleDiff(
          item.endSnap.rotationYRad,
          item.startSnap.rotationYRad
        );

    if (override?.lookAt) {
      const lookTarget = resolveLookAtPoint(override.lookAt, livePositions);
      if (lookTarget) {
        rotY = computeLookAtYawRad(pos, lookTarget);
      }
    }

    // Generate ground movement trail if moving during active shot
    const trailPoints: Vec3[] = [];
    const moveDist = Math.hypot(
      item.endSnap.position.x - item.startSnap.position.x,
      item.endSnap.position.y - item.startSnap.position.y,
      item.endSnap.position.z - item.startSnap.position.z
    );
    if (moveDist > 0.05) {
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        trailPoints.push({
          x:
            item.startSnap.position.x +
            frac * (item.endSnap.position.x - item.startSnap.position.x),
          y: 0.02, // Slightly above floor plane to avoid z-fighting
          z:
            item.startSnap.position.z +
            frac * (item.endSnap.position.z - item.startSnap.position.z),
        });
      }
    }

    const state: EvaluatedEntityState = {
      id: def.id,
      def,
      position: pos,
      rotationYRad: rotY,
      highlighted: item.highlighted,
      visible: item.visible,
      note: item.note,
      trailPoints,
    };

    entitiesById.set(def.id, state);
    entitiesList.push(state);
  }

  return { entitiesById, entitiesList };
}
