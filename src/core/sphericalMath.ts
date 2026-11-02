/**
 * Pure spherical and Cartesian coordinate mathematics for 3D camera blocking.
 * Uses Three.js right-handed Y-up convention:
 *   +X = Stage Right
 *   +Y = Up (Floor is Y = 0)
 *   +Z = Stage Front (Toward default viewer)
 */

import type { CameraTransform3D, SphericalPose, Vec3 } from './types';
import {
  CAMERA_LIMITS,
  DEFAULT_ASPECT_RATIO,
  DEG_TO_RAD,
  RAD_TO_DEG,
} from './constants';
import { clampFocalLengthMm, focalLengthToVerticalFovDeg } from './opticsMath';

export function degToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function radToDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

export function cloneVec3(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function cloneSphericalPose(pose: SphericalPose): SphericalPose {
  return {
    target: { ...pose.target },
    distance: pose.distance,
    pitch: pose.pitch,
    yaw: pose.yaw,
    focalLengthMm: pose.focalLengthMm,
  };
}

/**
 * Clamps a SphericalPose within valid pitch, distance, and optical bounds.
 */
export function clampSphericalPose(pose: SphericalPose): SphericalPose {
  return {
    target: {
      x: Number.isFinite(pose.target.x) ? pose.target.x : 0,
      y: Number.isFinite(pose.target.y) ? pose.target.y : 0,
      z: Number.isFinite(pose.target.z) ? pose.target.z : 0,
    },
    distance: Math.max(
      CAMERA_LIMITS.MIN_DISTANCE_M,
      Math.min(
        CAMERA_LIMITS.MAX_DISTANCE_M,
        Number.isFinite(pose.distance) ? pose.distance : 5.0
      )
    ),
    pitch: Math.max(
      CAMERA_LIMITS.MIN_PITCH_RAD,
      Math.min(
        CAMERA_LIMITS.MAX_PITCH_RAD,
        Number.isFinite(pose.pitch) ? pose.pitch : 0.25
      )
    ),
    yaw: Number.isFinite(pose.yaw) ? pose.yaw : 0,
    focalLengthMm: clampFocalLengthMm(pose.focalLengthMm),
  };
}

/**
 * Calculates shortest signed angular difference (in radians) from `currentRad` to `targetRad`
 * on the circle [-PI, PI], eliminating 360-degree rotation flips.
 */
export function shortestAngleDiff(targetRad: number, currentRad: number): number {
  let diff = (targetRad - currentRad) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

/**
 * Converts a SphericalPose into a 3D world-space CameraTransform3D.
 *
 * Equations:
 *   x = target.x + d * cos(pitch) * sin(yaw)
 *   y = target.y + d * sin(pitch)
 *   z = target.z + d * cos(pitch) * cos(yaw)
 */
export function sphericalToCartesian(
  rawPose: SphericalPose,
  aspectRatio = DEFAULT_ASPECT_RATIO
): CameraTransform3D {
  const pose = clampSphericalPose(rawPose);
  const cosPitch = Math.cos(pose.pitch);
  const sinPitch = Math.sin(pose.pitch);
  const sinYaw = Math.sin(pose.yaw);
  const cosYaw = Math.cos(pose.yaw);

  const position: Vec3 = {
    x: pose.target.x + pose.distance * cosPitch * sinYaw,
    y: pose.target.y + pose.distance * sinPitch,
    z: pose.target.z + pose.distance * cosPitch * cosYaw,
  };

  const fovDeg = focalLengthToVerticalFovDeg(pose.focalLengthMm, aspectRatio);

  return {
    pose,
    position,
    target: { ...pose.target },
    fovDeg,
    aspectRatio,
  };
}

/**
 * Inverse conversion: computes a SphericalPose from a 3D world-space eye position
 * and look-at target point (used when OrbitControls moves the camera freely).
 */
export function cartesianToSpherical(
  eye: Vec3,
  target: Vec3,
  focalLengthMm = 35
): SphericalPose {
  const dx = eye.x - target.x;
  const dy = eye.y - target.y;
  const dz = eye.z - target.z;

  const distance = Math.max(
    CAMERA_LIMITS.MIN_DISTANCE_M,
    Math.hypot(dx, dy, dz)
  );
  const horizDist = Math.hypot(dx, dz);
  const pitch = Math.atan2(dy, horizDist);
  const yaw = horizDist > 1e-5 ? Math.atan2(dx, dz) : 0;

  return clampSphericalPose({
    target: { ...target },
    distance,
    pitch,
    yaw,
    focalLengthMm,
  });
}

/**
 * Computes the horizontal yaw angle (in radians) for an entity at `from` to face toward `to`.
 * In Three.js Y-up space, yaw = 0 faces +Z, yaw = PI/2 faces +X.
 */
export function computeLookAtYawRad(from: Vec3, to: Vec3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1e-5) {
    return 0;
  }
  return Math.atan2(dx, dz);
}
