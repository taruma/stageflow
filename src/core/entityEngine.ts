/**
 * Deterministic entity kinematics evaluator.
 * Supports:
 *   - Tier 1: Decoupled root `blocking:` timeline (two-pass continuous multi-cut evaluation,
 *             Option A full-cue floor trails, pose hold persistence across gaps, and hybrid
 *             per-shot highlight/note overlays).
 *   - Tier 2: Legacy per-shot `shots[].entities` evaluation (100% backward compatible).
 */

import type {
  BlockingCueSpec,
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

interface ChainedBlockingCueEntry {
  cue: BlockingCueSpec;
  startPos: Vec3;
  endPos: Vec3;
  startRot: number;
  endRot: number;
  visible: boolean;
}

/**
 * Resolves a lookAt target (entity ID, entity label, "center", or explicit Vec3) into world coordinates.
 */
function resolveLookAtPoint(
  lookAt: string | Vec3 | undefined,
  currentPositions: Map<string, Vec3>,
  entities?: SceneEntityDef[]
): Vec3 | null {
  if (!lookAt) return null;
  if (typeof lookAt === 'object') {
    return lookAt;
  }
  const trimmed = lookAt.trim().toLowerCase();
  if (trimmed === 'center' || trimmed === 'origin' || trimmed === 'stage') {
    return { x: 0, y: 0, z: 0 };
  }
  for (const [id, pos] of currentPositions.entries()) {
    if (id.toLowerCase() === trimmed) {
      return pos;
    }
  }
  if (entities) {
    const matched = entities.find((e) => e.label.toLowerCase() === trimmed);
    if (matched) {
      return currentPositions.get(matched.id) ?? matched.position;
    }
  }
  return null;
}

/**
 * Generates a 16-segment ground movement trail when displacement exceeds 0.05m.
 */
function buildGroundTrailPoints(startPos: Vec3, endPos: Vec3): Vec3[] {
  const moveDist = Math.hypot(
    endPos.x - startPos.x,
    endPos.y - startPos.y,
    endPos.z - startPos.z
  );
  if (moveDist <= 0.05) return [];

  const trailPoints: Vec3[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    trailPoints.push({
      x: startPos.x + frac * (endPos.x - startPos.x),
      y: 0.02, // Slightly above floor plane to avoid z-fighting
      z: startPos.z + frac * (endPos.z - startPos.z),
    });
  }
  return trailPoints;
}

/**
 * Tier 1: Evaluates entities against the decoupled root `blocking:` timeline.
 */
function evaluateBlockingEntitiesAtTime(
  elapsedSec: number,
  score: StageScore
): {
  entitiesById: Map<string, EvaluatedEntityState>;
  entitiesList: EvaluatedEntityState[];
} {
  const blockingCues = score.blocking ?? [];
  const chainsByEntity = new Map<string, ChainedBlockingCueEntry[]>();

  // Pass 1: Build forward-chained 3D world position & visibility tracks per entity
  for (const def of score.entities) {
    const entityCues = blockingCues
      .filter((c) => c.entityId.toLowerCase() === def.id.toLowerCase())
      .sort((a, b) => a.startSec - b.startSec);

    let prevPos: Vec3 = cloneVec3(def.position);
    let prevVis: boolean = true;
    const entries: ChainedBlockingCueEntry[] = [];

    for (const cue of entityCues) {
      const startPos = cue.fromPosition
        ? cloneVec3(cue.fromPosition)
        : cloneVec3(prevPos);
      const endPos = cue.position
        ? cloneVec3(cue.position)
        : cloneVec3(startPos);
      const visible: boolean = cue.visible ?? prevVis;

      entries.push({
        cue,
        startPos,
        endPos,
        startRot: def.rotationYRad,
        endRot: def.rotationYRad,
        visible,
      });

      prevPos = cloneVec3(endPos);
      prevVis = visible;
    }

    chainsByEntity.set(def.id, entries);
  }

  // Helper to evaluate all entity positions at any arbitrary timestamp t
  const evaluatePositionsAt = (t: number): Map<string, Vec3> => {
    const posMap = new Map<string, Vec3>();
    for (const def of score.entities) {
      const chain = chainsByEntity.get(def.id) ?? [];
      const active = chain
        .slice()
        .reverse()
        .find((e) => t >= e.cue.startSec && t < e.cue.endSec);
      const lastFinished = chain
        .slice()
        .reverse()
        .find((e) => t >= e.cue.endSec);

      if (active) {
        const dur = Math.max(0.016, active.cue.endSec - active.cue.startSec);
        const tau = Math.min(1, Math.max(0, (t - active.cue.startSec) / dur));
        const u = evaluateCameraEasing(active.cue.easing, tau);
        posMap.set(def.id, {
          x: active.startPos.x + u * (active.endPos.x - active.startPos.x),
          y: active.startPos.y + u * (active.endPos.y - active.startPos.y),
          z: active.startPos.z + u * (active.endPos.z - active.startPos.z),
        });
      } else if (lastFinished) {
        posMap.set(def.id, cloneVec3(lastFinished.endPos));
      } else {
        posMap.set(def.id, cloneVec3(def.position));
      }
    }
    return posMap;
  };

  // Pass 2: Build forward-chained facing rotations (including C0 look_at handoff)
  for (const def of score.entities) {
    const chain = chainsByEntity.get(def.id) ?? [];
    let prevRot = def.rotationYRad;

    for (const entry of chain) {
      entry.startRot = prevRot;
      let endRot = entry.startRot;

      if (entry.cue.rotationYRad !== undefined) {
        endRot = entry.cue.rotationYRad;
      } else if (entry.cue.lookAt) {
        const sampleTime = Math.max(entry.cue.startSec, entry.cue.endSec - 1e-6);
        const posAtEnd = evaluatePositionsAt(sampleTime);
        const targetPt = resolveLookAtPoint(
          entry.cue.lookAt,
          posAtEnd,
          score.entities
        );
        if (targetPt) {
          endRot = computeLookAtYawRad(entry.endPos, targetPt);
        }
      } else if (
        Math.hypot(
          entry.endPos.x - entry.startPos.x,
          entry.endPos.z - entry.startPos.z
        ) > 0.05
      ) {
        endRot = computeLookAtYawRad(entry.startPos, entry.endPos);
      }

      entry.endRot = endRot;
      prevRot = endRot;
    }
  }

  // Resolve active film shot for hybrid per-shot focus metadata (highlighted / note)
  const sortedShots = [...score.shots].sort((a, b) => a.startSec - b.startSec);
  const activeShot = sortedShots
    .slice()
    .reverse()
    .find((s) => elapsedSec >= s.startSec && elapsedSec < s.endSec);

  const livePositions = evaluatePositionsAt(elapsedSec);
  const entitiesById = new Map<string, EvaluatedEntityState>();
  const entitiesList: EvaluatedEntityState[] = [];

  for (const def of score.entities) {
    const chain = chainsByEntity.get(def.id) ?? [];
    const pos = livePositions.get(def.id)!;
    const shotOv = activeShot?.entities[def.id];

    const active = chain
      .slice()
      .reverse()
      .find((e) => elapsedSec >= e.cue.startSec && elapsedSec < e.cue.endSec);
    const lastFinished = chain
      .slice()
      .reverse()
      .find((e) => elapsedSec >= e.cue.endSec);

    let rotY = def.rotationYRad;
    let visible = shotOv?.visible ?? true;
    let highlighted = Boolean(shotOv?.highlighted);
    let note = shotOv?.note;
    let trailPoints: Vec3[] = [];
    let cueId: string | null = 'preroll';

    if (active) {
      const dur = Math.max(0.016, active.cue.endSec - active.cue.startSec);
      const tau = Math.min(
        1,
        Math.max(0, (elapsedSec - active.cue.startSec) / dur)
      );
      const u = evaluateCameraEasing(active.cue.easing, tau);

      rotY =
        active.startRot +
        u * shortestAngleDiff(active.endRot, active.startRot);

      if (active.cue.lookAt) {
        const lookTarget = resolveLookAtPoint(
          active.cue.lookAt,
          livePositions,
          score.entities
        );
        if (lookTarget) {
          rotY = computeLookAtYawRad(pos, lookTarget);
        }
      }

      visible = active.visible;
      highlighted = Boolean(active.cue.highlighted ?? shotOv?.highlighted);
      note = active.cue.note ?? shotOv?.note;
      trailPoints = buildGroundTrailPoints(active.startPos, active.endPos);
      cueId = active.cue.id;
    } else if (lastFinished) {
      rotY = lastFinished.endRot;
      visible = lastFinished.visible;
      cueId = `hold:${lastFinished.cue.id}`;
    }

    const state: EvaluatedEntityState = {
      id: def.id,
      def,
      cueId,
      position: pos,
      rotationYRad: rotY,
      highlighted,
      visible,
      note,
      trailPoints,
    };

    entitiesById.set(def.id, state);
    entitiesList.push(state);
  }

  return { entitiesById, entitiesList };
}

/**
 * Evaluates all scene entities at a given timestamp (in seconds).
 * Delegates to Tier 1 decoupled `blocking:` when present, or falls back to
 * Tier 2 per-shot `shots[].entities` evaluation.
 */
export function evaluateEntitiesAtTime(
  elapsedSec: number,
  score: StageScore
): {
  entitiesById: Map<string, EvaluatedEntityState>;
  entitiesList: EvaluatedEntityState[];
} {
  if (score.blocking && score.blocking.length > 0) {
    return evaluateBlockingEntitiesAtTime(elapsedSec, score);
  }

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
        const targetPt = resolveLookAtPoint(
          override.lookAt,
          endPositions,
          score.entities
        );
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
      const shotDuration = Math.max(
        0.016,
        activeShot.endSec - activeShot.startSec
      );
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
      const lookTarget = resolveLookAtPoint(
        override.lookAt,
        livePositions,
        score.entities
      );
      if (lookTarget) {
        rotY = computeLookAtYawRad(pos, lookTarget);
      }
    }

    const trailPoints = buildGroundTrailPoints(
      item.startSnap.position,
      item.endSnap.position
    );

    const state: EvaluatedEntityState = {
      id: def.id,
      def,
      cueId: activeShot?.id ?? null,
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
