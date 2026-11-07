import { describe, expect, it } from 'vitest';
import { parseStageScore } from '../../src/core/scoreParser';
import {
  normalizeCameraEasing,
  normalizeCameraManeuver,
  normalizeEntityKind,
  normalizeEntityShape,
  normalizeEntityStyle,
  parseAngleToRad,
  parseLensFocalLengthMm,
  parseOptionalVec3,
  parseTargetOrVec3,
  parseVec3,
} from '../../src/core/scorePrimitives';
import {
  parseBaseSphericalPose,
  parseCameraCueSpec,
  parseObserverShots,
  parseStageCameraCueSpec,
  resolveStageCamEntityTarget,
} from '../../src/core/cameraCueParser';
import { DEFAULT_OBSERVER_POSE } from '../../src/core/constants';
import { INITIAL_CATALOG_ITEMS } from '../../src/core/scoreCatalog';
import { classifyMediaSource, extractYouTubeId } from '../../src/media/mediaTypes';
import { radToDeg } from '../../src/core/sphericalMath';

describe('scoreParser & mediaTypes — YAML Normalization & Source Detection', () => {
  it('parses human degrees into radians and metric meters in YAML scores', () => {
    const raw = `
version: "1.0"
id: "unit-test-scene"
title: "Test Scene"
video: "https://youtu.be/dQw4w9WgXcQ"
aspect_ratio: "2.39:1"
duration: 12.0
stage:
  width: 14
  depth: 12
  observer_camera:
    target: [1, 1.5, -0.5]
    distance: 9.0
    pitch: 30
    yaw: -45
    lens: 24mm
entities:
  - id: "hero"
    label: "Hero"
    kind: "character"
    position: [1, 0, 2]
    rotation: 90
shots:
  - id: "s1"
    shot: 1
    label: "Opening"
    start: 0
    end: 12
    stage_camera:
      target: "hero"
      maneuver: "arc"
      distance: 4.2
      pitch: 15
      yaw: 60
      lens: 50mm
`;
    const { score, error } = parseStageScore(raw);
    expect(error).toBeNull();
    expect(score).not.toBeNull();
    expect(score!.aspectRatio).toBeCloseTo(2.39, 4);
    expect(score!.stage.width).toBe(14);
    expect(
      radToDeg(score!.stage.defaultObserverPose.pitch)
    ).toBeCloseTo(30, 4);
    expect(
      radToDeg(score!.stage.defaultObserverPose.yaw)
    ).toBeCloseTo(-45, 4);
    expect(score!.stage.defaultObserverPose.focalLengthMm).toBe(24);
    expect(radToDeg(score!.entities[0].rotationYRad)).toBeCloseTo(90, 4);
  });

  it('returns a clean diagnostic error string on invalid YAML syntax without throwing', () => {
    const brokenYaml = `
title: "Unclosed quote
shots: [1, 2
`;
    const result = parseStageScore(brokenYaml);
    expect(result.score).toBeNull();
    expect(result.error).toContain('YAML syntax error');
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.length).toBeGreaterThan(0);
    expect(result.diagnostics![0].line).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics![0].severity).toBe('error');
  });

  it('classifies YouTube URLs, Local MP4 paths, and Procedural slates identically', () => {
    expect(
      extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    ).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );

    const ytSource = classifyMediaSource(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    expect(ytSource.kind).toBe('youtube');
    expect(ytSource.youtubeId).toBe('dQw4w9WgXcQ');

    const localSource = classifyMediaSource('/media/demo_scene.mp4');
    expect(localSource.kind).toBe('html5');

    const procSource = classifyMediaSource('procedural://demo-blueprint');
    expect(procSource.kind).toBe('procedural');
  });

  it('parses video as object mapping (src/url + aspect_ratio) and as plain string', () => {
    const rawObjectVideo = `
version: "1.0"
id: "video-obj-test"
title: "Object Video Test"
video:
  src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  aspect_ratio: "16:9"
duration: 10
stage:
  width: 10
  depth: 10
shots:
  - id: "s1"
    shot: 1
    start: 0
    end: 10
`;
    const res1 = parseStageScore(rawObjectVideo);
    expect(res1.error).toBeNull();
    expect(res1.score?.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res1.score?.aspectRatio).toBeCloseTo(16 / 9, 3);

    const rawUrlVideo = `
version: "1.0"
id: "video-url-test"
title: "URL Video Test"
video:
  url: "https://youtu.be/dQw4w9WgXcQ"
duration: 5
stage:
  width: 10
  depth: 10
shots:
  - id: "s1"
    shot: 1
    start: 0
    end: 5
`;
    const res2 = parseStageScore(rawUrlVideo);
    expect(res2.error).toBeNull();
    expect(res2.score?.videoUrl).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('registers and organizes scene studies and factory blueprints with distinct categories', () => {
    expect(INITIAL_CATALOG_ITEMS.length).toBeGreaterThanOrEqual(6);

    const studies = INITIAL_CATALOG_ITEMS.filter((item) => item.category === 'study');
    const blueprints = INITIAL_CATALOG_ITEMS.filter((item) => item.category === 'blueprint');

    expect(studies.length).toBeGreaterThanOrEqual(1);
    expect(studies[0].id).toBe('vector-field-taruma-sakti');
    expect(blueprints.length).toBe(5);

    for (const item of INITIAL_CATALOG_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.score).toBeDefined();
      expect(item.rawYaml).toBeTruthy();
      expect(['study', 'blueprint', 'custom']).toContain(item.category);
    }
  });

  it('parses root-level observer_shots with flattened camera properties into ObserverShotCue[]', () => {
    const yamlWithObserverShots = `
version: "1.0"
id: "decoupled-observer-test"
title: "Decoupled Observer Test"
duration: 20.0
stage:
  width: 10
  depth: 10
  observer_camera:
    target: [0, 1.0, 0]
    distance: 8.0
    pitch: 25
    yaw: 30
    lens: 35mm
shots:
  - id: "film-shot-1"
    shot: 1
    start: 0
    end: 10
    stage_camera:
      target: [0, 1.0, 0]
      lens: 50mm
  - id: "film-shot-2"
    shot: 2
    start: 10
    end: 20
    stage_camera:
      target: [0, 1.0, 0]
      lens: 85mm
observer_shots:
  - id: "obs-01"
    label: "Continuous Sweep"
    start: 0.0
    end: 12.0
    maneuver: "orbit"
    easing: "cruise"
    target: [0, 1.2, 0]
    distance: 9.5
    pitch: 32
    yaw_start: 15
    yaw_end: 105
    lens: 28mm
  - id: "obs-02"
    start: 12.0
    end: 20.0
    maneuver: "dolly"
    distance: 6.0
    pitch: 45
    yaw: 120
    lens: 50mm
`;
    const { score, error } = parseStageScore(yamlWithObserverShots);
    expect(error).toBeNull();
    expect(score).not.toBeNull();
    expect(score!.observerShots).toBeDefined();
    expect(score!.observerShots).toHaveLength(2);

    const obs1 = score!.observerShots![0];
    expect(obs1.id).toBe('obs-01');
    expect(obs1.label).toBe('Continuous Sweep');
    expect(obs1.startSec).toBe(0.0);
    expect(obs1.endSec).toBe(12.0);
    expect(obs1.camera.maneuver).toBe('orbit');
    expect(obs1.camera.easing).toBe('cruise');
    expect(obs1.camera.distance).toBe(9.5);
    expect(radToDeg(obs1.camera.pitchRad!)).toBeCloseTo(32, 4);
    expect(radToDeg(obs1.camera.yawStartRad!)).toBeCloseTo(15, 4);
    expect(radToDeg(obs1.camera.yawEndRad!)).toBeCloseTo(105, 4);
    expect(obs1.camera.focalLengthMm).toBe(28);

    const obs2 = score!.observerShots![1];
    expect(obs2.id).toBe('obs-02');
    expect(obs2.startSec).toBe(12.0);
    expect(obs2.endSec).toBe(20.0);
    expect(obs2.camera.maneuver).toBe('dolly');
    expect(obs2.camera.distance).toBe(6.0);
    expect(radToDeg(obs2.camera.pitchRad!)).toBeCloseTo(45, 4);
    expect(radToDeg(obs2.camera.yawRad!)).toBeCloseTo(120, 4);
    expect(obs2.camera.focalLengthMm).toBe(50);
  });

  it('rejects scores without any film shots in shots: even if observer_shots: is present', () => {
    const yamlWithoutFilmShots = `
version: "1.0"
id: "no-film-shots"
title: "No Film Shots"
observer_shots:
  - start: 0
    end: 10
    maneuver: "orbit"
`;
    const { score, error } = parseStageScore(yamlWithoutFilmShots);
    expect(score).toBeNull();
    expect(error).toContain('Score must define at least one shot in "shots:".');
  });

  it('parses camera roll parameters and dutch angle aliases in degrees into radians', () => {
    const yamlWithRoll = `
version: "1.0"
id: "roll-parse-test"
title: "Roll Parsing Test"
duration: 10.0
stage:
  observer_camera:
    target: [0, 1, 0]
    roll: 12deg
shots:
  - id: "shot-1"
    shot: 1
    start: 0
    end: 5
    stage_camera:
      target: [0, 1, 0]
      roll: 15
  - id: "shot-2"
    shot: 2
    start: 5
    end: 10
    stage_camera:
      target: [0, 1, 0]
      roll_start: -10
      roll_end: 25deg
      roll_delta: 35deg
`;
    const { score, error } = parseStageScore(yamlWithRoll);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    // Default observer camera roll
    expect(radToDeg(score!.stage.defaultObserverPose.roll)).toBeCloseTo(12, 4);

    // Shot 1 static roll
    const s1Cam = score!.shots[0].stageCamera;
    expect(s1Cam).toBeDefined();
    expect(radToDeg(s1Cam!.rollRad!)).toBeCloseTo(15, 4);

    // Shot 2 animated roll properties
    const s2Cam = score!.shots[1].stageCamera;
    expect(s2Cam).toBeDefined();
    expect(radToDeg(s2Cam!.rollStartRad!)).toBeCloseTo(-10, 4);
    expect(radToDeg(s2Cam!.rollEndRad!)).toBeCloseTo(25, 4);
    expect(radToDeg(s2Cam!.rollDeltaRad!)).toBeCloseTo(35, 4);
  });

  it('parses target_offset, target_offset_start, target_offset_end, and spline waypoint target_offset in meters', () => {
    const yamlWithTargetOffset = `
version: "1.0"
id: "target-offset-parse-test"
title: "Target Offset Parsing Test"
duration: 12.0
entities:
  - id: "arthur"
    label: "Arthur"
    kind: "character"
    position: [-5, 0, 0]
shots:
  - id: "shot-1"
    shot: 1
    start: 0
    end: 4
    stage_camera:
      target: "arthur"
      target_offset: [0.25, 0.35, -0.1]
  - id: "shot-2"
    shot: 2
    start: 4
    end: 8
    stage_camera:
      target: "arthur"
      target_offset_start: [0, -1.1, 0]
      target_offset_end: [0, 0.25, 0]
  - id: "shot-3"
    shot: 3
    start: 8
    end: 12
    stage_camera:
      maneuver: "spline"
      waypoints:
        - target: "arthur"
          target_offset: [0, 0.4, 0]
          distance: 3.0
`;
    const { score, error } = parseStageScore(yamlWithTargetOffset);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    const s1Cam = score!.shots[0].stageCamera!;
    expect(s1Cam.targetOffset).toEqual({ x: 0.25, y: 0.35, z: -0.1 });

    const s2Cam = score!.shots[1].stageCamera!;
    expect(s2Cam.targetOffsetStart).toEqual({ x: 0, y: -1.1, z: 0 });
    expect(s2Cam.targetOffsetEnd).toEqual({ x: 0, y: 0.25, z: 0 });

    const s3Cam = score!.shots[2].stageCamera!;
    expect(s3Cam.waypoints?.[0].targetOffset).toEqual({ x: 0, y: 0.4, z: 0 });
  });

  describe('continuous: true — Opt-In Contiguous Shot Chaining', () => {
    it('chains consecutive shots with omitted start when continuous: true is enabled', () => {
      const chainedYaml = `
version: "1.0"
id: "continuous-chain-test"
title: "Continuous Oner Chain"
continuous: true
shots:
  - id: "s1"
    end: 6.0
  - id: "s2"
    end: 15.0
  - id: "s3"
    end: 27.0
`;
      const { score, error, warning } = parseStageScore(chainedYaml);
      expect(error).toBeNull();
      expect(warning).toBeNull();
      expect(score).not.toBeNull();
      expect(score!.continuous).toBe(true);

      const shots = score!.shots;
      expect(shots).toHaveLength(3);

      expect(shots[0].startSec).toBe(0.0);
      expect(shots[0].endSec).toBe(6.0);

      expect(shots[1].startSec).toBe(6.0);
      expect(shots[1].endSec).toBe(15.0);

      expect(shots[2].startSec).toBe(15.0);
      expect(shots[2].endSec).toBe(27.0);

      // Duration should auto-compute from final shot end
      expect(score!.durationSec).toBe(27.0);
    });

    it('honors explicit start on shot 1 and mid-sequence gap overrides in continuous mode', () => {
      const overrideYaml = `
version: "1.0"
id: "override-test"
title: "Override Test"
continuous: true
shots:
  - id: "s1"
    start: 4.0
    end: 10.0
  - id: "s2"
    end: 18.0
  - id: "s3"
    start: 24.0
    end: 30.0
`;
      const { score, error } = parseStageScore(overrideYaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();

      const shots = score!.shots;
      // Shot 1 honors explicit start: 4.0
      expect(shots[0].startSec).toBe(4.0);
      expect(shots[0].endSec).toBe(10.0);

      // Shot 2 chains from shot 1's end: 10.0
      expect(shots[1].startSec).toBe(10.0);
      expect(shots[1].endSec).toBe(18.0);

      // Shot 3 honors explicit start override: 24.0 (creating a 6s holding gap: 18 -> 24)
      expect(shots[2].startSec).toBe(24.0);
      expect(shots[2].endSec).toBe(30.0);
    });

    it('clamps endSec to startSec + 0.1 on typo where end is earlier than chained start', () => {
      const typoYaml = `
version: "1.0"
id: "typo-test"
title: "Typo Clamp Test"
continuous: true
shots:
  - id: "s1"
    end: 15.0
  - id: "s2"
    end: 8.0
`;
      const { score, error } = parseStageScore(typoYaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();

      expect(score!.shots[0].startSec).toBe(0.0);
      expect(score!.shots[0].endSec).toBe(15.0);

      // Shot 2 starts at 15.0; end 8.0 is clamped to 15.1
      expect(score!.shots[1].startSec).toBe(15.0);
      expect(score!.shots[1].endSec).toBeCloseTo(15.1, 4);
    });

    it('emits a non-blocking diagnostic warning when continuous is false and start is omitted on shot 2+', () => {
      const unchainedYaml = `
version: "1.0"
id: "unchained-test"
title: "Unchained Test"
shots:
  - id: "shot-1"
    end: 6.0
  - id: "shot-2"
    end: 15.0
`;
      const { score, error, warning } = parseStageScore(unchainedYaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(warning).toContain('Shot "shot-2" omits "start" (defaulted to 0.0s)');

      // Legacy fallback behavior preserved
      expect(score!.shots[0].startSec).toBe(0.0);
      expect(score!.shots[0].endSec).toBe(6.0);
      expect(score!.shots[1].startSec).toBe(0.0);
      expect(score!.shots[1].endSec).toBe(15.0);
    });

    it('keeps observer_shots decoupled and explicit even when continuous: true is declared', () => {
      const scoreWithObs = `
version: "1.0"
id: "obs-decoupled-test"
title: "Observer Decoupled Test"
continuous: true
shots:
  - id: "s1"
    end: 6.0
  - id: "s2"
    end: 15.0
observer_shots:
  - id: "obs-1"
    start: 0.0
    end: 27.0
`;
      const { score, error } = parseStageScore(scoreWithObs);
      expect(error).toBeNull();
      expect(score!.shots[1].startSec).toBe(6.0);
      expect(score!.observerShots![0].startSec).toBe(0.0);
      expect(score!.observerShots![0].endSec).toBe(27.0);
    });

    it('supports shot-level continuous overrides and hybrid cut/oner configurations', () => {
      const hybridYaml = `
version: "1.0"
id: "hybrid-shot-continuous-test"
title: "Hybrid Shot Continuous Test"
shots:
  - id: "s1"
    start: 0.0
    end: 4.0
  - id: "s2"
    start: 4.0
    end: 8.0
  - id: "s3"
    continuous: true
    end: 14.0
  - id: "s4"
    start: 14.0
    end: 20.0
`;
      const { score, error, warning } = parseStageScore(hybridYaml);
      expect(error).toBeNull();
      expect(warning).toBeNull();
      expect(score!.shots[0].continuous).toBeUndefined();
      expect(score!.shots[2].continuous).toBe(true);
      expect(score!.shots[2].startSec).toBe(8.0); // Auto-chained from s2.endSec
      expect(score!.shots[2].endSec).toBe(14.0);
    });

    it('allows shot-level continuous: false to override root continuous: true', () => {
      const overrideYaml = `
version: "1.0"
id: "shot-override-test"
title: "Shot Override Test"
continuous: true
shots:
  - id: "s1"
    end: 5.0
  - id: "s2"
    end: 10.0
  - id: "s3"
    continuous: false
    start: 12.0
    end: 18.0
`;
      const { score, error } = parseStageScore(overrideYaml);
      expect(error).toBeNull();
      expect(score!.continuous).toBe(true);
      expect(score!.shots[1].startSec).toBe(5.0);
      expect(score!.shots[2].continuous).toBe(false);
      expect(score!.shots[2].startSec).toBe(12.0);
    });

    it('auto-chains observer_shots timestamps when root continuous: true is declared', () => {
      const yaml = `
version: "1.0"
id: "obs-continuous-root"
title: "Observer Continuous Root"
continuous: true
shots:
  - id: "s1"
    end: 20.0
observer_shots:
  - id: "obs-1"
    end: 8.0
  - id: "obs-2"
    end: 15.0
  - id: "obs-3"
    start: 17.0
    end: 20.0
`;
      const { score, error } = parseStageScore(yaml);
      expect(error).toBeNull();
      expect(score!.observerShots).toHaveLength(3);
      expect(score!.observerShots![0].startSec).toBe(0.0);
      expect(score!.observerShots![0].endSec).toBe(8.0);
      expect(score!.observerShots![1].startSec).toBe(8.0); // Auto-chained from obs-1.endSec
      expect(score!.observerShots![1].endSec).toBe(15.0);
      expect(score!.observerShots![2].startSec).toBe(17.0); // Explicit start preserved (gap)
      expect(score!.observerShots![2].endSec).toBe(20.0);
    });

    it('supports cue-level continuous: true on observer_shots when root continuous is false', () => {
      const yaml = `
version: "1.0"
id: "obs-cue-continuous"
title: "Observer Cue Continuous"
shots:
  - id: "s1"
    start: 0.0
    end: 10.0
  - id: "s2"
    start: 10.0
    end: 20.0
observer_shots:
  - id: "obs-1"
    start: 0.0
    end: 7.5
  - id: "obs-2"
    continuous: true
    end: 14.0
  - id: "obs-3"
    continuous: false
    start: 16.0
    end: 20.0
`;
      const { score, error } = parseStageScore(yaml);
      expect(error).toBeNull();
      expect(score!.observerShots).toHaveLength(3);
      expect(score!.observerShots![0].startSec).toBe(0.0);
      expect(score!.observerShots![0].endSec).toBe(7.5);
      expect(score!.observerShots![1].continuous).toBe(true);
      expect(score!.observerShots![1].startSec).toBe(7.5); // Auto-chained from obs-1
      expect(score!.observerShots![1].endSec).toBe(14.0);
      expect(score!.observerShots![2].continuous).toBe(false);
      expect(score!.observerShots![2].startSec).toBe(16.0);
      expect(score!.observerShots![2].endSec).toBe(20.0);
    });

    it('emits a non-blocking diagnostic warning when continuous is false and start is omitted on observer_shot 2+', () => {
      const yaml = `
version: "1.0"
id: "obs-warning-test"
title: "Observer Warning Test"
shots:
  - id: "s1"
    start: 0.0
    end: 10.0
observer_shots:
  - id: "obs-1"
    start: 0.0
    end: 5.0
  - id: "obs-2"
    end: 10.0
`;
      const { score, error, warning } = parseStageScore(yaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(warning).toContain('Observer shot "obs-2" omits "start" (defaulted to 0.0s)');
      expect(score!.observerShots![1].startSec).toBe(0.0);
    });
  });
  describe('Modular Submodules — scorePrimitives & cameraCueParser Direct Unit Contracts', () => {
    it('correctly parses vector primitives and fallbacks', () => {
      expect(parseAngleToRad('45deg')).toBeCloseTo(Math.PI / 4, 4);
      expect(parseLensFocalLengthMm('35mm')).toBe(35);
      expect(parseCameraCueSpec({ maneuver: 'dolly' }, 50)?.maneuver).toBe('dolly');
      expect(parseObserverShots([{ start: 0, end: 5 }], 35)).toHaveLength(1);
      expect(parseVec3([1, 2, 3])).toEqual({ x: 1, y: 2, z: 3 });
      expect(parseVec3({ x: 4, y: 5, z: 6 })).toEqual({ x: 4, y: 5, z: 6 });
      expect(parseVec3('invalid', { x: 0, y: 1, z: 2 })).toEqual({ x: 0, y: 1, z: 2 });
      expect(parseOptionalVec3([10, 20, 30])).toEqual({ x: 10, y: 20, z: 30 });
      expect(parseOptionalVec3(null)).toBeUndefined();
      expect(parseTargetOrVec3('hero')).toBe('hero');
      expect(parseTargetOrVec3([0, 1, 0])).toEqual({ x: 0, y: 1, z: 0 });
      expect(parseTargetOrVec3('   ')).toBeUndefined();
    });

    it('normalizes enums with case-insensitivity and aliases', () => {
      expect(normalizeCameraManeuver('turntable')).toBe('orbit');
      expect(normalizeCameraManeuver('push')).toBe('dolly');
      expect(normalizeCameraManeuver('unknown')).toBe('dolly');
      expect(normalizeCameraEasing('ramp-up')).toBe('accel');
      expect(normalizeCameraEasing('decel')).toBe('deccel');
      expect(normalizeCameraEasing('unknown')).toBe('smooth');
      expect(normalizeEntityKind('prop')).toBe('prop');
      expect(normalizeEntityKind('marker')).toBe('marker');
      expect(normalizeEntityKind('unknown')).toBe('character');

      // Prop shapes and aliases
      expect(normalizeEntityShape('prop', 'box')).toBe('box');
      expect(normalizeEntityShape('prop', undefined)).toBe('box');
      expect(normalizeEntityShape('prop', 'sphere')).toBe('sphere');
      expect(normalizeEntityShape('prop', 'ball')).toBe('sphere');
      expect(normalizeEntityShape('prop', 'cylinder')).toBe('cylinder');
      expect(normalizeEntityShape('prop', 'can')).toBe('cylinder');
      expect(normalizeEntityShape('prop', 'capsule')).toBe('capsule');
      expect(normalizeEntityShape('prop', 'pill')).toBe('capsule');

      // Marker shapes and aliases
      expect(normalizeEntityShape('marker', 'x')).toBe('x');
      expect(normalizeEntityShape('marker', undefined)).toBe('x');
      expect(normalizeEntityShape('marker', 't')).toBe('t');
      expect(normalizeEntityShape('marker', 't-mark')).toBe('t');
      expect(normalizeEntityShape('marker', 'circle')).toBe('circle');
      expect(normalizeEntityShape('marker', 'ring')).toBe('circle');
      expect(normalizeEntityShape('marker', 'puck')).toBe('puck');
      expect(normalizeEntityShape('marker', 'disc')).toBe('puck');

      // Entity presentation styles & aliases
      expect(normalizeEntityStyle('character', undefined)).toBe('mannequin');
      expect(normalizeEntityStyle('character', 'mannequin')).toBe('mannequin');
      expect(normalizeEntityStyle('character', 'edges')).toBe('edges');
      expect(normalizeEntityStyle('character', 'hologram')).toBe('edges');
      expect(normalizeEntityStyle('character', 'cad')).toBe('edges');
      expect(normalizeEntityStyle('character', 'silhouette')).toBe('silhouette');
      expect(normalizeEntityStyle('character', 'ink')).toBe('silhouette');
      expect(normalizeEntityStyle('character', 'wireframe')).toBe('wireframe');
      expect(normalizeEntityStyle('character', 'wire')).toBe('wireframe');

      expect(normalizeEntityStyle('prop', undefined)).toBe('edges');
      expect(normalizeEntityStyle('prop', 'edges')).toBe('edges');
      expect(normalizeEntityStyle('prop', 'glass')).toBe('glass');
      expect(normalizeEntityStyle('prop', 'ghost')).toBe('glass');
      expect(normalizeEntityStyle('prop', 'translucent')).toBe('glass');
      expect(normalizeEntityStyle('prop', 'solid')).toBe('solid');
      expect(normalizeEntityStyle('prop', 'opaque')).toBe('solid');
      expect(normalizeEntityStyle('prop', 'wireframe')).toBe('wireframe');

      expect(normalizeEntityStyle('marker', undefined)).toBe('tape');
      expect(normalizeEntityStyle('marker', 'tape')).toBe('tape');
      expect(normalizeEntityStyle('marker', 'glow')).toBe('glow');
      expect(normalizeEntityStyle('marker', 'pulse')).toBe('glow');
      expect(normalizeEntityStyle('marker', 'beacon')).toBe('beacon');
      expect(normalizeEntityStyle('marker', 'pin')).toBe('beacon');
    });

    it('parses base spherical camera pose and resolves entity targets', () => {
      const pose = parseBaseSphericalPose(
        { target: [1, 2, 3], distance: 5, pitch: 15, yaw: 45, roll: 10, lens: '35mm' },
        DEFAULT_OBSERVER_POSE
      );
      expect(pose.distance).toBe(5);
      expect(pose.focalLengthMm).toBe(35);
      expect(pose.target).toEqual({ x: 1, y: 2, z: 3 });

      const entities = [
        {
          id: 'actor',
          label: 'Lead Actor',
          kind: 'character' as const,
          position: { x: 2, y: 0, z: 3 },
          rotationYRad: 0,
          height: 1.75,
          radius: 0.28,
          color: '#fff',
        },
      ];
      const stageCamPose = { ...DEFAULT_OBSERVER_POSE, target: { x: 0, y: 0, z: 0 } };
      resolveStageCamEntityTarget(
        { target: 'actor', target_offset: [0, 0.5, 0] },
        stageCamPose,
        entities
      );
      expect(stageCamPose.target.x).toBe(2);
      expect(stageCamPose.target.y).toBeCloseTo(0 + 1.75 * 0.9 + 0.5, 4);
      expect(stageCamPose.target.z).toBe(3);
    });

    it('parses stage camera cue specs with frustum depth and show_path options', () => {
      const spec = parseStageCameraCueSpec({
        maneuver: 'arc',
        frustum_depth: 4.5,
        frustum_color: '#38bdf8',
        show_path: true,
        waypoints: [{ target: 'center', at: 0.5 }],
      });
      expect(spec).toBeDefined();
      expect(spec!.maneuver).toBe('arc');
      expect(spec!.frustumDepth).toBe(4.5);
      expect(spec!.frustumColor).toBe('#38bdf8');
      expect(spec!.showPath).toBe(true);
      expect(spec!.waypoints).toHaveLength(1);
    });

    it('verifies all catalog items parse identically without errors (Golden Equivalence)', () => {
      expect(INITIAL_CATALOG_ITEMS.length).toBeGreaterThanOrEqual(6);
      for (const item of INITIAL_CATALOG_ITEMS) {
        expect(item.score).toBeDefined();
        expect(item.score.shots.length).toBeGreaterThan(0);
        expect(item.score.durationSec).toBeGreaterThan(0);
        expect(item.score.stage.width).toBeGreaterThan(0);
        expect(item.score.stage.depth).toBeGreaterThan(0);
      }
    });

    it('parses root-level blocking: cues in both single-entity and multi-entity beat formats', () => {
      const yamlWithBlocking = `
version: "1.0"
id: "blocking-parse-test"
title: "Blocking Parse Test"
entities:
  - id: "arthur"
    label: "Arthur (Lead)"
    kind: "character"
    position: [-10, 0, 0]
    rotation: 90
  - id: "ruby"
    label: "Ruby (Partner)"
    kind: "character"
    position: [6, 0, 0]
    rotation: -90

blocking:
  - id: "arthur-cross"
    label: "Room Cross"
    entity: "Arthur (Lead)"
    start: 0.0
    end: 9.0
    from: [-10, 0, 0]
    position: [2, 0, 0]
    rotation: 45
    look_at: "ruby"
    easing: "cruise"
    highlighted: true
    visible: true
    note: "Walks across stage"

  - id: "beat-2"
    label: "Mutual Turn"
    start: 10.0
    end: 18.0
    entities:
      arthur:
        rotation: 0
        easing: "smooth"
      ruby:
        position: [3, 0, 1]
        look_at: "arthur"
        easing: "ease-out"
        visible: false

shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 6.0
    stage_camera:
      target: "arthur"
      lens: 35mm
`;
      const { score, error } = parseStageScore(yamlWithBlocking);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(score!.blocking).toBeDefined();
      expect(score!.blocking).toHaveLength(3);

      // Duration auto-extends to maxBlockingEnd (18.0s) when root duration is omitted
      expect(score!.durationSec).toBe(18.0);

      const c1 = score!.blocking![0];
      expect(c1.id).toBe('arthur-cross');
      expect(c1.label).toBe('Room Cross');
      expect(c1.entityId).toBe('arthur'); // Resolved from label "Arthur (Lead)"
      expect(c1.startSec).toBe(0.0);
      expect(c1.endSec).toBe(9.0);
      expect(c1.fromPosition).toEqual({ x: -10, y: 0, z: 0 });
      expect(c1.position).toEqual({ x: 2, y: 0, z: 0 });
      expect(radToDeg(c1.rotationYRad!)).toBeCloseTo(45, 4);
      expect(c1.lookAt).toBe('ruby');
      expect(c1.easing).toBe('cruise');
      expect(c1.highlighted).toBe(true);
      expect(c1.visible).toBe(true);
      expect(c1.note).toBe('Walks across stage');

      const c2 = score!.blocking![1];
      expect(c2.id).toBe('beat-2:arthur');
      expect(c2.entityId).toBe('arthur');
      expect(c2.startSec).toBe(10.0);
      expect(c2.endSec).toBe(18.0);
      expect(radToDeg(c2.rotationYRad!)).toBeCloseTo(0, 4);
      expect(c2.easing).toBe('smooth');

      const c3 = score!.blocking![2];
      expect(c3.id).toBe('beat-2:ruby');
      expect(c3.entityId).toBe('ruby');
      expect(c3.position).toEqual({ x: 3, y: 0, z: 1 });
      expect(c3.lookAt).toBe('arthur');
      expect(c3.easing).toBe('ease-out');
      expect(c3.visible).toBe(false);
    });

    it('parses entity style property for characters, props, and markers in YAML score', () => {
      const yaml = `
version: "1.0"
id: "style-test"
title: "Entity Style Test"
entities:
  - id: "actor"
    kind: "character"
    style: "silhouette"
  - id: "table"
    kind: "prop"
    shape: "box"
    style: "solid"
  - id: "halo"
    kind: "marker"
    shape: "circle"
    style: "glow"
shots:
  - id: "s1"
    start: 0
    end: 2
`;
      const { score, error } = parseStageScore(yaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(score!.entities[0].style).toBe('silhouette');
      expect(score!.entities[1].style).toBe('solid');
      expect(score!.entities[2].style).toBe('glow');
    });
    it('normalizes entity kind aliases (actor, person, set, furniture, item, object, spike, mark)', () => {
      expect(normalizeEntityKind('actor')).toBe('character');
      expect(normalizeEntityKind('person')).toBe('character');
      expect(normalizeEntityKind('set')).toBe('prop');
      expect(normalizeEntityKind('furniture')).toBe('prop');
      expect(normalizeEntityKind('item')).toBe('prop');
      expect(normalizeEntityKind('object')).toBe('prop');
      expect(normalizeEntityKind('spike')).toBe('marker');
      expect(normalizeEntityKind('mark')).toBe('marker');
    });

    it('defaults breathe to 1.25 for recoil maneuver and resolves stage preset targets in baseline cameras', () => {
      const recoilSpec = parseCameraCueSpec({ maneuver: 'recoil' }, 50);
      expect(recoilSpec).toBeDefined();
      expect(recoilSpec!.breathe).toBe(1.25);

      const arcSpec = parseCameraCueSpec({ maneuver: 'arc' }, 50);
      expect(arcSpec!.breathe).toBe(1.12);

      const dollySpec = parseCameraCueSpec({ maneuver: 'dolly' }, 50);
      expect(dollySpec!.breathe).toBe(1.0);

      const centerPose = { ...DEFAULT_OBSERVER_POSE, target: { x: 9, y: 9, z: 9 } };
      resolveStageCamEntityTarget(
        { target: 'center', target_offset: [0.5, 0.25, -0.5] },
        centerPose,
        []
      );
      expect(centerPose.target).toEqual({ x: 0.5, y: 1.25, z: -0.5 });
    });

    it('parses duration, cut flag, and auto-chains timestamps for continuous blocking cues', () => {
      const continuousBlockingYaml = `
version: "1.0"
id: "continuous-blocking-test"
title: "Continuous Blocking Test"
continuous: true
entities:
  - id: "ruby"
    kind: "character"
    position: [0, 0, 0]
  - id: "evan"
    kind: "character"
    position: [-2, 0, 0]
shots:
  - id: "s1"
    start: 0
    end: 10
blocking:
  # Beat 1: Explicit start + duration
  - id: "beat-1"
    start: 0.0
    duration: 4.0
    entities:
      ruby: { position: [2, 0, 0] }
      evan: { position: [0, 0, 0] }
  # Beat 2: Omitted start, auto-chains to 4.0s; uses dur: 2.5s; ruby has cut: true
  - id: "beat-2"
    dur: 2.5
    entities:
      ruby: { cut: true, position: [10, 0, 0] }
      evan: { position: [1, 0, 0] }
  # Beat 3: Flat single entity cue, omitted start, auto-chains to 6.5s
  - id: "beat-3-evan"
    actor: "evan"
    duration: 3.0
    position: [5, 0, 0]
  # Beat 4: Flat single entity cue, omitted start, auto-chains to 9.5s with cut: true
  - id: "beat-4-ruby"
    actor: "ruby"
    duration: 2.0
    cut: true
    position: [-8, 0, 0]
`;
      const { score, error, warning } = parseStageScore(continuousBlockingYaml);
      expect(error).toBeNull();
      expect(warning).toBeNull();
      expect(score).not.toBeNull();

      const blocking = score!.blocking!;
      expect(blocking).toHaveLength(6); // 2 from beat-1, 2 from beat-2, 1 from beat-3, 1 from beat-4

      // Beat 1: 0.0 to 4.0
      const b1Ruby = blocking.find((b) => b.id === 'beat-1:ruby')!;
      expect(b1Ruby.startSec).toBe(0.0);
      expect(b1Ruby.endSec).toBe(4.0);
      expect(b1Ruby.duration).toBe(4.0);
      expect(b1Ruby.cut).toBeUndefined();

      // Beat 2: 4.0 to 6.5
      const b2Ruby = blocking.find((b) => b.id === 'beat-2:ruby')!;
      expect(b2Ruby.startSec).toBe(4.0);
      expect(b2Ruby.endSec).toBe(6.5);
      expect(b2Ruby.cut).toBe(true);

      const b2Evan = blocking.find((b) => b.id === 'beat-2:evan')!;
      expect(b2Evan.startSec).toBe(4.0);
      expect(b2Evan.endSec).toBe(6.5);

      // Beat 3: 6.5 to 9.5
      const b3Evan = blocking.find((b) => b.id === 'beat-3-evan')!;
      expect(b3Evan.startSec).toBe(6.5);
      expect(b3Evan.endSec).toBe(9.5);
      expect(b3Evan.duration).toBe(3.0);

      // Beat 4: 9.5 to 11.5 with cut: true
      const b4Ruby = blocking.find((b) => b.id === 'beat-4-ruby')!;
      expect(b4Ruby.startSec).toBe(9.5);
      expect(b4Ruby.endSec).toBe(11.5);
      expect(b4Ruby.duration).toBe(2.0);
      expect(b4Ruby.cut).toBe(true);
    });

    it('emits diagnostic warning when blocking cue omits start outside continuous mode', () => {
      const unchainedBlockingYaml = `
version: "1.0"
id: "unchained-blocking-test"
title: "Unchained Blocking Test"
shots:
  - id: "s1"
    start: 0
    end: 10
entities:
  - id: "ruby"
    kind: "character"
blocking:
  - id: "b1"
    actor: "ruby"
    start: 0.0
    end: 3.0
  - id: "b2"
    actor: "ruby"
    end: 6.0
`;
      const { score, error, warning } = parseStageScore(unchainedBlockingYaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(warning).toContain('Blocking cue "b2" omits "start" (defaulted to 0.0s)');
    });

    it('parses cut flag on shot-level entity overrides', () => {
      const shotEntityCutYaml = `
version: "1.0"
id: "shot-cut-test"
title: "Shot Cut Test"
entities:
  - id: "ruby"
    kind: "character"
shots:
  - id: "shot-1"
    start: 0
    end: 5
    entities:
      ruby:
        position: [2, 0, 0]
  - id: "shot-2"
    start: 5
    end: 10
    entities:
      ruby:
        cut: true
        position: [-10, 0, 0]
`;
      const { score, error } = parseStageScore(shotEntityCutYaml);
      expect(error).toBeNull();
      expect(score).not.toBeNull();
      expect(score!.shots[1].entities.ruby.cut).toBe(true);
    });
  });
});
