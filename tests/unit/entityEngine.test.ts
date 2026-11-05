import { describe, expect, it } from 'vitest';
import type { StageScore } from '../../src/core/types';
import {
  buildGroundTrailPoints,
  evaluateBlockingEntitiesAtTime,
  evaluateEntitiesAtTime,
  evaluateLegacyEntitiesAtTime,
  resolveLookAtPoint,
} from '../../src/core/entityEngine';

describe('Entity Kinematic Utilities (entityKinematicUtils)', () => {
  it('resolves lookAt targets properly for string IDs, labels, center, and Vec3', () => {
    const currentPositions = new Map([
      ['lead', { x: 2, y: 1, z: -3 }],
      ['extra', { x: -4, y: 0, z: 5 }],
    ]);

    const entities = [
      {
        id: 'lead',
        label: 'Lead Actor',
        kind: 'character' as const,
        position: { x: 0, y: 0, z: 0 },
        rotationYRad: 0,
        height: 1.75,
        radius: 0.28,
        color: '#ffffff',
      },
      {
        id: 'extra',
        label: 'Background Person',
        kind: 'character' as const,
        position: { x: 0, y: 0, z: 0 },
        rotationYRad: 0,
        height: 1.75,
        radius: 0.28,
        color: '#ffffff',
      },
    ];

    // Explicit Vec3 object
    expect(resolveLookAtPoint({ x: 10, y: 2, z: 3 }, currentPositions, entities)).toEqual({
      x: 10,
      y: 2,
      z: 3,
    });

    // "center", "origin", "stage"
    expect(resolveLookAtPoint('center', currentPositions, entities)).toEqual({ x: 0, y: 0, z: 0 });
    expect(resolveLookAtPoint('Origin', currentPositions, entities)).toEqual({ x: 0, y: 0, z: 0 });
    expect(resolveLookAtPoint('STAGE', currentPositions, entities)).toEqual({ x: 0, y: 0, z: 0 });

    // Entity ID
    expect(resolveLookAtPoint('lead', currentPositions, entities)).toEqual({ x: 2, y: 1, z: -3 });
    expect(resolveLookAtPoint('LEAD', currentPositions, entities)).toEqual({ x: 2, y: 1, z: -3 });

    // Entity Label
    expect(resolveLookAtPoint('Background Person', currentPositions, entities)).toEqual({
      x: -4,
      y: 0,
      z: 5,
    });

    // Unmatched string
    expect(resolveLookAtPoint('nonexistent', currentPositions, entities)).toBeNull();

    // Undefined / empty
    expect(resolveLookAtPoint(undefined, currentPositions, entities)).toBeNull();
  });

  it('builds 16-segment (17 points) ground trails when displacement > 0.05m, empty otherwise', () => {
    // Zero / negligible movement
    const stationary = buildGroundTrailPoints({ x: 1, y: 0, z: 1 }, { x: 1.01, y: 0, z: 1.01 });
    expect(stationary).toHaveLength(0);

    // Displaced movement
    const moving = buildGroundTrailPoints({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
    expect(moving).toHaveLength(17);
    expect(moving[0]).toEqual({ x: 0, y: 0.02, z: 0 });
    expect(moving[16]).toEqual({ x: 10, y: 0.02, z: 0 });
    expect(moving[8].x).toBeCloseTo(5.0, 4);
    expect(moving[8].y).toBe(0.02);
  });
});

describe('Entity Engine Facade & Dispatching (entityEngine)', () => {
  const baseScore: StageScore = {
    version: '1.0',
    id: 'test-score',
    title: 'Test Score',
    videoUrl: 'procedural://demo',
    aspectRatio: 16 / 9,
    durationSec: 10.0,
    offsetSec: 0,
    stage: {
      width: 10,
      depth: 10,
      gridStep: 1,
      defaultObserverPose: {
        target: { x: 0, y: 1, z: 0 },
        distance: 7,
        pitch: 0.3,
        yaw: 0.4,
        roll: 0,
        focalLengthMm: 35,
      },
      defaultStageCameraPose: {
        target: { x: 0, y: 1, z: 0 },
        distance: 3.5,
        pitch: 0.1,
        yaw: 0,
        roll: 0,
        focalLengthMm: 50,
      },
    },
    entities: [
      {
        id: 'actor',
        label: 'Actor',
        kind: 'character',
        position: { x: -2, y: 0, z: 0 },
        rotationYRad: 0,
        height: 1.75,
        radius: 0.28,
        color: '#38bdf8',
      },
    ],
    shots: [
      {
        id: 'shot-1',
        shotNumber: 1,
        label: 'Shot 1',
        description: 'Test Shot',
        startSec: 0,
        endSec: 10,
        entities: {
          actor: {
            position: { x: 2, y: 0, z: 0 },
            easing: 'linear',
            highlighted: false,
            visible: true,
          },
        },
      },
    ],
  };

  it('delegates to Tier 2 legacy evaluator when blocking is undefined', () => {
    const res = evaluateEntitiesAtTime(5.0, baseScore);
    const actor = res.entitiesById.get('actor')!;
    expect(actor.position.x).toBeCloseTo(0.0, 3);
    expect(actor.cueId).toBe('shot-1');
  });

  it('delegates to Tier 1 decoupled blocking evaluator when blocking is defined', () => {
    const blockingScore: StageScore = {
      ...baseScore,
      blocking: [
        {
          id: 'cue-cross',
          entityId: 'actor',
          startSec: 0,
          endSec: 10,
          position: { x: 8, y: 0, z: 0 },
          easing: 'linear',
        },
      ],
    };

    const res = evaluateEntitiesAtTime(5.0, blockingScore);
    const actor = res.entitiesById.get('actor')!;
    // Walk from -2 to +8 over 10s: at 5s, x = 3.0
    expect(actor.position.x).toBeCloseTo(3.0, 3);
    expect(actor.cueId).toBe('cue-cross');
  });

  it('direct calls to evaluateBlockingEntitiesAtTime and evaluateLegacyEntitiesAtTime work identically', () => {
    const legacyRes = evaluateLegacyEntitiesAtTime(5.0, baseScore);
    expect(legacyRes.entitiesById.get('actor')!.position.x).toBeCloseTo(0.0, 3);

    const blockingScore: StageScore = {
      ...baseScore,
      blocking: [
        {
          id: 'cue-cross',
          entityId: 'actor',
          startSec: 0,
          endSec: 10,
          position: { x: 8, y: 0, z: 0 },
          easing: 'linear',
        },
      ],
    };
    const blockingRes = evaluateBlockingEntitiesAtTime(5.0, blockingScore);
    expect(blockingRes.entitiesById.get('actor')!.position.x).toBeCloseTo(3.0, 3);
  });
});
