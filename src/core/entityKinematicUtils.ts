/**
 * Shared kinematic types and geometry utilities for entity evaluation.
 * Pure Layer 1 module with zero React or DOM dependencies.
 */

import type {
  BlockingCueSpec,
  SceneEntityDef,
  Vec3,
} from './types';

export interface EntityPoseSnapshot {
  position: Vec3;
  rotationYRad: number;
  visible: boolean;
}

export interface ChainedBlockingCueEntry {
  cue: BlockingCueSpec;
  startPos: Vec3;
  endPos: Vec3;
  startRot: number;
  endRot: number;
  visible: boolean;
  isCut?: boolean;
}

/**
 * Resolves a lookAt target (entity ID, entity label, "center", or explicit Vec3) into world coordinates.
 */
export function resolveLookAtPoint(
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
export function buildGroundTrailPoints(startPos: Vec3, endPos: Vec3): Vec3[] {
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
