import { describe, it, expect } from 'vitest';
import type {
  EvaluatedEntityState,
  SceneEntityDef,
  SphericalPose,
  StageFrame,
  StageScore,
} from '../../src/core/types';
import {
  DEFAULT_OBSERVER_POSE,
  DEFAULT_STAGE_CAMERA_POSE,
  OPTICS_DOF_DEFAULTS,
} from '../../src/core/constants';
import { canReuseIdleStageFrame } from '../../src/hooks/useStageFrameLoop';
import { shouldFlushExportProgress } from '../../src/hooks/useWebVideoExport';
import {
  areDirectionalMannequinPropsEqual,
  areTrailPointsEqual,
  type DirectionalMannequinProps,
} from '../../src/stage/DirectionalMannequin';
import {
  areRigMountPropsEqual,
  type StageCameraRigMountProps,
} from '../../src/stage/StageCameraRigMount';
import { computeDofOpticalScale } from '../../src/stage/StageCamDofEffect';
import { haveEndpointsChanged } from '../../src/stage/StageCameraFocusRig';
import { resolveGatedState } from '../../src/stage/stageSyncGate';

function clonePose(pose: SphericalPose): SphericalPose {
  return { ...pose, target: { ...pose.target } };
}

function makeDummyScore(id = 'score-a'): StageScore {
  return {
    version: '1.0',
    id,
    title: 'Test Score',
    videoUrl: 'procedural://blueprint',
    aspectRatio: 16 / 9,
    durationSec: 10,
    offsetSec: 0,
    stage: {
      width: 10,
      depth: 10,
      gridStep: 1,
      defaultObserverPose: clonePose(DEFAULT_OBSERVER_POSE),
      defaultStageCameraPose: clonePose(DEFAULT_STAGE_CAMERA_POSE),
    },
    entities: [],
    shots: [],
  };
}

function makeEntityDef(): SceneEntityDef {
  return {
    id: 'hero',
    label: 'HERO',
    kind: 'character',
    position: { x: 0, y: 0, z: 0 },
    rotationYRad: 0,
    height: 1.75,
    radius: 0.3,
    color: '#38bdf8',
  };
}

type StageCamFrame = StageFrame['stageCamera'];

