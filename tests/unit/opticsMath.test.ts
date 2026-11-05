import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveDioramaFovDeg,
  computeContainedGateDimensionsPx,
  computeFrustumGateDimensions,
  computeViewfinderCanvasFovDeg,
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

  it('computes contained viewfinder gate pixel dimensions across wide and tall viewports', () => {
    // 16:9 gate in a wide 1600x900 viewport (scale = 0.84)
    const wide = computeContainedGateDimensionsPx(1600, 900, 16 / 9, 0.84);
    expect(wide.height).toBeCloseTo(900 * 0.84, 5);
    expect(wide.width).toBeCloseTo(wide.height * (16 / 9), 5);

    // 16:9 gate in a narrow 500x1000 viewport (scale = 0.84)
    const tall = computeContainedGateDimensionsPx(500, 1000, 16 / 9, 0.84);
    expect(tall.width).toBeCloseTo(500 * 0.84, 5);
    expect(tall.height).toBeCloseTo(tall.width / (16 / 9), 5);
  });

  it('calculates compensated canvas FOV so framing inside the contained gate matches target lens FOV', () => {
    // In a wide canvas (height constrained), canvas FOV must scale with canvasHeight / gateHeight
    const targetGateFov = 39.6; // ~50mm lens vertical FOV
    const canvasFov = computeViewfinderCanvasFovDeg(targetGateFov, 1600, 900, 16 / 9, 0.84);
    expect(canvasFov).toBeGreaterThan(targetGateFov);

    // In a tall canvas where gate height is much smaller than canvas height, canvas FOV widens further
    const tallCanvasFov = computeViewfinderCanvasFovDeg(targetGateFov, 500, 1000, 16 / 9, 0.84);
    expect(tallCanvasFov).toBeGreaterThan(canvasFov);
  });

  it('computes adaptive diorama FOV preserving horizontal stage framing in split workspace layouts (Approach A)', () => {
    const baseFov = 38.0; // ~35mm lens vertical FOV at 16:9

    // 1. In standard 16:9 viewport (1920x1080), aspect == 16:9, must return baseFov exactly
    const full16x9Fov = computeAdaptiveDioramaFovDeg(baseFov, 1920, 1080, 16 / 9);
    expect(full16x9Fov).toBeCloseTo(baseFov, 5);

    // 2. In ultrawide viewport (2560x1080, aspect > 16:9), must also return baseFov
    const ultraWideFov = computeAdaptiveDioramaFovDeg(baseFov, 2560, 1080, 16 / 9);
    expect(ultraWideFov).toBeCloseTo(baseFov, 5);

    // 3. In 50/50 split workspace (960x900, aspect = 1.0667 < 16:9), vertical FOV must expand
    const splitFov = computeAdaptiveDioramaFovDeg(baseFov, 960, 900, 16 / 9);
    expect(splitFov).toBeGreaterThan(baseFov);

    // Verify that the resulting horizontal FOV in split matches the baseline 16:9 horizontal FOV
    const baselineHalfHRad = (baseFov * 0.5 * Math.PI) / 180;
    const expectedHalfHorizTan = (16 / 9) * Math.tan(baselineHalfHRad);

    const splitAspect = 960 / 900;
    const splitHalfHRad = (splitFov * 0.5 * Math.PI) / 180;
    const splitActualHorizTan = splitAspect * Math.tan(splitHalfHRad);

    expect(splitActualHorizTan).toBeCloseTo(expectedHalfHorizTan, 5);
  });
});
