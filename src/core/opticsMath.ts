/**
 * Pure optical calculations converting directorial lens focal length (mm)
 * and film gate aspect ratio into Three.js vertical FOV (degrees) and
 * rectangular 3D frustum gate dimensions.
 */

import {
  CAMERA_LIMITS,
  DEFAULT_ASPECT_RATIO,
  FULL_FRAME_SENSOR_WIDTH_MM,
  RAD_TO_DEG,
  VIEWFINDER_GATE_SCALE,
} from './constants';

/**
 * Clamps a focal length in mm to valid optical bounds.
 */
export function clampFocalLengthMm(focalLengthMm: number): number {
  if (!Number.isFinite(focalLengthMm) || focalLengthMm <= 0) {
    return 50;
  }
  return Math.max(
    CAMERA_LIMITS.MIN_FOCAL_LENGTH_MM,
    Math.min(CAMERA_LIMITS.MAX_FOCAL_LENGTH_MM, focalLengthMm)
  );
}

/**
 * Parses aspect ratio strings like "16:9", "2.39:1", "2.35:1", "4:3", "9:16"
 * or numeric floats into a positive aspect ratio (width / height).
 */
export function parseAspectRatio(raw?: string | number | null): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0.1) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));
      if (
        parts.length === 2 &&
        Number.isFinite(parts[0]) &&
        Number.isFinite(parts[1]) &&
        parts[0] > 0 &&
        parts[1] > 0
      ) {
        return parts[0] / parts[1];
      }
    }
    const num = parseFloat(trimmed);
    if (Number.isFinite(num) && num > 0.1) {
      return num;
    }
  }
  return DEFAULT_ASPECT_RATIO;
}

/**
 * Converts a full-frame equivalent lens focal length (in mm) and gate aspect ratio
 * into a Three.js vertical Field of View (FOV in degrees).
 *
 * Formula:
 *   sensorHeight = sensorWidth / aspectRatio
 *   fovVertDeg = 2 * atan(sensorHeight / (2 * focalLength)) * (180 / PI)
 */
export function focalLengthToVerticalFovDeg(
  focalLengthMm: number,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  sensorWidthMm = FULL_FRAME_SENSOR_WIDTH_MM
): number {
  const f = clampFocalLengthMm(focalLengthMm);
  const safeAspect = aspectRatio > 0.1 ? aspectRatio : DEFAULT_ASPECT_RATIO;
  const sensorHeightMm = sensorWidthMm / safeAspect;
  const fovRad = 2 * Math.atan(sensorHeightMm / (2 * f));
  return fovRad * RAD_TO_DEG;
}

/**
 * Converts a Three.js vertical FOV (in degrees) back into an equivalent
 * full-frame focal length (in mm).
 */
export function verticalFovDegToFocalLengthMm(
  fovDeg: number,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  sensorWidthMm = FULL_FRAME_SENSOR_WIDTH_MM
): number {
  const safeFovDeg = Math.max(5, Math.min(150, fovDeg));
  const safeAspect = aspectRatio > 0.1 ? aspectRatio : DEFAULT_ASPECT_RATIO;
  const sensorHeightMm = sensorWidthMm / safeAspect;
  const halfFovRad = (safeFovDeg * 0.5) / RAD_TO_DEG;
  const f = sensorHeightMm / (2 * Math.tan(halfFovRad));
  return clampFocalLengthMm(f);
}

/**
 * Computes the physical width and height (in meters) of the rectangular camera film gate
 * projected at a distance `depthMeters` from the lens nodal point.
 */
export function computeFrustumGateDimensions(
  focalLengthMm: number,
  depthMeters: number,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  sensorWidthMm = FULL_FRAME_SENSOR_WIDTH_MM
): {
  gateWidth: number;
  gateHeight: number;
  halfWidth: number;
  halfHeight: number;
} {
  const f = clampFocalLengthMm(focalLengthMm);
  const safeDepth = Math.max(0.1, depthMeters);
  const safeAspect = aspectRatio > 0.1 ? aspectRatio : DEFAULT_ASPECT_RATIO;
  const sensorHeightMm = sensorWidthMm / safeAspect;

  const gateWidth = safeDepth * (sensorWidthMm / f);
  const gateHeight = safeDepth * (sensorHeightMm / f);

  return {
    gateWidth,
    gateHeight,
    halfWidth: gateWidth * 0.5,
    halfHeight: gateHeight * 0.5,
  };
}

/**
 * Computes the pixel width and height of a film gate of `gateAspect` contained within
 * a viewport of `(containerWidth, containerHeight)` scaled by `gateScale`.
 */
export function computeContainedGateDimensionsPx(
  containerWidth: number,
  containerHeight: number,
  gateAspect = DEFAULT_ASPECT_RATIO,
  gateScale = VIEWFINDER_GATE_SCALE
): { width: number; height: number } {
  const safeW = Math.max(1, containerWidth);
  const safeH = Math.max(1, containerHeight);
  const safeAspect = gateAspect > 0.1 ? gateAspect : DEFAULT_ASPECT_RATIO;
  const availW = safeW * gateScale;
  const availH = safeH * gateScale;

  if (availW / availH > safeAspect) {
    return {
      width: availH * safeAspect,
      height: availH,
    };
  }
  return {
    width: availW,
    height: availW / safeAspect,
  };
}

/**
 * Computes the compensated Three.js PerspectiveCamera vertical FOV (in degrees)
 * for the full canvas so that the vertical and horizontal FOV inside the contained
 * active film gate matches `gateFovDeg` and `gateAspect` across any viewport aspect ratio.
 */
export function computeViewfinderCanvasFovDeg(
  gateFovDeg: number,
  canvasWidth: number,
  canvasHeight: number,
  gateAspect = DEFAULT_ASPECT_RATIO,
  gateScale = VIEWFINDER_GATE_SCALE
): number {
  const safeGateFov = Math.max(1, Math.min(160, gateFovDeg));
  const { height: gateHeight } = computeContainedGateDimensionsPx(
    canvasWidth,
    canvasHeight,
    gateAspect,
    gateScale
  );
  const safeCanvasH = Math.max(1, canvasHeight);
  const heightRatio = safeCanvasH / Math.max(1, gateHeight);
  const halfGateFovRad = (safeGateFov * 0.5) / RAD_TO_DEG;
  const canvasFovRad = 2 * Math.atan(heightRatio * Math.tan(halfGateFovRad));
  return Math.max(1, Math.min(165, canvasFovRad * RAD_TO_DEG));
}
