import { describe, expect, it } from 'vitest';
import {
  computeFrustumGateDimensions,
  focalLengthToVerticalFovDeg,
  parseAspectRatio,
  verticalFovDegToFocalLengthMm,
} from '../../src/core/opticsMath';

describe('opticsMath — Directorial Lens & Frustum Gate Calculations', () => {
  it('parses standard cinematic aspect ratio strings and numbers', () => {
    expect(parseAspectRatio('16:9')).toBeCloseTo(16 / 9, 5);
    expect(parseAspectRatio('2.39:1')).toBeCloseTo(2.39, 5);
    expect(parseAspectRatio('4:3')).toBeCloseTo(4 / 3, 5);
    expect(parseAspectRatio(1.85)).toBeCloseTo(1.85, 5);
    expect(parseAspectRatio(undefined)).toBeCloseTo(16 / 9, 5);
  });

  it('converts standard cinema focal lengths (24mm, 35mm, 50mm, 85mm) to vertical FOV and round-trips cleanly', () => {
    const lenses = [24, 35, 50, 85];
    for (const lensMm of lenses) {
      const fov16x9 = focalLengthToVerticalFovDeg(lensMm, 16 / 9);
      expect(fov16x9).toBeGreaterThan(5);
      expect(fov16x9).toBeLessThan(90);

      const roundTrip = verticalFovDegToFocalLengthMm(fov16x9, 16 / 9);
      expect(roundTrip).toBeCloseTo(lensMm, 4);
    }

    // Longer focal lengths must produce narrower vertical FOVs
    const fov24 = focalLengthToVerticalFovDeg(24, 16 / 9);
    const fov50 = focalLengthToVerticalFovDeg(50, 16 / 9);
    const fov85 = focalLengthToVerticalFovDeg(85, 16 / 9);
    expect(fov24).toBeGreaterThan(fov50);
    expect(fov50).toBeGreaterThan(fov85);
  });

  it('computes rectangular film gate frustum dimensions matching the target aspect ratio', () => {
    const gate16x9 = computeFrustumGateDimensions(50, 4.0, 16 / 9);
    expect(gate16x9.gateWidth / gate16x9.gateHeight).toBeCloseTo(16 / 9, 5);
    expect(gate16x9.halfWidth).toBeCloseTo(gate16x9.gateWidth * 0.5, 5);

    const gateScope = computeFrustumGateDimensions(35, 6.5, 2.39);
    expect(gateScope.gateWidth / gateScope.gateHeight).toBeCloseTo(2.39, 5);
  });
});
