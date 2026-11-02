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
    expect(recovered.focalLengthMm).toBe(50);
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
