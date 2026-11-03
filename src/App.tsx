/**
 * Root Application Component for StageFlow.
 * Connects the Scene Catalog, Universal Media Clock, 60fps Dual-Tier Frame Loop,
 * Resizable Split Workspace, 3D Blueprint Diorama, Live YAML Score Drawer,
 * and Persistent Storage (IndexedDB scores + localStorage UI preferences).
 */

import React, { useState, useCallback } from 'react';
import {
  INITIAL_CATALOG_ITEMS,
  type ScoreCatalogItem,
} from './core/scoreCatalog';
import { parseStageScore } from './core/scoreParser';
import {
  loadStoredActiveSceneId,
  loadStoredSplitPreset,
  loadStoredYamlDrawerOpen,
  saveStoredActiveSceneId,
  saveStoredSplitPreset,
  saveStoredYamlDrawerOpen,
} from './core/storage/localStorageUi';
import { saveStoredScore } from './core/storage/scoreDb';
import { useMediaClock } from './hooks/useMediaClock';
import { useStageFrameLoop } from './hooks/useStageFrameLoop';
import { useFileDropLoader } from './hooks/useFileDropLoader';
import { useScorePersistence } from './hooks/useScorePersistence';
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
import { ConfirmResetModal } from './ui/ConfirmResetModal';

export const App: React.FC = () => {
  const [catalog, setCatalog] = useState<ScoreCatalogItem[]>(
    INITIAL_CATALOG_ITEMS
  );

  // Hydrate initial UI preferences synchronously from localStorage
  const [activeSceneId, setActiveSceneIdState] = useState<string>(() => {
    const stored = loadStoredActiveSceneId();
    if (stored) {
      return stored;
    }
    return INITIAL_CATALOG_ITEMS[0].id;
  });

  const [splitPreset, setSplitPresetState] = useState<SplitPreset>(
    () => loadStoredSplitPreset() ?? '50-50'
  );

  const [isYamlDrawerOpen, setIsYamlDrawerOpenState] = useState<boolean>(
    () => loadStoredYamlDrawerOpen() ?? false
  );

  const initialItem =
    INITIAL_CATALOG_ITEMS.find((item) => item.id === activeSceneId) ??
    INITIAL_CATALOG_ITEMS[0];

  const [rawYaml, setRawYaml] = useState<string>(initialItem.rawYaml);
  const [activeScore, setActiveScore] = useState(initialItem.score);
  const [parseError, setParseError] = useState<string | null>(null);
  const [videoOverrideUrl, setVideoOverrideUrl] = useState<string | null>(null);

  // Sync wrappers that persist UI preferences to localStorage
  const setActiveSceneId = useCallback((id: string) => {
    setActiveSceneIdState(id);
    saveStoredActiveSceneId(id);
  }, []);

  const handleSelectSplitPreset = useCallback((preset: SplitPreset) => {
    setSplitPresetState(preset);
    saveStoredSplitPreset(preset);
  }, []);

  const handleToggleYamlDrawer = useCallback(() => {
    setIsYamlDrawerOpenState((prev) => {
      const next = !prev;
      saveStoredYamlDrawerOpen(next);
      return next;
    });
  }, []);

  // IndexedDB Score Persistence Hook (Hydration, Draft Auto-saving, Confirmed Reset)
  const scorePersistence = useScorePersistence({
    catalog,
    activeSceneId,
    rawYaml,
    setCatalog,
    setActiveSceneId,
    setRawYaml,
    setActiveScore,
    onClearVideoOverride: () => setVideoOverrideUrl(null),
  });

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
    [catalog, mediaClock, setActiveSceneId]
  );

  // Live YAML editing in the Inspector Drawer (YAML as authoritative SSOT)
  const handleChangeYaml = useCallback(
    (nextYaml: string) => {
      setRawYaml(nextYaml);
      const result = parseStageScore(nextYaml, activeSceneId);
      if (result.score) {
        setActiveScore(result.score);
        setParseError(null);

        // If YAML score specifies a video URL or changed it, clear ephemeral video override
        if (
          result.score.videoUrl &&
          result.score.videoUrl !== 'procedural://demo'
        ) {
          setVideoOverrideUrl(null);
        }

        // Auto-save draft to IndexedDB (debounced)
        scorePersistence.saveYamlDraftDebounced(nextYaml, result.score);
      } else {
        setParseError(result.error);
      }
    },
    [activeSceneId, scorePersistence]
  );

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
        setVideoOverrideUrl(null);
        mediaClock.seek(0);

        // Persist custom imported score to IndexedDB
        saveStoredScore({
          id: newItem.id,
          title: newItem.title,
          subtitle: newItem.subtitle,
          rawYaml: yamlText,
          isCustom: true,
          updatedAt: Date.now(),
        });
      } else {
        setRawYaml(yamlText);
        setParseError(parsed.error);
        setIsYamlDrawerOpenState(true);
      }
    },
    [mediaClock, setActiveSceneId]
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
            Videos are held in session memory; YAML scores are saved in IndexedDB
          </span>
        </div>
      )}

      {/* Top Studio Header */}
      <WorkspaceHeader
        catalog={catalog}
        activeSceneId={activeSceneId}
        splitPreset={splitPreset}
        isYamlDrawerOpen={isYamlDrawerOpen}
        storageStatus={scorePersistence.storageStatus}
        onSelectScene={handleSelectScene}
        onSelectSplitPreset={handleSelectSplitPreset}
        onToggleYamlDrawer={handleToggleYamlDrawer}
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
        storageStatus={scorePersistence.storageStatus}
        onChangeYaml={handleChangeYaml}
        onResetDefault={() => scorePersistence.setIsResetModalOpen(true)}
        onClose={() => {
          setIsYamlDrawerOpenState(false);
          saveStoredYamlDrawerOpen(false);
        }}
      />

      {/* Reset Confirmation Dialog Modal */}
      <ConfirmResetModal
        isOpen={scorePersistence.isResetModalOpen}
        sceneTitle={activeScore.title}
        onConfirm={scorePersistence.confirmResetActiveScore}
        onCancel={() => scorePersistence.setIsResetModalOpen(false)}
      />
    </div>
  );
};

export default App;
