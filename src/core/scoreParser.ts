/**
 * Resilient YAML / JSON choreography score parser and normalizer.
 * Converts human-authored degrees into radians and applies metric stage defaults.
 */

import { parse as parseYaml } from 'yaml';
import type {
  CameraCueSpec,
  CameraEasing,
  CameraManeuver,
  CameraWaypointSpec,
  EntityCueOverride,
  EntityKind,
  ObserverShotCue,
  SceneEntityDef,
  ShotCue,
  SphericalPose,
  StageCameraCueSpec,
  StageScore,
  Vec3,
} from './types';
import {
  BLUEPRINT_PALETTE,
  DEFAULT_OBSERVER_POSE,
  DEFAULT_STAGE_CAMERA_POSE,
  ENTITY_DEFAULTS,
} from './constants';
import { clampFocalLengthMm, parseAspectRatio } from './opticsMath';
import { clampSphericalPose, degToRad } from './sphericalMath';

function parseVec3(raw: unknown, fallback: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  if (Array.isArray(raw) && raw.length >= 3) {
    const x = Number(raw[0]);
    const y = Number(raw[1]);
    const z = Number(raw[2]);
    return {
      x: Number.isFinite(x) ? x : fallback.x,
      y: Number.isFinite(y) ? y : fallback.y,
      z: Number.isFinite(z) ? z : fallback.z,
    };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const x = Number(obj.x);
    const y = Number(obj.y);
    const z = Number(obj.z);
    return {
      x: Number.isFinite(x) ? x : fallback.x,
      y: Number.isFinite(y) ? y : fallback.y,
      z: Number.isFinite(z) ? z : fallback.z,
    };
  }
  return { ...fallback };
}

function parseOptionalVec3(raw: unknown): Vec3 | undefined {
  if (Array.isArray(raw) && raw.length >= 3) {
    return parseVec3(raw);
  }
  if (raw && typeof raw === 'object') {
    return parseVec3(raw);
  }
  return undefined;
}

function parseTargetOrVec3(raw: unknown): string | Vec3 | undefined {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(raw) || (raw && typeof raw === 'object')) {
    return parseVec3(raw);
  }
  return undefined;
}

/**
 * Parses a lens value such as `50`, `"50mm"`, `"35 mm"` into focal length in mm.
 */
export function parseLensFocalLengthMm(
  raw: unknown,
  fallbackMm = 50
): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return clampFocalLengthMm(raw);
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim().toLowerCase().replace(/mm$/, '').trim();
    const num = parseFloat(cleaned);
    if (Number.isFinite(num)) {
      return clampFocalLengthMm(num);
    }
  }
  return fallbackMm;
}

/**
 * Parses an angle authored in human degrees (or explicit "...rad") into radians.
 */
export function parseAngleToRad(
  raw: unknown,
  fallbackRad?: number
): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return degToRad(raw);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.endsWith('rad')) {
      const val = parseFloat(trimmed.replace(/rad$/, '').trim());
      if (Number.isFinite(val)) return val;
    } else {
      const val = parseFloat(trimmed.replace(/deg|°$/, '').trim());
      if (Number.isFinite(val)) return degToRad(val);
    }
  }
  return fallbackRad;
}

export function normalizeCameraManeuver(raw: unknown): CameraManeuver {
  if (typeof raw !== 'string') return 'dolly';
  const norm = raw.trim().toLowerCase();
  if (norm === 'cut' || norm === 'static' || norm === 'hold') return 'cut';
  if (norm === 'dolly' || norm === 'straight' || norm === 'linear' || norm === 'push' || norm === 'pull') {
    return 'dolly';
  }
  if (norm === 'arc') return 'arc';
  if (norm === 'swoop') return 'swoop';
  if (norm === 'orbit' || norm === 'turntable') return 'orbit';
  if (norm === 'sweep' || norm === 'pan') return 'sweep';
  if (norm === 'spiral' || norm === 'corkscrew') return 'spiral';
  if (norm === 'dive' || norm === 'flyby') return 'dive';
  if (norm === 'recoil' || norm === 'punch') return 'recoil';
  if (norm === 'spline' || norm === 'path') return 'spline';
  return 'dolly';
}

