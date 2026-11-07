/**
 * Camera pose, shot cue specification, waypoint, and observer timeline parsers.
 * Pure Layer 1 module with zero React or DOM dependencies.
 */

import type {
  CameraCueSpec,
  CameraWaypointSpec,
  ObserverShotCue,
  SceneEntityDef,
  SphericalPose,
  StageCameraCueSpec,
} from './types';
import { BLUEPRINT_PALETTE, ENTITY_DEFAULTS } from './constants';
import { clampSphericalPose } from './sphericalMath';
import {
  normalizeCameraEasing,
  normalizeCameraManeuver,
  parseAngleToRad,
  parseLensFocalLengthMm,
  parseOptionalVec3,
  parseTargetOrVec3,
  parseVec3,
} from './scorePrimitives';

export function parseBaseSphericalPose(
  raw: unknown,
  fallback: SphericalPose
): SphericalPose {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, target: { ...fallback.target } };
  }
  const obj = raw as Record<string, unknown>;
  const rawTarget = obj.target
    ? parseVec3(obj.target, fallback.target)
    : { ...fallback.target };
  const offset = parseOptionalVec3(obj.target_offset ?? obj.targetOffset);
  const target =
    offset && typeof obj.target !== 'string'
      ? {
          x: rawTarget.x + offset.x,
          y: rawTarget.y + offset.y,
          z: rawTarget.z + offset.z,
        }
      : rawTarget;
  const distance =
    typeof obj.distance === 'number' && Number.isFinite(obj.distance)
      ? obj.distance
      : fallback.distance;
  const pitch = parseAngleToRad(obj.pitch, fallback.pitch) ?? fallback.pitch;
  const yaw = parseAngleToRad(obj.yaw, fallback.yaw) ?? fallback.yaw;
  const roll =
    parseAngleToRad(obj.roll ?? obj.dutch ?? obj.tilt_roll, fallback.roll) ??
    fallback.roll;
  const focalLengthMm = parseLensFocalLengthMm(
    obj.lens ?? obj.focal_length ?? obj.focalLengthMm,
    fallback.focalLengthMm
  );

  return clampSphericalPose({
    target,
    distance,
    pitch,
    yaw,
    roll,
    focalLengthMm,
  });
}

export function resolveStageCamEntityTarget(
  rawCam: unknown,
  pose: SphericalPose,
  entities: SceneEntityDef[]
): void {
  if (!rawCam || typeof rawCam !== 'object') return;
  const camObj = rawCam as Record<string, unknown>;
  if (typeof camObj.target !== 'string') return;
  const tgtName = camObj.target.trim().toLowerCase();
  const offset = parseOptionalVec3(
    camObj.target_offset ?? camObj.targetOffset
  );

  if (tgtName === 'center' || tgtName === 'origin' || tgtName === 'stage') {
    pose.target = {
      x: offset?.x ?? 0,
      y: 1.0 + (offset?.y ?? 0),
      z: offset?.z ?? 0,
    };
    return;
  }

  const matched = entities.find(
    (e) =>
      e.id.toLowerCase() === tgtName || e.label.toLowerCase() === tgtName
  );
  if (matched) {
    const anchorRatio =
      matched.kind === 'character'
        ? ENTITY_DEFAULTS.CHARACTER_LOOK_ANCHOR_RATIO
        : 0.5;
    pose.target = {
      x: matched.position.x + (offset?.x ?? 0),
      y: matched.position.y + matched.height * anchorRatio + (offset?.y ?? 0),
      z: matched.position.z + (offset?.z ?? 0),
    };
  }
}

