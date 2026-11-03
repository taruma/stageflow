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

  it('registers and bundles Blueprint 01 and Blueprint 02 in the initial catalog', () => {
    expect(INITIAL_CATALOG_ITEMS).toHaveLength(2);

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
  });
});
