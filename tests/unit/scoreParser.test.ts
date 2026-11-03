import { describe, expect, it } from 'vitest';
import { parseStageScore } from '../../src/core/scoreParser';
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

  it('registers and bundles Blueprint 01, Blueprint 02, Blueprint 03, and Blueprint 04 in the initial catalog', () => {
    expect(INITIAL_CATALOG_ITEMS).toHaveLength(4);

    const bp01 = INITIAL_CATALOG_ITEMS[0];
    expect(bp01.id).toBe('demo-blueprint');
    expect(bp01.score.shots).toHaveLength(1);

    const bp02 = INITIAL_CATALOG_ITEMS[1];
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

    const bp03 = INITIAL_CATALOG_ITEMS[2];
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

    const bp04 = INITIAL_CATALOG_ITEMS[3];
    expect(bp04.id).toBe('blueprint-04-cinematography-tutorial');
    expect(bp04.score.durationSec).toBe(20.0);
    expect(bp04.score.shots).toHaveLength(16);
    expect(bp04.score.observerShots).toBeDefined();
    expect(bp04.score.observerShots).toHaveLength(1);
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
});