export function normalizeCameraEasing(raw: unknown): CameraEasing {
  if (typeof raw !== 'string') return 'smooth';
  const norm = raw.trim().toLowerCase();
  if (norm === 'linear') return 'linear';
  if (norm === 'ease-in' || norm === 'easein') return 'ease-in';
  if (norm === 'ease-out' || norm === 'easeout') return 'ease-out';
  if (norm === 'expo') return 'expo';
  if (norm === 'pop' || norm === 'bounce') return 'pop';
  if (norm === 'accel' || norm === 'ramp-up') return 'accel';
  if (norm === 'deccel' || norm === 'decel' || norm === 'ramp-down') return 'deccel';
  if (norm === 'cruise' || norm === 'trapezoid') return 'cruise';
  return 'smooth';
}

function parseBaseSphericalPose(
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

function parseCameraCueSpec(
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
    maneuver === 'arc' || maneuver === 'swoop' ? 1.12 : 1.0;
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

  return {
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

function parseStageCameraCueSpec(raw: unknown): StageCameraCueSpec | undefined {
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

/**
 * Parses a raw YAML or JSON string into a normalized StageScore.
 */
export function parseStageScore(
  rawText: string,
  fallbackId = 'custom-scene'
): { score: StageScore | null; error: string | null; warning?: string | null } {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { score: null, error: 'Score content is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { score: null, error: `YAML syntax error: ${message}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      score: null,
      error: 'Score root must be a YAML/JSON object mapping.',
    };
  }

  const root = parsed as Record<string, unknown>;
  const version = String(root.version ?? '1.0');
  const id = String(root.id ?? fallbackId);
  const title = String(root.title ?? 'Untitled StageFlow Scene');
  const subtitle =
    typeof root.subtitle === 'string' ? root.subtitle : undefined;
  const continuous =
    root.continuous === true ||
    root.continuous === 'true' ||
    root.continuous === 'yes';
  let videoUrl = 'procedural://demo';
  let videoAspectRatio: string | number | undefined;

  if (typeof root.video === 'string') {
    videoUrl = root.video.trim();
  } else if (root.video && typeof root.video === 'object') {
    const vObj = root.video as Record<string, unknown>;
    const candidate = vObj.src ?? vObj.url;
    if (typeof candidate === 'string') {
      videoUrl = candidate.trim();
    }
    if (vObj.aspect_ratio || vObj.aspectRatio) {
      videoAspectRatio = (vObj.aspect_ratio ?? vObj.aspectRatio) as
        | string
        | number;
    }
  } else if (typeof root.video_url === 'string') {
    videoUrl = root.video_url.trim();
  } else if (typeof root.videoUrl === 'string') {
    videoUrl = root.videoUrl.trim();
  }

  const aspectRatio = parseAspectRatio(
    (root.aspect_ratio ?? root.aspectRatio ?? videoAspectRatio) as
      | string
      | number
      | undefined
  );

  const rawStage =
    root.stage && typeof root.stage === 'object'
      ? (root.stage as Record<string, unknown>)
      : {};

  const stageWidth =
    typeof rawStage.width === 'number' && rawStage.width > 0
      ? rawStage.width
      : 10;
  const stageDepth =
    typeof rawStage.depth === 'number' && rawStage.depth > 0
      ? rawStage.depth
      : 10;
  const gridStep =
    typeof rawStage.grid_step === 'number' && rawStage.grid_step > 0
      ? rawStage.grid_step
      : 1;

  const defaultObserverPose = parseBaseSphericalPose(
    rawStage.observer_camera ?? rawStage.observerCamera,
    DEFAULT_OBSERVER_POSE
  );
  const defaultStageCameraPose = parseBaseSphericalPose(
    rawStage.stage_camera ?? rawStage.stageCamera,
    DEFAULT_STAGE_CAMERA_POSE
  );

  // Parse Entities
  const rawEntities = Array.isArray(root.entities) ? root.entities : [];
  const entities: SceneEntityDef[] = rawEntities
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const ent = item as Record<string, unknown>;
      const rawKind = String(ent.kind ?? 'character')
        .trim()
        .toLowerCase();
      const kind: EntityKind =
        rawKind === 'prop'
          ? 'prop'
          : rawKind === 'marker'
          ? 'marker'
          : 'character';

      const defaultHeight =
        kind === 'character'
          ? ENTITY_DEFAULTS.CHARACTER_HEIGHT_M
          : kind === 'prop'
          ? ENTITY_DEFAULTS.PROP_HEIGHT_M
          : ENTITY_DEFAULTS.MARKER_HEIGHT_M;

      const defaultRadius =
        kind === 'character'
          ? ENTITY_DEFAULTS.CHARACTER_RADIUS_M
          : kind === 'prop'
          ? ENTITY_DEFAULTS.PROP_RADIUS_M
          : ENTITY_DEFAULTS.MARKER_RADIUS_M;

      const defaultColor =
        kind === 'character'
          ? idx % 2 === 0
            ? BLUEPRINT_PALETTE.characterPrimary
            : BLUEPRINT_PALETTE.characterSecondary
          : kind === 'prop'
          ? BLUEPRINT_PALETTE.propDefault
          : BLUEPRINT_PALETTE.markerDefault;

      return {
        id: String(ent.id ?? `entity_${idx + 1}`),
        label: String(ent.label ?? ent.id ?? `Entity ${idx + 1}`),
        kind,
        position: parseVec3(ent.position, { x: 0, y: 0, z: 0 }),
        rotationYRad: parseAngleToRad(ent.rotation ?? ent.yaw, 0) ?? 0,
        height:
          typeof ent.height === 'number' && ent.height > 0
            ? ent.height
            : defaultHeight,
        radius:
          typeof ent.radius === 'number' && ent.radius > 0
            ? ent.radius
            : defaultRadius,
        color:
          typeof ent.color === 'string' && ent.color.trim().length > 0
            ? ent.color.trim()
            : defaultColor,
      };
    });

  // Resolve target strings inside defaultStageCameraPose / defaultObserverPose if they reference an entity
  const resolveStageCamEntityTarget = (
    rawCam: unknown,
    pose: SphericalPose
  ) => {
    if (!rawCam || typeof rawCam !== 'object') return;
    const camObj = rawCam as Record<string, unknown>;
    if (typeof camObj.target !== 'string') return;
    const tgtName = camObj.target.trim().toLowerCase();
    const matched = entities.find(
      (e) =>
        e.id.toLowerCase() === tgtName || e.label.toLowerCase() === tgtName
    );
    if (matched) {
      const anchorRatio =
        matched.kind === 'character'
          ? ENTITY_DEFAULTS.CHARACTER_LOOK_ANCHOR_RATIO
          : 0.5;
      const offset = parseOptionalVec3(
        camObj.target_offset ?? camObj.targetOffset
      );
      pose.target = {
        x: matched.position.x + (offset?.x ?? 0),
        y: matched.position.y + matched.height * anchorRatio + (offset?.y ?? 0),
        z: matched.position.z + (offset?.z ?? 0),
      };
    }
  };

  resolveStageCamEntityTarget(
    rawStage.stage_camera ?? rawStage.stageCamera,
    defaultStageCameraPose
  );
  resolveStageCamEntityTarget(
    rawStage.observer_camera ?? rawStage.observerCamera,
    defaultObserverPose
  );

  // Parse Shots
  const rawShots = Array.isArray(root.shots ?? root.score)
    ? ((root.shots ?? root.score) as unknown[])
    : [];

  let prevShotEndSec = 0;
  const missingStartShotIds: string[] = [];

  const shots: ShotCue[] = rawShots
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const sh = item as Record<string, unknown>;
      const rawStartCandidate = sh.start ?? sh._start;
      const rawEndCandidate = sh.end ?? sh._end;
      const hasExplicitStart =
        typeof rawStartCandidate === 'number' &&
        Number.isFinite(rawStartCandidate);

      let startSec: number;
      if (hasExplicitStart) {
        startSec = Math.max(0, rawStartCandidate);
      } else if (continuous) {
        startSec = prevShotEndSec;
      } else {
        startSec = 0;
        if (idx > 0) {
          missingStartShotIds.push(String(sh.id ?? `shot-${idx + 1}`));
        }
      }

      const endSec =
        typeof rawEndCandidate === 'number' && Number.isFinite(rawEndCandidate)
          ? Math.max(startSec + 0.1, rawEndCandidate)
          : startSec + 5.0;

      prevShotEndSec = endSec;

      const entityOverrides: Record<string, EntityCueOverride> = {};
      if (sh.entities && typeof sh.entities === 'object') {
        for (const [entId, rawOv] of Object.entries(
          sh.entities as Record<string, unknown>
        )) {
          if (!rawOv || typeof rawOv !== 'object') continue;
          const ov = rawOv as Record<string, unknown>;
          entityOverrides[entId] = {
            fromPosition: ov.from_position
              ? parseVec3(ov.from_position)
              : ov.from
              ? parseVec3(ov.from)
              : undefined,
            position: ov.position ? parseVec3(ov.position) : undefined,
            rotationYRad: parseAngleToRad(ov.rotation ?? ov.yaw),
            lookAt: parseTargetOrVec3(ov.look_at ?? ov.lookAt),
            easing: normalizeCameraEasing(ov.easing),
            highlighted: Boolean(ov.highlighted ?? ov.highlight),
            visible: ov.visible !== false,
            note: typeof ov.note === 'string' ? ov.note : undefined,
          };
        }
      }

      return {
        id: String(sh.id ?? `shot-${idx + 1}`),
        shotNumber:
          typeof sh.shot === 'number' && Number.isFinite(sh.shot)
            ? sh.shot
            : idx + 1,
        label: String(sh.label ?? sh.name ?? `Shot ${idx + 1}`),
        description: String(sh.description ?? sh.note ?? ''),
        startSec,
        endSec,
        stageCamera: parseStageCameraCueSpec(
          sh.stage_camera ?? sh.stageCamera
        ),
        observerCamera: parseCameraCueSpec(
          sh.observer_camera ?? sh.observerCamera,
          defaultObserverPose.focalLengthMm
        ),
        entities: entityOverrides,
      };
    });

  if (shots.length === 0) {
    return {
      score: null,
      error: 'Score must define at least one shot in "shots:".',
    };
  }

  // Parse optional decoupled root-level observer_shots
  let observerShots: ObserverShotCue[] | undefined;
  const rawObserverShots = root.observer_shots ?? root.observerShots;
  if (Array.isArray(rawObserverShots)) {
    observerShots = rawObserverShots
      .filter((item) => item && typeof item === 'object')
      .map((item, idx) => {
        const os = item as Record<string, unknown>;
        const startSec =
          typeof os.start === 'number' && Number.isFinite(os.start)
            ? Math.max(0, os.start)
            : 0;
        const endSec =
          typeof os.end === 'number' && Number.isFinite(os.end)
            ? Math.max(startSec + 0.1, os.end)
            : startSec + 5.0;
        const cameraSource =
          os.observer_camera ?? os.observerCamera ?? os.camera ?? os;
        const camera =
          parseCameraCueSpec(cameraSource, defaultObserverPose.focalLengthMm) ??
          parseCameraCueSpec({}, defaultObserverPose.focalLengthMm)!;
        return {
          id: String(os.id ?? `obs-shot-${idx + 1}`),
          label:
            typeof (os.label ?? os.name) === 'string'
              ? String(os.label ?? os.name)
              : undefined,
          startSec,
          endSec,
          camera,
        };
      });
  }

  const maxFilmShotEnd = Math.max(...shots.map((s) => s.endSec));
  const maxObserverShotEnd =
    observerShots && observerShots.length > 0
      ? Math.max(...observerShots.map((s) => s.endSec))
      : 0;
  const maxTimelineEnd = Math.max(maxFilmShotEnd, maxObserverShotEnd);

  const durationSec =
    typeof root.duration === 'number' && root.duration > 0
      ? root.duration
      : maxTimelineEnd;
  const offsetSec =
    typeof root.offset === 'number' && Number.isFinite(root.offset)
      ? root.offset
      : 0;

  const warning =
    !continuous && missingStartShotIds.length > 0
      ? `Shot "${missingStartShotIds[0]}" omits "start" (defaulted to 0.0s). Add "start:" or declare "continuous: true" at root to auto-chain.`
      : null;

  return {
    score: {
      version,
      id,
      title,
      subtitle,
      continuous: continuous || undefined,
      videoUrl,
      aspectRatio,
      durationSec,
      offsetSec,
      stage: {
        width: stageWidth,
        depth: stageDepth,
        gridStep,
        defaultObserverPose,
        defaultStageCameraPose,
      },
      entities,
      shots,
      observerShots,
    },
    error: null,
    warning,
  };
}
