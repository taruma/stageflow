/**
 * Low-level primitive value parsers and enum normalizers for StageFlow YAML scores.
 * Converts human-authored degrees, millimeter strings, and 3D coordinate tuples
 * into normalized internal metric/radian primitives.
 * Pure Layer 1 module with zero React or DOM dependencies.
 */

import type {
  BlockingCueSpec,
  CameraEasing,
  CameraManeuver,
  EntityKind,
  SceneEntityDef,
  Vec3,
} from './types';
import { clampFocalLengthMm } from './opticsMath';
import { degToRad } from './sphericalMath';

export function parseVec3(
  raw: unknown,
  fallback: Vec3 = { x: 0, y: 0, z: 0 }
): Vec3 {
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

export function parseOptionalVec3(raw: unknown): Vec3 | undefined {
  if (Array.isArray(raw) && raw.length >= 3) {
    return parseVec3(raw);
  }
  if (raw && typeof raw === 'object') {
    return parseVec3(raw);
  }
  return undefined;
}

export function parseTargetOrVec3(raw: unknown): string | Vec3 | undefined {
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
  if (
    norm === 'dolly' ||
    norm === 'straight' ||
    norm === 'linear' ||
    norm === 'push' ||
    norm === 'pull'
  ) {
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
  if (norm === 'deccel' || norm === 'decel' || norm === 'ramp-down') {
    return 'deccel';
  }
  if (norm === 'cruise' || norm === 'trapezoid') return 'cruise';
  return 'smooth';
}

export function normalizeEntityKind(raw: unknown): EntityKind {
  const rawKind = String(raw ?? 'character')
    .trim()
    .toLowerCase();
  if (rawKind === 'prop') return 'prop';
  if (rawKind === 'marker') return 'marker';
  return 'character';
}

export function resolveEntityIdentifier(
  rawId: string,
  entities: SceneEntityDef[]
): string {
  const trimmed = rawId.trim();
  const lower = trimmed.toLowerCase();
  const matched = entities.find(
    (e) => e.id.toLowerCase() === lower || e.label.toLowerCase() === lower
  );
  return matched ? matched.id : trimmed;
}

export function parseBlockingCues(
  rawBlocking: unknown,
  entities: SceneEntityDef[] = []
): BlockingCueSpec[] | undefined {
  if (!Array.isArray(rawBlocking)) return undefined;
  const cues: BlockingCueSpec[] = [];

  rawBlocking.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const obj = item as Record<string, unknown>;
    const baseId = String(obj.id ?? `blocking-${idx + 1}`);
    const label =
      typeof (obj.label ?? obj.name) === 'string'
        ? String(obj.label ?? obj.name)
        : undefined;

    const rawStart = obj.start ?? obj._start;
    const rawEnd = obj.end ?? obj._end;
    const startSec =
      typeof rawStart === 'number' && Number.isFinite(rawStart)
        ? Math.max(0, rawStart)
        : 0;
    const endSec =
      typeof rawEnd === 'number' && Number.isFinite(rawEnd)
        ? Math.max(startSec + 0.1, rawEnd)
        : startSec + 5.0;

    if (
      obj.entities &&
      typeof obj.entities === 'object' &&
      !Array.isArray(obj.entities)
    ) {
      for (const [entKey, rawOv] of Object.entries(
        obj.entities as Record<string, unknown>
      )) {
        if (!rawOv || typeof rawOv !== 'object' || Array.isArray(rawOv)) {
          continue;
        }
        const ov = rawOv as Record<string, unknown>;
        const entityId = resolveEntityIdentifier(entKey, entities);
        cues.push({
          id: `${baseId}:${entityId}`,
          label,
          entityId,
          startSec,
          endSec,
          fromPosition: ov.from_position
            ? parseVec3(ov.from_position)
            : ov.from
            ? parseVec3(ov.from)
            : undefined,
          position: ov.position ? parseVec3(ov.position) : undefined,
          rotationYRad: parseAngleToRad(ov.rotation ?? ov.yaw),
          lookAt: parseTargetOrVec3(ov.look_at ?? ov.lookAt),
          easing: normalizeCameraEasing(ov.easing ?? obj.easing),
          highlighted:
            ov.highlighted !== undefined || ov.highlight !== undefined
              ? Boolean(ov.highlighted ?? ov.highlight)
              : undefined,
          visible: typeof ov.visible === 'boolean' ? ov.visible : undefined,
          note:
            typeof (ov.note ?? ov.description) === 'string'
              ? String(ov.note ?? ov.description)
              : undefined,
        });
      }
      return;
    }

    const rawEntity =
      obj.entity ?? obj.entity_id ?? obj.entityId ?? obj.actor ?? obj.subject;
    if (typeof rawEntity === 'string' && rawEntity.trim().length > 0) {
      const entityId = resolveEntityIdentifier(rawEntity, entities);
      cues.push({
        id: baseId,
        label,
        entityId,
        startSec,
        endSec,
        fromPosition: obj.from_position
          ? parseVec3(obj.from_position)
          : obj.from
          ? parseVec3(obj.from)
          : undefined,
        position: obj.position ? parseVec3(obj.position) : undefined,
        rotationYRad: parseAngleToRad(obj.rotation ?? obj.yaw),
        lookAt: parseTargetOrVec3(obj.look_at ?? obj.lookAt),
        easing: normalizeCameraEasing(obj.easing),
        highlighted:
          obj.highlighted !== undefined || obj.highlight !== undefined
            ? Boolean(obj.highlighted ?? obj.highlight)
            : undefined,
        visible: typeof obj.visible === 'boolean' ? obj.visible : undefined,
        note:
          typeof (obj.note ?? obj.description) === 'string'
            ? String(obj.note ?? obj.description)
            : undefined,
      });
    }
  });

  return cues.length > 0 ? cues : undefined;
}