export function parseCameraCueSpec(
  raw: unknown,
  defaultLensMm: number
): CameraCueSpec | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;

  const maneuver = normalizeCameraManeuver(obj.maneuver ?? obj.style ?? 'dolly');
  const easing = normalizeCameraEasing(obj.easing);
  const rawDir =
    typeof obj.direction === 'string' ? obj.direction.trim().toLowerCase() : '';
  const cleanDir = rawDir.replace(/[-_\s]/g, '');
  const hasExplicitDirection =
    cleanDir === 'cw' ||
    cleanDir === 'clockwise' ||
    cleanDir === 'ccw' ||
    cleanDir === 'counterclockwise';
  const direction =
    cleanDir === 'ccw' || cleanDir === 'counterclockwise' ? 'ccw' : 'cw';

  const defaultBreathe =
    maneuver === 'arc' || maneuver === 'swoop'
      ? 1.12
      : maneuver === 'recoil'
      ? 1.25
      : 1.0;
  const breathe =
    typeof obj.breathe === 'number' && Number.isFinite(obj.breathe)
      ? obj.breathe
      : defaultBreathe;

  let yawDeltaRad = parseAngleToRad(obj.yaw_delta ?? obj.yawDelta);
  let yawRad = parseAngleToRad(obj.yaw);
  if (typeof obj.yaw === 'string') {
    const trimmed = obj.yaw.trim();
    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      // If yaw is written as relative string "+45" without yaw_start, still parse as angle
      yawRad = parseAngleToRad(trimmed);
    }
  }

  const rollDeltaRad = parseAngleToRad(obj.roll_delta ?? obj.rollDelta);
  const rollRad = parseAngleToRad(obj.roll ?? obj.dutch);
  const rollStartRad = parseAngleToRad(obj.roll_start ?? obj.rollStart);
  const rollEndRad = parseAngleToRad(obj.roll_end ?? obj.rollEnd);

  const targetOffset = parseOptionalVec3(
    obj.target_offset ?? obj.targetOffset
  );
  const targetOffsetStart = parseOptionalVec3(
    obj.target_offset_start ?? obj.targetOffsetStart
  );
  const targetOffsetEnd = parseOptionalVec3(
    obj.target_offset_end ?? obj.targetOffsetEnd
  );

  let waypoints: CameraWaypointSpec[] | undefined;
  if (Array.isArray(obj.waypoints)) {
    waypoints = obj.waypoints
      .filter((w) => w && typeof w === 'object')
      .map((w) => {
        const wp = w as Record<string, unknown>;
        return {
          target: parseTargetOrVec3(wp.target),
          targetOffset: parseOptionalVec3(
            wp.target_offset ?? wp.targetOffset
          ),
          distance:
            typeof wp.distance === 'number' && Number.isFinite(wp.distance)
              ? wp.distance
              : undefined,
          pitchRad: parseAngleToRad(wp.pitch),
          yawRad: parseAngleToRad(wp.yaw),
          rollRad: parseAngleToRad(wp.roll ?? wp.dutch),
          focalLengthMm:
            wp.lens !== undefined || wp.focal_length !== undefined
              ? parseLensFocalLengthMm(wp.lens ?? wp.focal_length, defaultLensMm)
              : undefined,
          at:
            typeof wp.at === 'number' && Number.isFinite(wp.at)
              ? wp.at
              : undefined,
        };
      });
  }

  const hasLens =
    obj.lens !== undefined ||
    obj.focal_length !== undefined ||
    obj.focalLengthMm !== undefined;

  const cueContinuous =
    typeof obj.continuous === 'boolean'
      ? obj.continuous
      : obj.continuous === 'true' || obj.continuous === 'yes'
      ? true
      : obj.continuous === 'false' || obj.continuous === 'no'
      ? false
      : undefined;

  return {
    ...(cueContinuous !== undefined ? { continuous: cueContinuous } : {}),
    maneuver,
    easing,
    target: parseTargetOrVec3(obj.target),
    from: parseTargetOrVec3(obj.from),
    targetOffset,
    targetOffsetStart,
    targetOffsetEnd,
    distance:
      typeof obj.distance === 'number' && Number.isFinite(obj.distance)
        ? obj.distance
        : undefined,
    distanceStart:
      typeof obj.distance_start === 'number' &&
      Number.isFinite(obj.distance_start)
        ? obj.distance_start
        : undefined,
    distanceEnd:
      typeof obj.distance_end === 'number' && Number.isFinite(obj.distance_end)
        ? obj.distance_end
        : undefined,
    pitchRad: parseAngleToRad(obj.pitch),
    pitchStartRad: parseAngleToRad(obj.pitch_start ?? obj.pitchStart),
    pitchEndRad: parseAngleToRad(obj.pitch_end ?? obj.pitchEnd),
    yawRad,
    yawDeltaRad,
    yawStartRad: parseAngleToRad(obj.yaw_start ?? obj.yawStart),
    yawEndRad: parseAngleToRad(obj.yaw_end ?? obj.yawEnd),
    rollRad,
    rollDeltaRad,
    rollStartRad,
    rollEndRad,
    focalLengthMm: hasLens
      ? parseLensFocalLengthMm(
          obj.lens ?? obj.focal_length ?? obj.focalLengthMm,
          defaultLensMm
        )
      : undefined,
    focalLengthStartMm:
      obj.lens_start !== undefined
        ? parseLensFocalLengthMm(obj.lens_start, defaultLensMm)
        : undefined,
    focalLengthEndMm:
      obj.lens_end !== undefined
        ? parseLensFocalLengthMm(obj.lens_end, defaultLensMm)
        : undefined,
    breathe,
    direction,
    hasExplicitDirection,
    revolutions:
      typeof obj.revolutions === 'number' && Number.isFinite(obj.revolutions)
        ? obj.revolutions
        : undefined,
    orbitSpeedRad: parseAngleToRad(obj.orbit_speed ?? obj.orbitSpeed),
    waypoints,
    trackTarget: obj.track !== false,
  };
}

