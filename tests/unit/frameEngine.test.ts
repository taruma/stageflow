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

  it('cuts cleanly between sequential dolly shots with different targets without dragging look-at target across shots', () => {
    const sequentialDollyYaml = `
version: "1.0"
id: "sequential-dolly-test"
title: "Sequential Dolly Target Cut Test"
duration: 6.0
entities:
  - id: "actor_a"
    label: "Actor A"
    kind: "character"
    position: [-2, 0, 0]
  - id: "actor_b"
    label: "Actor B"
    kind: "character"
    position: [2, 0, 0]
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 3.0
    stage_camera:
      target: "actor_a"
      maneuver: "dolly"
      distance_start: 4.0
      distance_end: 2.0
      pitch: 0
      yaw: 0
      lens: 50mm
  - id: "shot-2"
    shot: 2
    start: 3.0
    end: 6.0
    stage_camera:
      target: "actor_b"
      maneuver: "dolly"
      distance_start: 3.0
      distance_end: 1.5
      pitch: 0
      yaw: 180
      lens: 85mm
`;
    const { score, error } = parseStageScore(sequentialDollyYaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    // Default character height 1.75m * anchor ratio 0.78 = 1.365m eye-level anchor
    const expectedAnchorY = 1.365;

    // At t = 0.0s (start of Shot 1): camera is at actor_a + [0, 0, 4] -> [-2, 1.365, 4], target [-2, 1.365, 0]
    const f0 = computeStageFrame(0.0, score!);
    expect(f0.stageCamera.transform.target.x).toBeCloseTo(-2, 3);
    expect(f0.stageCamera.transform.target.y).toBeCloseTo(expectedAnchorY, 3);
    expect(f0.stageCamera.transform.position.x).toBeCloseTo(-2, 3);
    expect(f0.stageCamera.transform.position.y).toBeCloseTo(expectedAnchorY, 3);
    expect(f0.stageCamera.transform.position.z).toBeCloseTo(4, 3);

    // At t = 2.99s (end of Shot 1): camera is at actor_a + [0, 0, 2] -> [-2, 1.365, 2], target [-2, 1.365, 0]
    const fBeforeCut = computeStageFrame(2.99, score!);
    expect(fBeforeCut.stageCamera.transform.target.x).toBeCloseTo(-2, 2);
    expect(fBeforeCut.stageCamera.transform.position.x).toBeCloseTo(-2, 2);

    // At t = 3.0s (instantaneous cut to Shot 2): target MUST immediately be actor_b [2, 1.365, 0]
    // with yaw = 180 deg (facing back: delta Z = -3) -> camera pos [2, 1.365, -3]
    const fCut = computeStageFrame(3.0, score!);
    expect(fCut.stageCamera.shotId).toBe('shot-2');
    expect(fCut.stageCamera.transform.target.x).toBeCloseTo(2, 3);
    expect(fCut.stageCamera.transform.target.y).toBeCloseTo(expectedAnchorY, 3);
    expect(fCut.stageCamera.transform.target.z).toBeCloseTo(0, 3);

    expect(fCut.stageCamera.transform.position.x).toBeCloseTo(2, 3);
    expect(fCut.stageCamera.transform.position.y).toBeCloseTo(expectedAnchorY, 3);
    expect(fCut.stageCamera.transform.position.z).toBeCloseTo(-3, 3);

    // Mid-shot at t = 4.5s: target must remain strictly on actor_b
    const fMid = computeStageFrame(4.5, score!);
    expect(fMid.stageCamera.transform.target.x).toBeCloseTo(2, 3);
    expect(fMid.stageCamera.transform.position.x).toBeCloseTo(2, 3);
  });

  it('evaluates a single continuous observer_shots move across multiple rapid film cuts smoothly', () => {
    const scoreYaml = `
version: "1.0"
id: "continuous-observer-test"
title: "Continuous Observer Across Film Cuts"
duration: 8.0
stage:
  observer_camera:
    target: [0, 1.0, 0]
    distance: 10.0
    pitch: 30
    yaw: 0
    lens: 35mm
shots:
  - id: "cut-1"
    shot: 1
    start: 0.0
    end: 2.0
    stage_camera: { target: [0, 1, 0], lens: 35mm }
  - id: "cut-2"
    shot: 2
    start: 2.0
    end: 4.0
    stage_camera: { target: [0, 1, 0], lens: 50mm }
  - id: "cut-3"
    shot: 3
    start: 4.0
    end: 6.0
    stage_camera: { target: [0, 1, 0], lens: 85mm }
  - id: "cut-4"
    shot: 4
    start: 6.0
    end: 8.0
    stage_camera: { target: [0, 1, 0], lens: 135mm }
observer_shots:
  - id: "single-master-orbit"
    start: 0.0
    end: 8.0
    maneuver: "orbit"
    easing: "linear"
    target: [0, 1.0, 0]
    distance: 8.0
    pitch: 20
    yaw_start: 0
    yaw_end: 180
    lens: 28mm
`;
    const { score, error } = parseStageScore(scoreYaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    // At t = 0.0s (start)
    const f0 = computeStageFrame(0.0, score!);
    expect(f0.observerCamera.transform.pose.yaw).toBeCloseTo(0.0, 3);
    expect(f0.observerCamera.transform.pose.focalLengthMm).toBe(28);

    // At t = 2.0s (boundary of cut 1 -> 2), observer should be at 25% progress (45 deg = PI / 4)
    const f2 = computeStageFrame(2.0, score!);
    expect(f2.observerCamera.transform.pose.yaw).toBeCloseTo(Math.PI / 4, 3);

    // At t = 4.0s (boundary of cut 2 -> 3), observer should be at 50% progress (90 deg = PI / 2)
    const f4 = computeStageFrame(4.0, score!);
    expect(f4.observerCamera.transform.pose.yaw).toBeCloseTo(Math.PI / 2, 3);

    // At t = 8.0s (end of timeline), observer should reach 180 deg (PI)
    const f8 = computeStageFrame(8.0, score!);
    expect(f8.observerCamera.transform.pose.yaw).toBeCloseTo(Math.PI, 3);
  });

  it('gives complete precedence to root-level observer_shots over per-shot observer_camera cues', () => {
    const conflictYaml = `
version: "1.0"
id: "conflict-test"
title: "Conflict Resolution Test"
duration: 6.0
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 6.0
    stage_camera:
      target: [0, 1, 0]
    observer_camera:
      target: [0, 1, 0]
      distance: 2.0
      pitch: 10
      yaw: 45
      lens: 85mm
observer_shots:
  - id: "root-obs-1"
    start: 0.0
    end: 6.0
    maneuver: "dolly"
    target: [0, 1, 0]
    distance: 9.0
    pitch: 40
    yaw: 90
    lens: 24mm
`;
    const { score, error } = parseStageScore(conflictYaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    const frame = computeStageFrame(3.0, score!);
    // Must strictly follow root observer_shots (distance 9.0m, pitch 40 deg, lens 24mm)
    expect(frame.observerCamera.transform.pose.distance).toBeCloseTo(9.0, 3);
    expect(frame.observerCamera.transform.pose.focalLengthMm).toBe(24);
    expect(frame.observerCamera.shotId).toBe('root-obs-1');
  });

  it('holds resting pose during time gaps and forward-chains into subsequent observer_shots', () => {
    const gapYaml = `
version: "1.0"
id: "gap-test"
title: "Gap and Chaining Test"
duration: 10.0
shots:
  - id: "film-shot"
    shot: 1
    start: 0.0
    end: 10.0
    stage_camera: { target: [0, 1, 0] }
observer_shots:
  - id: "move-1"
    start: 0.0
    end: 4.0
    maneuver: "dolly"
    distance_start: 10.0
    distance_end: 6.0
    pitch: 25
    yaw: 30
    lens: 35mm
  - id: "move-2"
    start: 7.0
    end: 10.0
    maneuver: "orbit"
    yaw_delta: 60
    lens: 50mm
`;
    const { score, error } = parseStageScore(gapYaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    // At t = 4.0s (end of move-1), distance is 6.0m, yaw is 30 deg
    const f4 = computeStageFrame(4.0, score!);
    expect(f4.observerCamera.transform.pose.distance).toBeCloseTo(6.0, 3);

    // At t = 5.5s (inside the 4.0s -> 7.0s gap), camera must HOLD move-1's terminal pose
    const f5_5 = computeStageFrame(5.5, score!);
    expect(f5_5.observerCamera.isHold).toBe(true);
    expect(f5_5.observerCamera.transform.pose.distance).toBeCloseTo(6.0, 3);
    expect(f5_5.observerCamera.shotId).toBe('move-1');

    // At t = 7.0s (start of move-2), it forward-chains from move-1's terminal pose (distance: 6.0m)
    const f7 = computeStageFrame(7.0, score!);
    expect(f7.observerCamera.transform.pose.distance).toBeCloseTo(6.0, 3);
    expect(f7.observerCamera.shotId).toBe('move-2');

    // At t = 10.0s (end of move-2), lens is 50mm
    const f10 = computeStageFrame(10.0, score!);
    expect(f10.observerCamera.transform.pose.focalLengthMm).toBe(50);
  });

  it('validates Blueprint 02 full timeline continuity and shot cut integrity across all 6 film shots', () => {
    const bp2Item = INITIAL_CATALOG_ITEMS.find(
      (item) => item.id === 'blueprint-02-dialogue'
    );
    expect(bp2Item).toBeDefined();
    const score = bp2Item!.score;

    expect(score.shots).toHaveLength(6);
    expect(score.observerShots).toHaveLength(3);

    // Verify Shot 1 -> Shot 2 cut (t = 5.0s)
    const fBeforeCut1 = computeStageFrame(4.99, score);
    const fAtCut1 = computeStageFrame(5.00, score);
    expect(fBeforeCut1.stageCamera.shotId).toBe('shot-1');
    expect(fAtCut1.stageCamera.shotId).toBe('shot-2');
    expect(fBeforeCut1.stageCamera.transform.pose.focalLengthMm).toBe(35);
    expect(fAtCut1.stageCamera.transform.pose.focalLengthMm).toBe(50);

    // Observer camera spans smoothly across Shot 1 -> Shot 2 cut inside Move 1
    expect(fBeforeCut1.observerCamera.shotId).toBe('obs-move-1');
    expect(fAtCut1.observerCamera.shotId).toBe('obs-move-1');
    expect(
      Math.abs(
        fAtCut1.observerCamera.transform.pose.yaw -
          fBeforeCut1.observerCamera.transform.pose.yaw
      )
    ).toBeLessThan(0.05);

    // Verify Shot 2 -> Shot 3 cut (t = 9.0s, OTS A -> Reverse OTS B, and Observer Move 1 -> Move 2)
    const fBeforeCut2 = computeStageFrame(8.99, score);
    const fAtCut2 = computeStageFrame(9.00, score);
    expect(fBeforeCut2.stageCamera.shotId).toBe('shot-2');
    expect(fAtCut2.stageCamera.shotId).toBe('shot-3');
    expect(fBeforeCut2.observerCamera.shotId).toBe('obs-move-1');
    expect(fAtCut2.observerCamera.shotId).toBe('obs-move-2');

    // Verify Shot 3 -> Shot 4 cut (t = 13.0s, Reverse OTS -> 85mm Hero Arc)
    const fBeforeCut3 = computeStageFrame(12.99, score);
    const fAtCut3 = computeStageFrame(13.00, score);
    expect(fBeforeCut3.stageCamera.shotId).toBe('shot-3');
    expect(fAtCut3.stageCamera.shotId).toBe('shot-4');
    expect(fAtCut3.stageCamera.transform.pose.focalLengthMm).toBe(85);

    // Verify Shot 4 -> Shot 5 cut (t = 17.5s, Arc -> Spline Bridge)
    const fBeforeCut4 = computeStageFrame(17.49, score);
    const fAtCut4 = computeStageFrame(17.50, score);
    expect(fBeforeCut4.stageCamera.shotId).toBe('shot-4');
    expect(fAtCut4.stageCamera.shotId).toBe('shot-5');
    expect(fAtCut4.stageCamera.maneuver).toBe('spline');

    // Verify Shot 5 -> Shot 6 cut (t = 21.5s, Spline -> Crane Orbit Pullback)
    const fBeforeCut5 = computeStageFrame(21.49, score);
    const fAtCut5 = computeStageFrame(21.50, score);
    expect(fBeforeCut5.stageCamera.shotId).toBe('shot-5');
    expect(fAtCut5.stageCamera.shotId).toBe('shot-6');
    expect(fAtCut5.stageCamera.maneuver).toBe('orbit');

    // Verify Terminal Pose at t = 26.0s (full timeline end)
    const fEnd = computeStageFrame(26.00, score);
    expect(fEnd.stageCamera.shotId).toBe('shot-6');
    expect(fEnd.observerCamera.shotId).toBe('obs-move-3');
    expect(Number.isFinite(fEnd.stageCamera.transform.position.x)).toBe(true);
    expect(Number.isFinite(fEnd.observerCamera.transform.position.x)).toBe(true);
  });

  it('implements Option A shot-boundary roll reset: resets to 0 deg when roll is omitted on subsequent shot', () => {
    const yaml = `
version: "1.0"
id: "option-a-test"
title: "Option A Roll Reset Test"
duration: 8.0
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 4.0
    stage_camera:
      target: [0, 1, 0]
      roll: 18
  - id: "shot-2"
    shot: 2
    start: 4.0
    end: 8.0
    stage_camera:
      target: [0, 1, 0]
`;
    const { score } = parseStageScore(yaml);
    expect(score).not.toBeNull();

    // In Shot 1 (e.g. t = 2.0s), camera has 18 deg roll
    const f1 = computeStageFrame(2.0, score!);
    expect(f1.stageCamera.transform.pose.roll).toBeCloseTo(18 * (Math.PI / 180), 4);

    // At t = 4.0s (instant cut to Shot 2 which omits roll), roll MUST reset to 0 deg (Option A)
    const f2 = computeStageFrame(4.0, score!);
    expect(f2.stageCamera.shotId).toBe('shot-2');
    expect(f2.stageCamera.transform.pose.roll).toBeCloseTo(0, 5);

    // Later in Shot 2 (t = 6.0s), roll remains at 0 deg
    const f3 = computeStageFrame(6.0, score!);
    expect(f3.stageCamera.transform.pose.roll).toBeCloseTo(0, 5);
  });

  it('supports smooth animated roll within a shot and cross-shot recovery via roll_end: 0', () => {
    const yaml = `
version: "1.0"
id: "animated-roll-test"
title: "Animated Roll Test"
duration: 8.0
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 4.0
    stage_camera:
      target: [0, 1, 0]
      maneuver: "straight"
      easing: "linear"
      roll_start: 0
      roll_end: 20
  - id: "shot-2"
    shot: 2
    start: 4.0
    end: 8.0
    stage_camera:
      target: [0, 1, 0]
      maneuver: "straight"
      easing: "linear"
      roll_end: 0
`;
    const { score } = parseStageScore(yaml);
    expect(score).not.toBeNull();

    // At t = 0.0s, roll is 0
    const fStart = computeStageFrame(0.0, score!);
    expect(fStart.stageCamera.transform.pose.roll).toBeCloseTo(0, 5);

    // At t = 2.0s (midpoint of Shot 1 with linear easing), roll is 10 deg
    const fMid = computeStageFrame(2.0, score!);
    expect(fMid.stageCamera.transform.pose.roll).toBeCloseTo(10 * (Math.PI / 180), 4);

    // At t = 4.0s (start of Shot 2), chains from Shot 1's end pose (20 deg)
    const fCut = computeStageFrame(4.0, score!);
    expect(fCut.stageCamera.transform.pose.roll).toBeCloseTo(20 * (Math.PI / 180), 4);

    // At t = 6.0s (midpoint of Shot 2 with linear easing to 0), roll is 10 deg
    const fMidRecover = computeStageFrame(6.0, score!);
    expect(fMidRecover.stageCamera.transform.pose.roll).toBeCloseTo(10 * (Math.PI / 180), 4);

    // At t = 8.0s (end of Shot 2), roll has leveled back to 0
    const fEndRecover = computeStageFrame(8.0, score!);
    expect(fEndRecover.stageCamera.transform.pose.roll).toBeCloseTo(0, 5);
  });

  it('validates Blueprint 03 30m ball-pass choreography, parabolic arc, Ruby orbit, straight pass and camera roll tracking', () => {
    const bp3Item = INITIAL_CATALOG_ITEMS.find(
      (item) => item.id === 'blueprint-03-ball-pass'
    );
    expect(bp3Item).toBeDefined();
    const score = bp3Item!.score;

    expect(score.durationSec).toBe(16.0);
    expect(score.shots).toHaveLength(6);
    expect(score.observerShots).toBeUndefined();

    // Verify 3 actors and prop
    const arthur = score.entities.find((e) => e.id === 'arthur');
    const ruby = score.entities.find((e) => e.id === 'ruby');
    const mark = score.entities.find((e) => e.id === 'mark');
    const ball = score.entities.find((e) => e.id === 'ball');

    expect(arthur).toBeDefined();
    expect(ruby).toBeDefined();
    expect(mark).toBeDefined();
    expect(ball).toBeDefined();

    // Spatial distances: 20m Arthur to Ruby, 10m Ruby to Mark
    expect(arthur!.position.x).toBe(-15);
    expect(ruby!.position.x).toBe(5);
    expect(mark!.position.x).toBe(15);
    expect(ruby!.position.x - arthur!.position.x).toBe(20);
    expect(mark!.position.x - ruby!.position.x).toBe(10);

    // Frame at t = 0.0s (Arthur holds ball)
    const f0 = computeStageFrame(0.0, score);
    const ballPos0 = f0.entitiesById.get('ball')!.position;
    expect(ballPos0.x).toBeCloseTo(-14.5, 2);
    expect(ballPos0.y).toBeCloseTo(1.25, 2);

    // Frame at t = 3.0s (Apex crest between Arthur and Ruby)
    const f3 = computeStageFrame(3.0, score);
    const ballPos3 = f3.entitiesById.get('ball')!.position;
    expect(ballPos3.x).toBeCloseTo(-5.0, 2);
    expect(ballPos3.y).toBeCloseTo(5.2, 2); // Peak parabolic elevation

    // Frame at t = 6.0s (Ball reaches Ruby at hand height)
    const f6 = computeStageFrame(6.0, score);
    const ballPos6 = f6.entitiesById.get('ball')!.position;
    expect(ballPos6.x).toBeCloseTo(4.6, 2);
    expect(ballPos6.y).toBeCloseTo(1.25, 2);

    // Frame at t = 8.5s (End of Orbit Shot 1, ball at flank of Ruby)
    const f8_5 = computeStageFrame(8.5, score);
    const ballPos8_5 = f8_5.entitiesById.get('ball')!.position;
    expect(ballPos8_5.x).toBeCloseTo(6.4, 2);
    expect(ballPos8_5.z).toBeCloseTo(0.2, 2);

    // Frame at t = 11.0s (End of Orbit Shot 2, ball aligned at release point)
    const f11 = computeStageFrame(11.0, score);
    const ballPos11 = f11.entitiesById.get('ball')!.position;
    expect(ballPos11.x).toBeCloseTo(5.6, 2);
    expect(ballPos11.y).toBeCloseTo(1.25, 2);

    // Frame at t = 16.0s (Straight bullet arrival at Mark)
    const f16 = computeStageFrame(16.0, score);
    const ballPos16 = f16.entitiesById.get('ball')!.position;
    expect(ballPos16.x).toBeCloseTo(14.6, 2);
    expect(ballPos16.y).toBeCloseTo(1.25, 2);
    expect(ballPos16.z).toBeCloseTo(0.0, 2);

    // Camera Sole Ball Tracking & Roll Across Shots
    // In every shot, target points directly to the ball's look-at anchor
    for (let t = 0.5; t < 16.0; t += 2.5) {
      const ft = computeStageFrame(t, score);
      const liveBall = ft.entitiesById.get('ball')!;
      const camTarget = ft.stageCamera.transform.target;
      expect(camTarget.x).toBeCloseTo(liveBall.position.x, 2);
      expect(camTarget.z).toBeCloseTo(liveBall.position.z, 2);
    }

    // Shot 1 has positive roll (+14 deg = ~0.244 rad)
    const fShot1 = computeStageFrame(1.5, score);
    expect(fShot1.stageCamera.transform.pose.roll).toBeCloseTo(
      14 * (Math.PI / 180),
      3
    );

    // Shot 2 has negative roll (-18 deg = ~-0.314 rad)
    const fShot2 = computeStageFrame(4.5, score);
    expect(fShot2.stageCamera.transform.pose.roll).toBeCloseTo(
      -18 * (Math.PI / 180),
      3
    );

    // Shot 3 has positive roll (+22 deg = ~0.384 rad)
    const fShot3 = computeStageFrame(7.0, score);
    expect(fShot3.stageCamera.transform.pose.roll).toBeCloseTo(
      22 * (Math.PI / 180),
      3
    );

    // Shot 6 settles back to 0 roll on final catch
    const fShot6 = computeStageFrame(15.9, score);
    expect(fShot6.stageCamera.transform.pose.roll).toBeCloseTo(0, 3);

    // Observer Camera has no scripted cuts and holds steady at stage baseline
    const obsPose0 = f0.observerCamera.transform.pose;
    const obsPose16 = f16.observerCamera.transform.pose;
    expect(obsPose0.distance).toBe(30.0);
    expect(obsPose16.distance).toBe(30.0);
    expect(obsPose0.pitch).toBeCloseTo(obsPose16.pitch, 5);
    expect(obsPose0.yaw).toBeCloseTo(obsPose16.yaw, 5);
  });

  it('implements Option A shot-boundary target_offset reset: applies world offset and resets to [0,0,0] when omitted on next shot', () => {
    const yaml = `
version: "1.0"
id: "target-offset-reset-test"
title: "Target Offset Reset Test"
duration: 8.0
entities:
  - id: "arthur"
    label: "Arthur"
    kind: "character"
    position: [-4, 0, 2]
    height: 1.75
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 4.0
    stage_camera:
      target: "arthur"
      target_offset: [0.5, 0.3, -0.2]
      distance: 3.0
      pitch: 0
      yaw: 0
  - id: "shot-2"
    shot: 2
    start: 4.0
    end: 8.0
    stage_camera:
      target: "arthur"
      distance: 3.0
      pitch: 0
      yaw: 0
`;
    const { score, error } = parseStageScore(yaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    const baseAnchorY = 1.75 * 0.78; // 1.365m

    // In Shot 1 (t = 2.0s), target is offset by [+0.5, +0.3, -0.2] and eye translates identically
    const f1 = computeStageFrame(2.0, score!);
    expect(f1.stageCamera.transform.target.x).toBeCloseTo(-4 + 0.5, 5);
    expect(f1.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY + 0.3, 5);
    expect(f1.stageCamera.transform.target.z).toBeCloseTo(2 - 0.2, 5);
    expect(f1.stageCamera.transform.position.x).toBeCloseTo(-4 + 0.5, 5);
    expect(f1.stageCamera.transform.position.y).toBeCloseTo(baseAnchorY + 0.3, 5);
    expect(f1.stageCamera.transform.position.z).toBeCloseTo(2 - 0.2 + 3.0, 5);

    // In Shot 2 (t = 5.0s), target_offset is omitted -> Option A resets offset to [0, 0, 0]
    const f2 = computeStageFrame(5.0, score!);
    expect(f2.stageCamera.transform.target.x).toBeCloseTo(-4, 5);
    expect(f2.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY, 5);
    expect(f2.stageCamera.transform.target.z).toBeCloseTo(2, 5);
  });

  it('interpolates animated target_offset_start -> target_offset_end and supports cross-shot recovery via target_offset_end: [0,0,0]', () => {
    const yaml = `
version: "1.0"
id: "target-offset-anim-test"
title: "Animated Target Offset Test"
duration: 8.0
entities:
  - id: "arthur"
    label: "Arthur"
    kind: "character"
    position: [0, 0, 0]
    height: 1.75
shots:
  - id: "shot-1"
    shot: 1
    start: 0.0
    end: 4.0
    stage_camera:
      target: "arthur"
      maneuver: "dolly"
      easing: "linear"
      target_offset_start: [0, -1.0, 0]
      target_offset_end: [0, 0.4, 0]
      distance: 2.5
  - id: "shot-2"
    shot: 2
    start: 4.0
    end: 8.0
    stage_camera:
      target: "arthur"
      maneuver: "dolly"
      easing: "linear"
      target_offset_end: [0, 0, 0]
      distance: 2.5
`;
    const { score, error } = parseStageScore(yaml);
    expect(error).toBeNull();
    expect(score).not.toBeNull();

    const baseAnchorY = 1.75 * 0.78; // 1.365m

    // At t = 0.0s, offsetY = -1.0m
    const f0 = computeStageFrame(0.0, score!);
    expect(f0.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY - 1.0, 5);

    // At t = 2.0s (midpoint of Shot 1 with linear easing), offsetY = -0.3m
    const f2 = computeStageFrame(2.0, score!);
    expect(f2.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY - 0.3, 5);

    // At t = 4.0s (start of Shot 2), chains from Shot 1's end offset (+0.4m)
    const f4 = computeStageFrame(4.0, score!);
    expect(f4.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY + 0.4, 5);

    // At t = 6.0s (midpoint of Shot 2 with linear recovery to 0), offsetY = +0.2m
    const f6 = computeStageFrame(6.0, score!);
    expect(f6.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY + 0.2, 5);

    // At t = 8.0s (end of Shot 2), offsetY has recovered to 0m
    const f8 = computeStageFrame(8.0, score!);
    expect(f8.stageCamera.transform.target.y).toBeCloseTo(baseAnchorY, 5);
  });
});