function makeStageCameraState(
  overrides: Partial<StageCamFrame> = {}
): StageCamFrame {
  return {
    active: true,
    isHold: false,
    shotId: 'shot-1',
    maneuver: 'dolly',
    transform: {
      pose: {
        target: { x: 0, y: 1.2, z: 0 },
        distance: 4,
        pitch: 0.1,
        yaw: 0,
        roll: 0,
        focalLengthMm: 50,
      },
      position: { x: 0, y: 1.5, z: 4 },
      target: { x: 0, y: 1.2, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fovDeg: 39.6,
      aspectRatio: 16 / 9,
    },
    trajectoryPoints: [],
    frustumDepth: 4,
    frustumColor: '#38bdf8',
    showPath: true,
    showRig: true,
    dof: {
      enabled: true,
      preset: 'medium',
      apertureFStop: 5.6,
      focusDistanceM: 4,
      hyperfocalDistanceM: 22,
      nearLimitM: 3.1,
      farLimitM: 5.4,
      depthOfFieldM: 2.3,
      hasExplicitFocus: false,
    },
    ...overrides,
  };
}

function makeFrame(stageCamera: StageCamFrame): StageFrame {
  return {
    timestampSec: 1.0,
    progress: 0.1,
    activeShot: null,
    shotIndex: 0,
    shotProgress: 0.5,
    observerCamera: {
      active: false,
      isHold: true,
      shotId: null,
      maneuver: 'orbit',
      transform: stageCamera.transform,
      trajectoryPoints: [],
    },
    stageCamera,
    entitiesById: new Map(),
    entitiesList: [],
  };
}

describe('stagePerfHelpers — Issue #9 deterministic performance guards', () => {
  describe('canReuseIdleStageFrame', () => {
    it('returns true when paused at identical timestamp, score, and no manual seek occurred', () => {
      const score = makeDummyScore();
      expect(canReuseIdleStageFrame(false, false, 2.5, 2.5, score, score)).toBe(
        true
      );
      expect(
        canReuseIdleStageFrame(false, false, 2.5, 2.5 + 1e-7, score, score)
      ).toBe(true);
    });

    it('returns false when playing, manually sought, time changed, or score changed', () => {
      const scoreA = makeDummyScore('a');
      const scoreB = makeDummyScore('b');

      expect(canReuseIdleStageFrame(true, false, 2.5, 2.5, scoreA, scoreA)).toBe(
        false
      );
      expect(canReuseIdleStageFrame(false, true, 2.5, 2.5, scoreA, scoreA)).toBe(
        false
      );
      expect(
        canReuseIdleStageFrame(false, false, 2.51, 2.5, scoreA, scoreA)
      ).toBe(false);
      expect(
        canReuseIdleStageFrame(false, false, 2.5, 2.5, scoreB, scoreA)
      ).toBe(false);
    });
  });

  describe('areTrailPointsEqual & areDirectionalMannequinPropsEqual', () => {
    it('compares trail point coordinates structurally across fresh arrays', () => {
      const sameRef = [{ x: 0, y: 0, z: 0 }];
      expect(areTrailPointsEqual(sameRef, sameRef)).toBe(true);
      expect(areTrailPointsEqual([], [])).toBe(true);
      expect(
        areTrailPointsEqual(
          [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 2 },
          ],
          [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 2 },
          ]
        )
      ).toBe(true);
      expect(
        areTrailPointsEqual(
          [{ x: 0, y: 0, z: 0 }],
          [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 2 },
          ]
        )
      ).toBe(false);
      expect(
        areTrailPointsEqual(
          [{ x: 0, y: 0, z: 0 }],
          [{ x: 0.01, y: 0, z: 0 }]
        )
      ).toBe(false);
      expect(
        areTrailPointsEqual(
          [{ x: 0, y: 0, z: 0 }],
          [{ x: 0, y: 0.01, z: 0 }]
        )
      ).toBe(false);
      expect(
        areTrailPointsEqual(
          [{ x: 0, y: 0, z: 0 }],
          [{ x: 0, y: 0, z: 0.01 }]
        )
      ).toBe(false);
    });

    it('skips re-render when only position/rotationYRad/uiFrame/fresh equal trailPoints change', () => {
      const def = makeEntityDef();
      const frameRef = { current: makeFrame(makeStageCameraState()) };
      const initialA: EvaluatedEntityState = {
        id: 'hero',
        def,
        cueId: 'cue-1',
        position: { x: 0, y: 0, z: 0 },
        rotationYRad: 0,
        size: { x: 0.6, y: 1.75, z: 0.6 },
        highlighted: false,
        visible: true,
        note: 'enter',
        trailPoints: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
        ],
      };
      const initialB: EvaluatedEntityState = {
        ...initialA,
        position: { x: 1.2, y: 0, z: 0.5 },
        rotationYRad: 1.1,
        size: { x: 0.6, y: 1.75, z: 0.6 },
        trailPoints: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
        ],
      };

      const prev: DirectionalMannequinProps = {
        entityId: 'hero',
        initialState: initialA,
        frameRef,
        uiFrame: frameRef.current,
        labelMode: 'all',
        isPlaying: true,
        cameraMode: 'scripted',
      };
      const nextSameVisual: DirectionalMannequinProps = {
        ...prev,
        initialState: initialB,
        uiFrame: makeFrame(makeStageCameraState()),
      };
      expect(areDirectionalMannequinPropsEqual(prev, nextSameVisual)).toBe(true);

      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          initialState: { ...initialB, highlighted: true },
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          initialState: { ...initialB, cueId: 'cue-2' },
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          labelMode: 'off',
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          initialState: { ...initialB, def: { ...def } },
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          initialState: { ...initialB, visible: false },
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          initialState: {
            ...initialB,
            trailPoints: [
              { x: 0, y: 0, z: 0 },
              { x: 3, y: 0, z: 0 },
            ],
          },
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          entityId: 'sidekick',
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          isPlaying: false,
        })
      ).toBe(false);
      expect(
        areDirectionalMannequinPropsEqual(prev, {
          ...nextSameVisual,
          cameraMode: 'free',
        })
      ).toBe(false);
    });
  });

  describe('areRigMountPropsEqual', () => {
    it('reuses mount JSX during horizontal dolly ticks while reacting to crane y, shot, or rail changes', () => {
      const railsA = [
        { x: -2, y: 0, z: 4 },
        { x: 2, y: 0, z: 4 },
      ];
      const railsB = [
        { x: -2, y: 0, z: 4 },
        { x: 2, y: 0, z: 4 },
      ];
      const camA = makeStageCameraState({
        rig: {
          type: 'track',
          progress: 0.1,
          eyePosition: { x: -1.6, y: 1.5, z: 4 },
          railPoints: railsA,
          hasTargetLock: true,
        },
      });
      const camB = makeStageCameraState({
        transform: {
          ...camA.transform,
          position: { x: 1.2, y: 1.5, z: 4 },
        },
        rig: {
          type: 'track',
          progress: 0.8,
          eyePosition: { x: 1.2, y: 1.5, z: 4 },
          railPoints: railsB,
          hasTargetLock: true,
        },
      });

      const frameRef = { current: makeFrame(camA) };
      const prev: StageCameraRigMountProps = {
        frameRef,
        uiFrame: makeFrame(camA),
        isBodyVisible: true,
        color: '#38bdf8',
      };
      const nextHorizontalMove: StageCameraRigMountProps = {
        ...prev,
        uiFrame: makeFrame(camB),
      };
      expect(areRigMountPropsEqual(prev, nextHorizontalMove)).toBe(true);

      const nextVerticalMove: StageCameraRigMountProps = {
        ...prev,
        uiFrame: makeFrame({
          ...camB,
          transform: {
            ...camB.transform,
            position: { x: 1.2, y: 2.1, z: 4 },
          },
        }),
      };
      expect(areRigMountPropsEqual(prev, nextVerticalMove)).toBe(false);

      const nextNewShot: StageCameraRigMountProps = {
        ...prev,
        uiFrame: makeFrame({ ...camB, shotId: 'shot-2' }),
      };
      expect(areRigMountPropsEqual(prev, nextNewShot)).toBe(false);

      // Floor-clamp equivalence when both y <= 0.4m
      const lowPrev: StageCameraRigMountProps = {
        ...prev,
        uiFrame: makeFrame({
          ...camA,
          transform: { ...camA.transform, position: { x: 0, y: 0.1, z: 4 } },
        }),
      };
      const lowNext: StageCameraRigMountProps = {
        ...prev,
        uiFrame: makeFrame({
          ...camB,
          transform: { ...camB.transform, position: { x: 1.2, y: 0.35, z: 4 } },
        }),
      };
      expect(areRigMountPropsEqual(lowPrev, lowNext)).toBe(true);

      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          uiFrame: makeFrame({ ...camB, showRig: false }),
        })
      ).toBe(false);
      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          isBodyVisible: false,
        })
      ).toBe(false);
      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          color: '#f59e0b',
        })
      ).toBe(false);
      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          uiFrame: makeFrame({ ...camB, rig: undefined }),
        })
      ).toBe(false);
      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          uiFrame: makeFrame({
            ...camB,
            rig: { ...camB.rig!, type: 'spline_track' },
          }),
        })
      ).toBe(false);
      expect(
        areRigMountPropsEqual(prev, {
          ...prev,
          uiFrame: makeFrame({
            ...camB,
            rig: {
              ...camB.rig!,
              railPoints: [
                { x: -2, y: 0, z: 4 },
                { x: 4, y: 0, z: 4 },
              ],
            },
          }),
        })
      ).toBe(false);
    });
  });

  describe('computeDofOpticalScale', () => {
    it('matches the analytical thin-lens optical denominator formula and disables at Infinity f-stop', () => {
      const fMm = 50;
      const sensorH = 20.25;
      const focusM = 4.0;
      const fStop = 2.8;
      const expected =
        (fMm * fMm) /
        Math.max(1.0, fStop * sensorH * Math.max(1.0, focusM * 1000 - fMm));
      expect(computeDofOpticalScale(focusM, fStop, sensorH, fMm)).toBeCloseTo(
        expected,
        12
      );
      expect(
        computeDofOpticalScale(focusM, Number.POSITIVE_INFINITY, sensorH, fMm)
      ).toBe(0);
      expect(computeDofOpticalScale(focusM, 0, sensorH, fMm)).toBe(0);
      expect(computeDofOpticalScale(focusM, -2.8, sensorH, fMm)).toBe(0);
      expect(computeDofOpticalScale(focusM, Number.NaN, sensorH, fMm)).toBe(0);

      const shallowFStop = OPTICS_DOF_DEFAULTS.PRESET_F_STOPS.shallow;
      const clampedExpected = (85 * 85) / (shallowFStop * sensorH * 1.0);
      expect(
        computeDofOpticalScale(0.02, shallowFStop, sensorH, 85)
      ).toBeCloseTo(clampedExpected, 12);
    });
  });

  describe('haveEndpointsChanged', () => {
    it('detects null initialization and exact 64-bit coordinate changes without Float32 false positives', () => {
      const p1 = [0.3, 1.2, -4.7, 0.1, 1.4, 0.2] as const;
      expect(haveEndpointsChanged(null, p1)).toBe(true);
      expect(haveEndpointsChanged(p1, [0.3, 1.2, -4.7, 0.1, 1.4, 0.2])).toBe(
        false
      );
      expect(haveEndpointsChanged(p1, [0.300001, 1.2, -4.7, 0.1, 1.4, 0.2])).toBe(
        true
      );
      expect(haveEndpointsChanged(p1, [0.3, 1.2, -4.7, 0.1, 1.4, 0.25])).toBe(
        true
      );
    });
  });

  describe('shouldFlushExportProgress', () => {
    it('throttles intermediate progress flushes to wall-clock interval while always flushing final frame', () => {
      expect(shouldFlushExportProgress(150, 100, 1, 600, 100)).toBe(false);
      expect(shouldFlushExportProgress(200, 100, 5, 600, 100)).toBe(true);
      expect(shouldFlushExportProgress(105, 100, 599, 600, 100)).toBe(true);
      expect(shouldFlushExportProgress(101, 100, 0, 1, 100)).toBe(true);
    });
  });

  describe('resolveGatedState', () => {
    interface DummyCueState {
      cueId?: string;
      x: number;
    }

    it('returns live state when live and committed share the same boundary ID or IDs are absent', () => {
      const committed: DummyCueState = { cueId: 'cue-1', x: 7.5 };
      const live: DummyCueState = { cueId: 'cue-1', x: 2.12 };
      const last: DummyCueState = { cueId: 'cue-1', x: 2.15 };

      expect(resolveGatedState(live, committed, last, (v) => v.cueId)).toEqual({
        state: live,
        isDesynced: false,
      });

      const noIdLive: DummyCueState = { x: 3.0 };
      expect(
        resolveGatedState(noIdLive, committed, last, (v) => v.cueId)
      ).toEqual({
        state: noIdLive,
        isDesynced: false,
      });

      expect(resolveGatedState(null, committed, last, (v) => v.cueId)).toEqual({
        state: committed,
        isDesynced: false,
      });

      expect(
        resolveGatedState(undefined, committed, last, (v) => v.cueId)
      ).toEqual({
        state: committed,
        isDesynced: false,
      });

      const noIdCommitted: DummyCueState = { x: 1.0 };
      expect(
        resolveGatedState(live, noIdCommitted, last, (v) => v.cueId)
      ).toEqual({
        state: live,
        isDesynced: false,
      });
    });

    it('holds lastSynced during an async boundary cross instead of rewinding to stale memoized committed state', () => {
      // Simulates React.memo initialState frozen at t = 0s (x = 7.5m) while live playback
      // has reached the end of shot 1 (lastSynced at x = 2.12m) and just entered cue-2.
      const committedAtShotStart: DummyCueState = { cueId: 'cue-1', x: 7.5 };
      const lastSyncedEndOfShot1: DummyCueState = { cueId: 'cue-1', x: 2.12 };
      const liveEnteringCue2: DummyCueState = { cueId: 'cue-2', x: 2.1 };

      expect(
        resolveGatedState(
          liveEnteringCue2,
          committedAtShotStart,
          lastSyncedEndOfShot1,
          (v) => v.cueId
        )
      ).toEqual({
        state: lastSyncedEndOfShot1,
        isDesynced: true,
      });
    });

    it('falls back to committed when lastSynced is null or belongs to a superseded older cue', () => {
      const committedCue3: DummyCueState = { cueId: 'cue-3', x: 0.4 };
      const liveCue4: DummyCueState = { cueId: 'cue-4', x: 0.5 };
      const staleLastCue1: DummyCueState = { cueId: 'cue-1', x: 7.5 };

      expect(
        resolveGatedState(liveCue4, committedCue3, null, (v) => v.cueId)
      ).toEqual({
        state: committedCue3,
        isDesynced: true,
      });

      expect(
        resolveGatedState(
          liveCue4,
          committedCue3,
          staleLastCue1,
          (v) => v.cueId
        )
      ).toEqual({
        state: committedCue3,
        isDesynced: true,
      });
    });
  });
});
