import { describe, expect, it } from 'vitest';
import {
  cartesianToSpherical,
  computeLookAtYawRad,
  degToRad,
  radToDeg,
  shortestAngleDiff,
  sphericalToCartesian,
} from '../../src/core/sphericalMath';
import type { SphericalPose } from '../../src/core/types';

describe('sphericalMath — Metric Coordinates & Shortest-Angle Unwrapping', () => {
  it('converts degrees to radians and back accurately', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45, 6);
    expect(radToDeg(degToRad(-135))).toBeCloseTo(-135, 6);
  });

  it('unwraps shortestAngleDiff across the -PI / +PI boundary without 360-deg spin flips', () => {
    const a = degToRad(170);
    const b = degToRad(-170);
    // Moving from +170 deg to -170 deg should be +20 deg, never -340 deg
    const diff = shortestAngleDiff(b, a);
    expect(radToDeg(diff)).toBeCloseTo(20, 4);

    const reverseDiff = shortestAngleDiff(a, b);
    expect(radToDeg(reverseDiff)).toBeCloseTo(-20, 4);
  });

  it('round-trips SphericalPose -> Cartesian -> SphericalPose identically', () => {
    const initialPose: SphericalPose = {
      target: { x: -0.9, y: 1.35, z: 0.4 },
      distance: 3.4,
      pitch: degToRad(18),
      yaw: degToRad(-35),
      roll: 0,
      focalLengthMm: 50,
    };

    const transform = sphericalToCartesian(initialPose, 16 / 9);
    const recovered = cartesianToSpherical(
      transform.position,
      transform.target,
      initialPose.focalLengthMm
    );

    expect(recovered.target.x).toBeCloseTo(initialPose.target.x, 5);
    expect(recovered.target.y).toBeCloseTo(initialPose.target.y, 5);
    expect(recovered.target.z).toBeCloseTo(initialPose.target.z, 5);
    expect(recovered.distance).toBeCloseTo(initialPose.distance, 5);
    expect(recovered.pitch).toBeCloseTo(initialPose.pitch, 5);
    expect(recovered.yaw).toBeCloseTo(initialPose.yaw, 5);
    expect(recovered.roll).toBeCloseTo(0, 5);
    expect(recovered.focalLengthMm).toBe(50);
  });

  it('preserves position invariance across arbitrary camera roll angles', () => {
    const basePose: SphericalPose = {
      target: { x: 1.2, y: 0.8, z: -2.1 },
      distance: 4.5,
      pitch: degToRad(22),
      yaw: degToRad(40),
      roll: 0,
      focalLengthMm: 35,
    };

    const tLevel = sphericalToCartesian(basePose, 16 / 9);
    const tRolled15 = sphericalToCartesian({ ...basePose, roll: degToRad(15) }, 16 / 9);
    const tRolled90 = sphericalToCartesian({ ...basePose, roll: degToRad(90) }, 16 / 9);
    const tRolledNeg45 = sphericalToCartesian({ ...basePose, roll: degToRad(-45) }, 16 / 9);

    // Camera 3D Eye Position must be 100% bit-for-bit identical regardless of roll
    expect(tRolled15.position.x).toBeCloseTo(tLevel.position.x, 8);
    expect(tRolled15.position.y).toBeCloseTo(tLevel.position.y, 8);
    expect(tRolled15.position.z).toBeCloseTo(tLevel.position.z, 8);

    expect(tRolled90.position.x).toBeCloseTo(tLevel.position.x, 8);
    expect(tRolled90.position.y).toBeCloseTo(tLevel.position.y, 8);
    expect(tRolled90.position.z).toBeCloseTo(tLevel.position.z, 8);

    expect(tRolledNeg45.position.x).toBeCloseTo(tLevel.position.x, 8);
    expect(tRolledNeg45.position.y).toBeCloseTo(tLevel.position.y, 8);
    expect(tRolledNeg45.position.z).toBeCloseTo(tLevel.position.z, 8);
  });

  it('computes orthonormal rolled up-vector math accurately across cardinal angles', () => {
    // 1. Level horizon at pitch = 0, yaw = 0 -> Up must be (0, 1, 0)
    const t0 = sphericalToCartesian({
      target: { x: 0, y: 0, z: 0 },
      distance: 5,
      pitch: 0,
      yaw: 0,
      roll: 0,
      focalLengthMm: 50,
    });
    expect(t0.up.x).toBeCloseTo(0, 5);
    expect(t0.up.y).toBeCloseTo(1, 5);
    expect(t0.up.z).toBeCloseTo(0, 5);

    // 2. Roll = +90 deg (CW tilt from operator POV) -> Top of camera points toward camera right (+X)
    const t90 = sphericalToCartesian({
      target: { x: 0, y: 0, z: 0 },
      distance: 5,
      pitch: 0,
      yaw: 0,
      roll: degToRad(90),
      focalLengthMm: 50,
    });
    expect(t90.up.x).toBeCloseTo(1, 5);
    expect(t90.up.y).toBeCloseTo(0, 5);
    expect(t90.up.z).toBeCloseTo(0, 5);

    // 3. Roll = -90 deg (CCW tilt from operator POV) -> Top of camera points toward camera left (-X)
    const tNeg90 = sphericalToCartesian({
      target: { x: 0, y: 0, z: 0 },
      distance: 5,
      pitch: 0,
      yaw: 0,
      roll: degToRad(-90),
      focalLengthMm: 50,
    });
    expect(tNeg90.up.x).toBeCloseTo(-1, 5);
    expect(tNeg90.up.y).toBeCloseTo(0, 5);
    expect(tNeg90.up.z).toBeCloseTo(0, 5);

    // 4. Roll = 180 deg (Inverted upside-down camera) -> Up must be (0, -1, 0)
    const t180 = sphericalToCartesian({
      target: { x: 0, y: 0, z: 0 },
      distance: 5,
      pitch: 0,
      yaw: 0,
      roll: degToRad(180),
      focalLengthMm: 50,
    });
    expect(t180.up.x).toBeCloseTo(0, 5);
    expect(t180.up.y).toBeCloseTo(-1, 5);
    expect(t180.up.z).toBeCloseTo(0, 5);

    // 5. Verification of orthonormality under combined pitch, yaw, and roll
    const tArbitrary = sphericalToCartesian({
      target: { x: -1.5, y: 1.2, z: 3.0 },
      distance: 6.2,
      pitch: degToRad(-35),
      yaw: degToRad(70),
      roll: degToRad(25),
      focalLengthMm: 85,
    });

    // Magnitude must be 1.0
    const upLen = Math.hypot(tArbitrary.up.x, tArbitrary.up.y, tArbitrary.up.z);
    expect(upLen).toBeCloseTo(1.0, 5);

    // Forward sightline vector from eye to target
    const dx = tArbitrary.target.x - tArbitrary.position.x;
    const dy = tArbitrary.target.y - tArbitrary.position.y;
    const dz = tArbitrary.target.z - tArbitrary.position.z;
    const fLen = Math.hypot(dx, dy, dz);
    const fx = dx / fLen;
    const fy = dy / fLen;
    const fz = dz / fLen;

    // Up vector must be strictly orthogonal to forward sightline (dot product = 0)
    const dotProduct = tArbitrary.up.x * fx + tArbitrary.up.y * fy + tArbitrary.up.z * fz;
    expect(dotProduct).toBeCloseTo(0, 5);
  });

  it('computes horizontal lookAt facing yaw in Y-up space', () => {
    // Facing +Z
    expect(
      radToDeg(computeLookAtYawRad({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }))
    ).toBeCloseTo(0, 5);
    // Facing +X
    expect(
      radToDeg(computeLookAtYawRad({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }))
    ).toBeCloseTo(90, 5);
    // Facing -X
    expect(
      radToDeg(computeLookAtYawRad({ x: 0, y: 0, z: 0 }, { x: -5, y: 0, z: 0 }))
    ).toBeCloseTo(-90, 5);
  });
});
