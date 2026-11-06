import { describe, expect, it } from 'vitest';
import { parseStageScore } from '../../src/core/scoreParser';
import {
  normalizeCameraEasing,
  normalizeCameraManeuver,
  normalizeEntityKind,
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

  it('registers and bundles Vector Field, Blueprint 01, Blueprint 02, Blueprint 03, Blueprint 04, and Blueprint 05 in the initial catalog', () => {
    expect(INITIAL_CATALOG_ITEMS).toHaveLength(6);


    const bpVectorField = INITIAL_CATALOG_ITEMS[0];
    expect(bpVectorField.id).toBe('vector-field-taruma-sakti');
    expect(bpVectorField.score.title).toBe('Vector Field');
    expect(bpVectorField.score.shots).toHaveLength(32);
    expect(bpVectorField.score.blocking).toBeDefined();
    expect(bpVectorField.score.observerShots).toBeDefined();
    expect(bpVectorField.score.observerShots).toHaveLength(6);

    const bp01 = INITIAL_CATALOG_ITEMS[1];
    expect(bp01.id).toBe('demo-blueprint');
    expect(bp01.score.shots).toHaveLength(1);

    const bp02 = INITIAL_CATALOG_ITEMS[2];
    expect(bp02.id).toBe('blueprint-02-dialogue');
    expect(bp02.score.durationSec).toBe(26);
    expect(bp02.score.shots).toHaveLength(6);
    expect(bp02.score.shots.map((s) => s.stageCamera?.maneuver)).toEqual([
      'dolly',
      'dolly',
      'dolly',
      'arc',
      'spline',
      'orbit',
    ]);
    expect(bp02.score.observerShots).toBeDefined();
    expect(bp02.score.observerShots).toHaveLength(3);

    const bp03 = INITIAL_CATALOG_ITEMS[3];
    expect(bp03.id).toBe('blueprint-03-ball-pass');
    expect(bp03.score.durationSec).toBe(16);
    expect(bp03.score.shots).toHaveLength(6);
    expect(bp03.score.observerShots).toBeUndefined();
    expect(bp03.score.shots.map((s) => s.stageCamera?.maneuver)).toEqual([
      'dolly',
      'swoop',
      'arc',
      'dolly',
      'dolly',
      'recoil',
    ]);

    const bp04 = INITIAL_CATALOG_ITEMS[4];
    expect(bp04.id).toBe('blueprint-04-cinematography-tutorial');
    expect(bp04.score.durationSec).toBe(20.0);
    expect(bp04.score.shots).toHaveLength(16);
    expect(bp04.score.observerShots).toBeDefined();
    expect(bp04.score.observerShots).toHaveLength(1);

    const bp05 = INITIAL_CATALOG_ITEMS[5];
    expect(bp05.id).toBe('blueprint-05-two-rooms');
    expect(bp05.score.durationSec).toBe(30.0);
    expect(bp05.score.shots).toHaveLength(17);
    expect(bp05.score.blocking).toBeDefined();
    expect(bp05.score.blocking!.length).toBeGreaterThanOrEqual(10);
    expect(bp05.score.observerShots).toBeDefined();
    expect(bp05.score.observerShots).toHaveLength(3);
    const ruby = bp05.score.entities.find((e) => e.id === 'ruby');
    const samira = bp05.score.entities.find((e) => e.id === 'samira');
    const rosa = bp05.score.entities.find((e) => e.id === 'rosa');
    expect(ruby?.height).toBe(1.68);
    expect(samira?.height).toBe(1.84);
    expect(rosa?.height).toBe(1.54);
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

    it('verifies all 6 bundled scene catalog items parse identically without errors (Golden Equivalence)', () => {
      expect(INITIAL_CATALOG_ITEMS).toHaveLength(6);


    const bpVectorField = INITIAL_CATALOG_ITEMS[0];
    expect(bpVectorField.id).toBe('vector-field-taruma-sakti');
    expect(bpVectorField.score.title).toBe('Vector Field');
    expect(bpVectorField.score.shots).toHaveLength(32);
    expect(bpVectorField.score.blocking).toBeDefined();
    expect(bpVectorField.score.observerShots).toBeDefined();
    expect(bpVectorField.score.observerShots).toHaveLength(6);
      for (const item of INITIAL_CATALOG_ITEMS) {
        expect(item.score).toBeDefined();
        expect(item.score.shots.length).toBeGreaterThan(0);
        expect(item.score.durationSec).toBeGreaterThan(0);
        expect(item.score.stage.width).toBeGreaterThan(0);
        expect(item.score.stage.depth).toBeGreaterThan(0);
        if (item.id === 'blueprint-05-two-rooms' || item.id === 'vector-field-taruma-sakti') {
          expect(item.score.blocking).toBeDefined();
        } else {
          expect(item.score.blocking).toBeUndefined();
        }
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
  });
});
