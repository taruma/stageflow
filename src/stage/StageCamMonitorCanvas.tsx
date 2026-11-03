/**
 * True 3D Stage Cam Monitor Canvas.
 * Renders the 3D diorama scene directly through the illustrative Stage Camera's lens,
 * overlaid with an optical director's monitor HUD (safe-action guides, reticle, telemetry).
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import type { LabelDisplayMode, StageFrame, StageScore } from '../core/types';
import { radToDeg } from '../core/sphericalMath';
import { BlueprintStageScene } from './BlueprintStageScene';
import { StageCamViewRig } from './StageCamViewRig';

export interface StageCamMonitorCanvasProps {
  score: StageScore;
  frameRef: React.RefObject<StageFrame>;
  uiFrame: StageFrame;
  labelMode?: LabelDisplayMode;
  isPlaying?: boolean;
}

export const StageCamMonitorCanvas: React.FC<StageCamMonitorCanvasProps> = ({
  score,
  frameRef,
  uiFrame,
  labelMode = 'all',
  isPlaying = false,
}) => {
  const pose = uiFrame.stageCamera.transform.pose;
  const yawDeg = radToDeg(pose.yaw);
  const rollDeg = radToDeg(pose.roll);

  return (
    <div className="relative w-full h-full bg-[#050811] select-none overflow-hidden">
      {/* 1. True 3D WebGL Viewport locked to Stage Camera */}
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        camera={{
          fov: uiFrame.stageCamera.transform.fovDeg,
          near: 0.1,
          far: 150,
        }}
      >
        <color attach="background" args={['#050811']} />
        <fog attach="fog" args={['#050811', 16, 42]} />

        {/* Shared Diorama Scene (Lighting, Metric Floor Grid, Directional Mannequins) */}
        <BlueprintStageScene
          score={score}
          frameRef={frameRef}
          uiFrame={uiFrame}
          labelMode={labelMode}
          isPlaying={isPlaying}
        />

        {/* 60fps Stage Camera View Controller (Gated to cut atomically with UI state) */}
        <StageCamViewRig frameRef={frameRef} uiFrame={uiFrame} />
      </Canvas>

      {/* 2. Optical Director's Monitor HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
        {/* Top Monitor Status Line */}
        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider">
          <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>OPTICAL STAGE CAM VIEW</span>
            <span className="text-slate-500">· {score.aspectRatio} GATE</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-sky-400 font-semibold shadow-sm">
            LIVE 3D SIMULATOR
          </div>
        </div>

        {/* Center Optical Reticle & Safe-Action Box */}
        <div className="absolute inset-4 sm:inset-6 border border-amber-500/25 pointer-events-none flex items-center justify-center">
          {/* Rule of Thirds Guides */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
            <div className="border-r border-b border-amber-400" />
            <div className="border-r border-b border-amber-400" />
            <div className="border-b border-amber-400" />
            <div className="border-r border-b border-amber-400" />
            <div className="border-r border-b border-amber-400" />
            <div className="border-b border-amber-400" />
            <div className="border-r border-b border-amber-400" />
            <div className="border-r border-b border-amber-400" />
            <div />
          </div>

          {/* Center Crosshair Ring */}
          <div className="relative w-6 h-6 rounded-full border border-amber-400/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
            <div className="absolute -top-2 w-[1px] h-2 bg-amber-400/60" />
            <div className="absolute -bottom-2 w-[1px] h-2 bg-amber-400/60" />
            <div className="absolute -left-2 h-[1px] w-2 bg-amber-400/60" />
            <div className="absolute -right-2 h-[1px] w-2 bg-amber-400/60" />
          </div>
        </div>

        {/* Bottom Optical Telemetry Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-950/90 border border-amber-500/30 text-[11px] font-mono shadow-md">
          <div className="text-amber-400 font-bold flex items-center gap-2">
            <span>STAGE CAM MONITOR</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-200">
              {Math.round(pose.focalLengthMm)}mm LENS
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">
              DIST {pose.distance.toFixed(2)}m
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">
              YAW {yawDeg >= 0 ? `+${yawDeg.toFixed(1)}` : yawDeg.toFixed(1)}°
            </span>
            {Math.abs(rollDeg) >= 0.1 && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-violet-300">
                  ROLL {rollDeg >= 0 ? `+${rollDeg.toFixed(1)}` : rollDeg.toFixed(1)}°
                </span>
              </>
            )}
            {uiFrame.stageCamera.targetOffset &&
              Math.hypot(
                uiFrame.stageCamera.targetOffset.x,
                uiFrame.stageCamera.targetOffset.y,
                uiFrame.stageCamera.targetOffset.z
              ) >= 0.01 && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="text-cyan-300">
                    OFFSET{' '}
                    {Math.hypot(
                      uiFrame.stageCamera.targetOffset.x,
                      uiFrame.stageCamera.targetOffset.y,
                      uiFrame.stageCamera.targetOffset.z
                    ).toFixed(2)}
                    m
                  </span>
                </>
              )}
          </div>
          <div className="text-sky-400 font-semibold">
            T+ {uiFrame.timestampSec.toFixed(2)}s
          </div>
        </div>
      </div>
    </div>
  );
};
