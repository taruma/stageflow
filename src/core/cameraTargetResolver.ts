/**
 * Camera target anchor resolution and shot-boundary roll/offset reset semantics.
 * Pure Layer 1 module with zero React or DOM dependencies.
 */

import type {
  CameraCueSpec,
  EvaluatedEntityState,
  SphericalPose,
  Vec3,
} from './types';
import { ENTITY_DEFAULTS } from './constants';

export const ZERO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Resolves starting roll for a shot:
 * - In standard mode (isContinuous = false): Resets to baselinePose.roll (0 rad) unless explicitly specified or continuing a delta/end (Option A).
 * - In continuous mode (isContinuous = true): Preserves prevPose.roll unless explicitly specified, gliding into authored roll.
 */
export function resolveShotStartRoll(
  spec: CameraCueSpec,
  prevPose: SphericalPose,
  baselinePose: SphericalPose,
  isContinuous = false
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
    return isContinuous ? prevPose.roll : spec.rollRad;
  }
  return isContinuous ? prevPose.roll : baselinePose.roll;
}

export function resolveShotDestRoll(
  P0: SphericalPose,
  spec: CameraCueSpec,
  baselinePose: SphericalPose,
  isContinuous = false
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
  return isContinuous ? P0.roll : baselinePose.roll;
}

/**
 * Resolves starting 3D target offset for a shot:
 * - In standard mode (isContinuous = false): Resets to (0, 0, 0) unless explicitly specified or continuing via target_offset_end (Option A).
 * - In continuous mode (isContinuous = true): Preserves prevOffset unless explicitly specified, gliding into authored offset.
 */
export function resolveShotStartOffset(
  spec: CameraCueSpec,
  prevOffset: Vec3 = ZERO_OFFSET,
  isContinuous = false
): Vec3 {
  if (spec.targetOffsetStart !== undefined) {
    return { ...spec.targetOffsetStart };
  }
  if (spec.targetOffsetEnd !== undefined) {
    return spec.targetOffset ? { ...spec.targetOffset } : { ...prevOffset };
  }
  if (spec.targetOffset !== undefined) {
    return isContinuous ? { ...prevOffset } : { ...spec.targetOffset };
  }
  return isContinuous ? { ...prevOffset } : { ...ZERO_OFFSET };
}

export function resolveShotDestOffset(
  spec: CameraCueSpec,
  prevOffset: Vec3 = ZERO_OFFSET,
  isContinuous = false
): Vec3 {
  if (spec.targetOffsetEnd !== undefined) {
    return { ...spec.targetOffsetEnd };
  }
  if (spec.targetOffset !== undefined) {
    return { ...spec.targetOffset };
  }
  return isContinuous ? { ...prevOffset } : { ...ZERO_OFFSET };
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
