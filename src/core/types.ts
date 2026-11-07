/**
 * Core data contracts for the StageFlow 3D Camera-Blocking & Scene Choreography Diorama.
 * Zero React or DOM dependencies.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Internal normalized spherical pose (distance in meters, pitch/yaw in radians).
 */
export interface SphericalPose {
  target: Vec3;
  distance: number;      // meters
  pitch: number;         // radians (-PI/2 to +PI/2)
  yaw: number;           // radians
  roll: number;          // radians (0 = level horizon, + = CW camera tilt from operator POV)
  focalLengthMm: number; // e.g., 24, 35, 50, 85
}

/**
 * Derived 3D Cartesian transform ready for Three.js cameras and frustum meshes.
 */
export interface CameraTransform3D {
  pose: SphericalPose;
  position: Vec3;      // Eye position in meters
  target: Vec3;        // Look-at target in meters
  up: Vec3;            // Unit camera up-vector in world space (incorporating roll)
  fovDeg: number;      // Vertical FOV in degrees derived from focalLengthMm & aspect
  aspectRatio: number; // Gate aspect ratio (e.g. 16/9 = 1.7778, 2.39)
}

export type CameraManeuver =
  | 'cut'
  | 'dolly'
  | 'straight'
  | 'arc'
  | 'swoop'
  | 'orbit'
  | 'sweep'
  | 'spiral'
  | 'dive'
  | 'recoil'
  | 'spline';

export type CameraEasing =
  | 'smooth'
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'expo'
  | 'pop'
  | 'accel'
  | 'deccel'
  | 'cruise';

export type CameraViewMode = 'scripted' | 'free' | 'stage-pov';

export type LabelDisplayMode = 'all' | 'camera-only' | 'off';

export type SplitPreset = 'split' | 'full';

export interface WorkspaceLayoutDimensions {
  leftSplitPct: number;
  rightSplitPct: number;
  videoHeightPct: number;
  isSubpanelCollapsed: boolean;
}

export type AppThemeMode = 'auto' | 'light' | 'warm' | 'dark';
export type AppThemeCategory = 'light' | 'warm' | 'dark';
export type DioramaThemeMode = 'dark' | 'match-app' | 'warm' | 'light';

export type StoragePersistenceStatus =
  | 'bundled'
  | 'draft-saved'
  | 'custom'
  | 'saving';