export function parseStageCameraCueSpec(
  raw: unknown
): StageCameraCueSpec | undefined {
  const base = parseCameraCueSpec(raw, 50);
  if (!base) return undefined;
  const obj = raw as Record<string, unknown>;

  const frustumDepth =
    typeof obj.frustum_depth === 'number' && Number.isFinite(obj.frustum_depth)
      ? obj.frustum_depth
      : typeof obj.cone_length === 'number' && Number.isFinite(obj.cone_length)
      ? obj.cone_length
      : 0; // 0 = auto-match distance to target

  const frustumColor =
    typeof obj.frustum_color === 'string' && obj.frustum_color.trim().length > 0
      ? obj.frustum_color.trim()
      : BLUEPRINT_PALETTE.frustumDefault;

  const showPath = obj.show_path !== false && obj.showPath !== false;

  return {
    ...base,
    frustumDepth,
    frustumColor,
    showPath,
  };
}

export function parseObserverShots(
  rawObserverShots: unknown,
  defaultLensMm: number,
  scoreContinuous?: boolean,
  missingStartObserverShotIds?: string[]
): ObserverShotCue[] | undefined {
  if (!Array.isArray(rawObserverShots)) return undefined;
  let prevShotEndSec = 0;

  return rawObserverShots
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const os = item as Record<string, unknown>;
      const rawStartCandidate = os.start ?? os._start;
      const rawEndCandidate = os.end ?? os._end;
      const hasExplicitStart =
        typeof rawStartCandidate === 'number' &&
        Number.isFinite(rawStartCandidate);

      const cameraSource =
        os.observer_camera ?? os.observerCamera ?? os.camera ?? os;
      const camObj =
        cameraSource && typeof cameraSource === 'object'
          ? (cameraSource as Record<string, unknown>)
          : os;
      const rawContinuous = os.continuous ?? camObj.continuous;

      const shotContinuous =
        typeof rawContinuous === 'boolean'
          ? rawContinuous
          : rawContinuous === 'true' || rawContinuous === 'yes'
          ? true
          : rawContinuous === 'false' || rawContinuous === 'no'
          ? false
          : undefined;

      const isContinuous = shotContinuous ?? scoreContinuous;

      let startSec: number;
      if (hasExplicitStart) {
        startSec = Math.max(0, rawStartCandidate);
      } else if (isContinuous) {
        startSec = prevShotEndSec;
      } else {
        startSec = 0;
        if (idx > 0 && missingStartObserverShotIds) {
          missingStartObserverShotIds.push(
            String(os.id ?? `obs-shot-${idx + 1}`)
          );
        }
      }

      const endSec =
        typeof rawEndCandidate === 'number' && Number.isFinite(rawEndCandidate)
          ? Math.max(startSec + 0.1, rawEndCandidate)
          : startSec + 5.0;

      prevShotEndSec = endSec;

      const camera =
        parseCameraCueSpec(cameraSource, defaultLensMm) ??
        parseCameraCueSpec({}, defaultLensMm)!;
      return {
        id: String(os.id ?? `obs-shot-${idx + 1}`),
        label:
          typeof (os.label ?? os.name) === 'string'
            ? String(os.label ?? os.name)
            : undefined,
        ...(shotContinuous !== undefined ? { continuous: shotContinuous } : {}),
        startSec,
        endSec,
        camera,
      };
    });
}
