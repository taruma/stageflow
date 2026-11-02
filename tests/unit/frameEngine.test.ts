import { describe, expect, it } from 'vitest';
import { computeStageFrame } from '../../src/core/frameEngine';
import { parseStageScore } from '../../src/core/scoreParser';
import { INITIAL_CATALOG_ITEMS } from '../../src/core/scoreCatalog';

describe('frameEngine — Stateless Functional Timeline (Frame_t = f(t))', () => {
  it('produces bit-for-bit identical 3D states at any timestamp t regardless of scrub direction', () => {
    const score = INITIAL_CATALOG_ITEMS[0].score;

    // Forward playback evaluation sequence: 0.0 -> 2.5 -> 5.0 -> 8.2
    computeStageFrame(0.0, score);
    computeStageFrame(2.5, score);
    const forwardAt5 = computeStageFrame(5.0, score);
    computeStageFrame(8.2, score);

    // Random backward & jumping scrub sequence: 9.8 -> 1.1 -> 7.4 -> 5.0
    computeStageFrame(9.8, score);
    computeStageFrame(1.1, score);
    computeStageFrame(7.4, score);
    const scrubbedAt5 = computeStageFrame(5.0, score);

    expect(scrubbedAt5.stageCamera.transform.position).toEqual(
      forwardAt5.stageCamera.transform.position
    );
    expect(scrubbedAt5.stageCamera.transform.target).toEqual(
      forwardAt5.stageCamera.transform.target
    );
    expect(scrubbedAt5.observerCamera.transform.position).toEqual(
      forwardAt5.observerCamera.transform.position
    );
  });

  it('chains camera and entity poses across multi-shot transitions cleanly', () => {
    const multiShotYaml = `
version: "1.0"
id: "multi-shot-test"
title: "Multi-Shot Pose Chaining Test"
duration: 8.0
entities:
  - id: "actor_a"
    label: "Actor A"
    kind: "character"
    position: [-2, 0, 0]
    rotation: 0
  - id: "actor_b"
    label: "Actor B"
    kind: "character"
    position: [2, 0, 0]
    rotation: 180
shots:
  - id: "shot-1"
    shot: 1
    label: "Walk In"
    start: 0.0
    end: 4.0
    stage_camera:
      target: "actor_a"
      maneuver: "dolly"
      distance_start: 5.0
      distance_end: 3.0
      pitch: 10
      yaw: 0
      lens: 35mm
    entities:
      actor_a:
        position: [0, 0, 0]
        look_at: "actor_b"
        highlighted: true
  - id: "shot-2"
    shot: 2
    label: "Close Up Hold"
    start: 4.0
    end: 8.0
    stage_camera:
      maneuver: "orbit"
      yaw_delta: 45
      lens: 85mm
`;
    const { score, error } = parseStageScore(multiShotYaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    // At t = 4.0s (start of Shot 2), Actor A should have arrived at [0, 0, 0] and remain there in Shot 2
    const frameAt6 = computeStageFrame(6.0, score!);
    const actorA = frameAt6.entitiesById.get('actor_a');
    expect(actorA).toBeDefined();
    expect(actorA!.position.x).toBeCloseTo(0, 4);
    expect(actorA!.position.z).toBeCloseTo(0, 4);

    // Stage camera in Shot 2 inherits Shot 1's terminal distance (3.0m) and switches to 85mm lens
    expect(frameAt6.stageCamera.transform.pose.distance).toBeCloseTo(3.0, 4);
    expect(frameAt6.stageCamera.transform.pose.focalLengthMm).toBeCloseTo(
      85,
      4
    );
  });
});