export interface ToastNotification {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export type EntityKind = 'character' | 'prop' | 'marker';

export type PropShape = 'box' | 'cylinder' | 'sphere' | 'capsule';
export type MarkerShape = 'x' | 't' | 'circle' | 'puck';
export type EntityShape = PropShape | MarkerShape;

export type CharacterStyle = 'mannequin' | 'edges' | 'silhouette' | 'wireframe';
export type PropStyle = 'edges' | 'glass' | 'solid' | 'wireframe';
export type MarkerStyle = 'tape' | 'glow' | 'beacon';
export type EntityStyle = CharacterStyle | PropStyle | MarkerStyle;

export interface SceneEntityDef {
  id: string;
  label: string;
  kind: EntityKind;
  shape?: EntityShape;
  style?: EntityStyle;
  position: Vec3;       // Base position in meters (Y=0 is floor)
  rotationYRad: number; // Base facing yaw in radians (0 = +Z, PI = -Z)
  height: number;       // Height in meters (default 1.75m for character, 0.8m for prop)
  radius: number;       // Footprint radius in meters (default 0.28m)
  color: string;        // Hex or blueprint token
}

export interface EntityCueOverride {
  fromPosition?: Vec3;
  position?: Vec3;
  rotationYRad?: number;
  lookAt?: string | Vec3; // Entity ID or world Vec3 to face toward
  easing: CameraEasing;
  highlighted: boolean;
  visible: boolean;
  note?: string;
}

/**
 * An independent entity blocking cue with its own start/end time window,
 * decoupled from the film coverage shots.
 */
export interface BlockingCueSpec {
  id: string;
  label?: string;
  entityId: string;
  startSec: number;
  endSec: number;
  fromPosition?: Vec3;
  position?: Vec3;
  rotationYRad?: number;
  lookAt?: string | Vec3;
  easing: CameraEasing;
  highlighted?: boolean;
  visible?: boolean;
  note?: string;
}

export interface EvaluatedEntityState {
  id: string;
  def: SceneEntityDef;
  cueId?: string | null;
  position: Vec3;
  rotationYRad: number;
  highlighted: boolean;
  visible: boolean;
  note?: string;
  trailPoints: Vec3[]; // Sampled ground trail when moving during active cue/shot
}

export interface CameraWaypointSpec {
  target?: string | Vec3;
  targetOffset?: Vec3;
  distance?: number;
  pitchRad?: number;
  yawRad?: number;
  rollRad?: number;
  focalLengthMm?: number;
  at?: number;
}

export interface CameraCueSpec {
  continuous?: boolean;
  maneuver: CameraManeuver;
  easing: CameraEasing;
  target?: string | Vec3;
  from?: string | Vec3;
  targetOffset?: Vec3;
  targetOffsetStart?: Vec3;
  targetOffsetEnd?: Vec3;
  distance?: number;
  distanceStart?: number;
  distanceEnd?: number;
  pitchRad?: number;
  pitchStartRad?: number;
  pitchEndRad?: number;
  yawRad?: number;
  yawDeltaRad?: number;
  yawStartRad?: number;
  yawEndRad?: number;
  rollRad?: number;
  rollDeltaRad?: number;
  rollStartRad?: number;
  rollEndRad?: number;
  focalLengthMm?: number;
  focalLengthStartMm?: number;
  focalLengthEndMm?: number;
  breathe: number;
  direction: 'cw' | 'ccw';
  hasExplicitDirection?: boolean;
  revolutions?: number;
  orbitSpeedRad?: number;
  waypoints?: CameraWaypointSpec[];
  trackTarget: boolean;
}

export interface StageCameraCueSpec extends CameraCueSpec {
  frustumDepth: number; // Length of frustum cone in meters (default: distance to target)
  frustumColor: string;
  showPath: boolean;
}

export interface ShotCue {
  id: string;
  shotNumber: number;
  label: string;
  description: string;
  continuous?: boolean; // When true, auto-chains start time and camera kinematics from preceding shot
  startSec: number;
  endSec: number;
  stageCamera?: StageCameraCueSpec;
  observerCamera?: CameraCueSpec;
  entities: Record<string, EntityCueOverride>;
}

/**
 * An independent observer camera cue with its own start/end time window,
 * decoupled from the film coverage shots.
 */
export interface ObserverShotCue {
  id: string;
  label?: string;
  continuous?: boolean; // When true, auto-chains start time and camera kinematics from preceding observer shot
  startSec: number;
  endSec: number;
  camera: CameraCueSpec;
}

export interface StageScore {
  version: string;
  id: string;
  title: string;
  subtitle?: string;
  continuous?: boolean; // When true, shots omitting `start` automatically chain from preceding shot's `end`
  videoUrl: string;    // Local path (/media/...), blob: URL, YouTube URL, or 'procedural://demo'
  aspectRatio: number; // Default 16 / 9 (1.7777778) or 2.39
  durationSec: number;
  offsetSec: number;
  stage: {
    width: number;     // Default 10 (meters)
    depth: number;     // Default 10 (meters)
    gridStep: number;  // Default 1 (meter)
    defaultObserverPose: SphericalPose;
    defaultStageCameraPose: SphericalPose;
  };
  entities: SceneEntityDef[];
  shots: ShotCue[];
  observerShots?: ObserverShotCue[];
  blocking?: BlockingCueSpec[];
}

export interface EvaluatedCameraTrack {
  active: boolean;
  isHold: boolean;
  shotId: string | null;
  maneuver: CameraManeuver;
  transform: CameraTransform3D;
  trajectoryPoints: Vec3[]; // 3D world points showing the camera's movement path
  baseTarget?: Vec3;        // Anchor point before target_offset displacement
  targetOffset?: Vec3;      // Active world-space target offset vector at this frame
}

export interface StageFrame {
  timestampSec: number;
  progress: number;
  activeShot: ShotCue | null;
  shotIndex: number;
  shotProgress: number;
  observerCamera: EvaluatedCameraTrack;
  stageCamera: EvaluatedCameraTrack & {
    frustumDepth: number;
    frustumColor: string;
    showPath: boolean;
  };
  entitiesById: Map<string, EvaluatedEntityState>;
  entitiesList: EvaluatedEntityState[];
}

/**
 * Diagnostics and location metadata for YAML score syntax and schema errors.
 */
export interface ScoreDiagnostic {
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Result of compiling raw YAML/JSON into a StageScore.
 * Completely backward-compatible with legacy `{ score, error, warning }`.
 */
export interface ParseScoreResult {
  score: StageScore | null;
  error: string | null;
  warning?: string | null;
  diagnostics?: ScoreDiagnostic[];
}

/**
 * Provenance category for StageFlow choreography scores.
 * - 'study': Authentic directorial scene studies authored by Taruma Sakti (e.g. Vector Field).
 * - 'blueprint': Synthetic educational camera-blocking presets and testbeds (BP 01–05).
 * - 'custom': User-authored, imported, or forked projects persisted in browser IndexedDB.
 */
export type ScoreCategory = 'study' | 'blueprint' | 'custom';


