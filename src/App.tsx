/**
 * Root Application Component for Stageplay.
 * Connects the Scene Catalog, Universal Media Clock, 60fps Dual-Tier Frame Loop,
 * Resizable Split Workspace, 3D Blueprint Diorama, and Live YAML Score Drawer.
 */

import React, { useState, useCallback } from 'react';
import {
  INITIAL_CATALOG_ITEMS,
  type ScoreCatalogItem,
} from './core/scoreCatalog';
import { parseStageScore } from './core/scoreParser';
import { useMediaClock } from './hooks/useMediaClock';
import { useStageFrameLoop } from './hooks/useStageFrameLoop';
import { useFileDropLoader } from './hooks/useFileDropLoader';
import { DioramaCanvas } from './stage/DioramaCanvas';
import {
  WorkspaceHeader,
  type SplitPreset,
} from './ui/WorkspaceHeader';
import { ResizableSplitWorkspace } from './ui/ResizableSplitWorkspace';
import { UniversalVideoViewport } from './ui/UniversalVideoViewport';
import { ShotBreakdownHud } from './ui/ShotBreakdownHud';
import { CameraTelemetryCapsule } from './ui/CameraTelemetryCapsule';
import { DirectorialTransportBar } from './ui/DirectorialTransportBar';
import { YamlInspectorDrawer } from './ui/YamlInspectorDrawer';

