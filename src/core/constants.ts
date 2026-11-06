/**
 * Centralized Single Source of Truth (SSOT) for metric spatial bounds,
 * standard cinema lens focal lengths, and blueprint color tokens.
 */

import type { SphericalPose } from './types';

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Standard 35mm Full-Frame horizontal sensor gate width in millimeters (36mm x 24mm).
 */
export const FULL_FRAME_SENSOR_WIDTH_MM = 36.0;

/**
 * Standard widescreen 16:9 aspect ratio.
 */
export const DEFAULT_ASPECT_RATIO = 16 / 9;

/**
 * Proportion of the diorama viewport occupied by the active film gate in Stage Cam POV,
 * leaving a minimum 8% Look-Around margin on all sides for off-frame staging & HUD chrome.
 */
export const VIEWFINDER_GATE_SCALE = 0.84;

/**
 * Metric camera and pitch boundaries.
 */
export const CAMERA_LIMITS = {
  MIN_PITCH_RAD: -85 * DEG_TO_RAD,
  MAX_PITCH_RAD: 85 * DEG_TO_RAD,
  MIN_DISTANCE_M: 0.4,
  MAX_DISTANCE_M: 40.0,
  MIN_FOCAL_LENGTH_MM: 12,
  MAX_FOCAL_LENGTH_MM: 200,
} as const;

/**
 * Default Observer Camera pose (elevated 3/4 architectural overview in meters).
 */
export const DEFAULT_OBSERVER_POSE: SphericalPose = {
  target: { x: 0, y: 1.0, z: 0 },
  distance: 7.5,
  pitch: 26 * DEG_TO_RAD,
  yaw: 38 * DEG_TO_RAD,
  roll: 0,
  focalLengthMm: 35,
};

/**
 * Default Stage Camera pose (eye-level 50mm standard prime).
 */
export const DEFAULT_STAGE_CAMERA_POSE: SphericalPose = {
  target: { x: 0, y: 1.2, z: 0 },
  distance: 3.2,
  pitch: 6 * DEG_TO_RAD,
  yaw: -25 * DEG_TO_RAD,
  roll: 0,
  focalLengthMm: 50,
};

/**
 * Default Entity dimensions in meters.
 */
export const ENTITY_DEFAULTS = {
  CHARACTER_HEIGHT_M: 1.75,
  CHARACTER_RADIUS_M: 0.26,
  CHARACTER_LOOK_ANCHOR_RATIO: 0.9, // Eye-level target height ratio (~1.575m for standard 1.75m character)
  PROP_HEIGHT_M: 0.85,
  PROP_RADIUS_M: 0.35,
  MARKER_HEIGHT_M: 0.15,
  MARKER_RADIUS_M: 0.25,
} as const;

/**
 * Minimalist Blueprint Palette tokens.
 */
export const BLUEPRINT_PALETTE = {
  background: '#050811',
  gridMajor: '#1e293b',
  gridMinor: '#0f172a',
  stageCamera: '#f59e0b',
  frustumDefault: '#f59e0b',
  observerAccent: '#38bdf8',
  characterPrimary: '#38bdf8',
  characterSecondary: '#a78bfa',
  characterTertiary: '#34d399',
  propDefault: '#94a3b8',
  markerDefault: '#fb7185',
} as const;