export const App: React.FC = () => {
  const [catalog, setCatalog] = useState<ScoreCatalogItem[]>(
    INITIAL_CATALOG_ITEMS
  );
  const [activeSceneId, setActiveSceneId] = useState<string>(
    INITIAL_CATALOG_ITEMS[0].id
  );
  const [rawYaml, setRawYaml] = useState<string>(
    INITIAL_CATALOG_ITEMS[0].rawYaml
  );
  const [activeScore, setActiveScore] = useState(
    INITIAL_CATALOG_ITEMS[0].score
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [videoOverrideUrl, setVideoOverrideUrl] = useState<string | null>(null);

  const [splitPreset, setSplitPreset] = useState<SplitPreset>('50-50');
  const [isYamlDrawerOpen, setIsYamlDrawerOpen] = useState<boolean>(false);

  // 1. Universal Media Clock (Local HTML5 Video, YouTube IFrame, or Procedural Slate)
  const mediaClock = useMediaClock(activeScore, videoOverrideUrl);

  // 2. Dual-Tier 60fps Frame Evaluation Loop
  const stageLoop = useStageFrameLoop(
    activeScore,
    mediaClock.driverRef,
    mediaClock.loopActiveShot,
    mediaClock.isPlaying
  );

  // Switch between catalog scenes
  const handleSelectScene = useCallback(
    (sceneId: string) => {
      const found = catalog.find((item) => item.id === sceneId);
      if (!found) return;
      mediaClock.pause();
      setActiveSceneId(found.id);
      setRawYaml(found.rawYaml);
      setActiveScore(found.score);
      setParseError(null);
      setVideoOverrideUrl(null);
      mediaClock.seek(0);
    },
    [catalog, mediaClock]
  );

  // Live YAML editing in the Inspector Drawer
  const handleChangeYaml = useCallback(
    (nextYaml: string) => {
      setRawYaml(nextYaml);
      const result = parseStageScore(nextYaml, activeSceneId);
      if (result.score) {
        setActiveScore(result.score);
        setParseError(null);
      } else {
        setParseError(result.error);
      }
    },
    [activeSceneId]
  );

  // Reset active scene YAML back to its catalog baseline
  const handleResetDefaultYaml = useCallback(() => {
    const baseItem =
      catalog.find((c) => c.id === activeSceneId) ?? INITIAL_CATALOG_ITEMS[0];
    setRawYaml(baseItem.rawYaml);
    setActiveScore(baseItem.score);
    setParseError(null);
  }, [catalog, activeSceneId]);

  // Drag-and-drop / File picker handlers for custom .yaml and .mp4 files
  const handleLoadYamlFile = useCallback(
    (yamlText: string, fileName: string) => {
      const fallbackId = fileName.replace(/\.(yaml|yml|json)$/i, '');
      const parsed = parseStageScore(yamlText, fallbackId);
      if (parsed.score) {
        const newItem: ScoreCatalogItem = {
          id: parsed.score.id,
          title: parsed.score.title,
          subtitle: parsed.score.subtitle,
          rawYaml: yamlText,
          score: parsed.score,
          isCustom: true,
        };
        setCatalog((prev) => {
          const filtered = prev.filter((item) => item.id !== newItem.id);
          return [...filtered, newItem];
        });
        setActiveSceneId(newItem.id);
        setRawYaml(yamlText);
        setActiveScore(parsed.score);
        setParseError(null);
        mediaClock.seek(0);
      } else {
        setRawYaml(yamlText);
        setParseError(parsed.error);
        setIsYamlDrawerOpen(true);
      }
    },
    [mediaClock]
  );

  const handleLoadVideoBlobUrl = useCallback(
    (blobUrl: string) => {
      setVideoOverrideUrl(blobUrl);
      mediaClock.seek(0);
    },
    [mediaClock]
  );

  const fileDrop = useFileDropLoader({
    onLoadYamlText: handleLoadYamlFile,
    onLoadVideoBlobUrl: handleLoadVideoBlobUrl,
  });

  // Ensure seek also immediately refreshes UI snapshot
  const handleSeekAndSync = useCallback(
    (targetSec: number) => {
      mediaClock.seek(targetSec);
      stageLoop.evaluateTick60fps();
      stageLoop.forceSyncUi();
    },
    [mediaClock, stageLoop]
  );

  const handleStepFramesAndSync = useCallback(
    (frames: number) => {
      mediaClock.stepFrames(frames);
      stageLoop.evaluateTick60fps();
      stageLoop.forceSyncUi();
    },
    [mediaClock, stageLoop]
  );

  return (
    <div
      onDragOver={fileDrop.handleDragOver}
      onDragLeave={fileDrop.handleDragLeave}
      onDrop={fileDrop.handleDrop}
      className="relative w-full h-dvh flex flex-col bg-[#050811] text-slate-100 overflow-hidden"
    >
      {/* Drag-and-Drop Overlay Indicator */}
      {fileDrop.isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-sky-950/60 backdrop-blur-md border-2 border-dashed border-sky-400 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <span className="text-lg font-mono font-bold text-sky-200">
            Drop .MP4 / .WebM Video or .YAML Choreography Score
          </span>
          <span className="text-xs font-mono text-sky-400">
            Files are bound locally in browser memory
          </span>
        </div>
      )}

      {/* Top Studio Header */}
      <WorkspaceHeader
        catalog={catalog}
        activeSceneId={activeSceneId}
        splitPreset={splitPreset}
        isYamlDrawerOpen={isYamlDrawerOpen}
        onSelectScene={handleSelectScene}
        onSelectSplitPreset={setSplitPreset}
        onToggleYamlDrawer={() => setIsYamlDrawerOpen((prev) => !prev)}
        onUploadFiles={fileDrop.processFiles}
      />

      {/* Main Resizable Split Workspace (Video Panel + 3D Blueprint Diorama) */}
      <ResizableSplitWorkspace
        splitPreset={splitPreset}
        onCustomDragSplit={() => {}}
        leftVideoPane={
          <UniversalVideoViewport
            score={activeScore}
            sourceInfo={mediaClock.sourceInfo}
            html5VideoRef={mediaClock.html5VideoRef}
            youtubeContainerRef={mediaClock.youtubeContainerRef}
            frameRef={stageLoop.frameRef}
            uiFrame={stageLoop.uiSnapshot.frame}
            isPlaying={mediaClock.isPlaying}
            onApplyVideoUrlOverride={(url) => {
              setVideoOverrideUrl(url);
              mediaClock.seek(0);
            }}
          />
        }
        rightStagePane={
          <div className="relative w-full h-full">
            {/* 3D React Three Fiber Blueprint Diorama */}
            <DioramaCanvas
              score={activeScore}
              cameraMode={stageLoop.cameraMode}
              isPlaying={mediaClock.isPlaying}
              frameRef={stageLoop.frameRef}
              uiFrame={stageLoop.uiSnapshot.frame}
              lastManualSeekIdRef={mediaClock.lastManualSeekIdRef}
              evaluateTick60fps={stageLoop.evaluateTick60fps}
              onFreeOrbitPoseChange={stageLoop.notifyFreeOrbitChange}
            />

            {/* Top-Left Shot & Lens Breakdown HUD */}
            <ShotBreakdownHud
              score={activeScore}
              frame={stageLoop.uiSnapshot.frame}
              cameraMode={stageLoop.cameraMode}
              isPlaying={mediaClock.isPlaying}
            />

            {/* Bottom-Right Authoring Telemetry Capsule + 1-Click YAML Copy */}
            <CameraTelemetryCapsule
              pose={stageLoop.uiSnapshot.liveViewportPose}
            />
          </div>
        }
      />

      {/* Bottom Directorial Transport Deck */}
      <DirectorialTransportBar
        score={activeScore}
        frame={stageLoop.uiSnapshot.frame}
        durationSec={mediaClock.durationSec}
        isPlaying={mediaClock.isPlaying}
        playbackRate={mediaClock.playbackRate}
        isMuted={mediaClock.isMuted}
        loopActiveShot={mediaClock.loopActiveShot}
        cameraMode={stageLoop.cameraMode}
        onTogglePlay={mediaClock.togglePlay}
        onSeek={handleSeekAndSync}
        onStepFrames={handleStepFramesAndSync}
        onSetPlaybackRate={mediaClock.setPlaybackRate}
        onToggleMute={mediaClock.toggleMute}
        onToggleLoopActiveShot={mediaClock.toggleLoopActiveShot}
        onSetCameraMode={stageLoop.setCameraMode}
      />

      {/* Slide-Out Live YAML Score Inspector & Editor Drawer */}
      <YamlInspectorDrawer
        isOpen={isYamlDrawerOpen}
        rawYaml={rawYaml}
        parseError={parseError}
        onChangeYaml={handleChangeYaml}
        onResetDefault={handleResetDefaultYaml}
        onClose={() => setIsYamlDrawerOpen(false)}
      />
    </div>
  );
};

export default App;
