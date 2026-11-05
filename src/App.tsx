/**
 * Root Application Component for StageFlow Studio.
 * Connects the Scene Catalog, Universal Media Clock, 60fps Dual-Tier Frame Loop,
 * Resizable Split Workspace, 3D Blueprint Diorama, Live YAML Score Drawer,
 * and Persistent Storage (IndexedDB scores + localStorage UI preferences).
 * Decomposed in Phase 2 for clean, single-responsibility orchestration.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { CameraPresetType } from './stage/cameraPresets';
import {
  INITIAL_CATALOG_ITEMS,
  isBundledSceneId,
  type ScoreCatalogItem,
} from './core/scoreCatalog';
import { parseStageScore } from './core/scoreParser';
import {
  loadStoredActiveSceneId,
  saveStoredActiveSceneId,
} from './core/storage/localStorageUi';
import { saveStoredScore } from './core/storage/scoreDb';
import {
  downloadYamlBlob,
  generateCustomScoreId,
  updateScoreYamlId,
} from './core/scoreYamlUtils';
import { useMediaClock } from './hooks/useMediaClock';
import { useStageFrameLoop } from './hooks/useStageFrameLoop';
import { useFileDropLoader } from './hooks/useFileDropLoader';
import { useScorePersistence } from './hooks/useScorePersistence';
import { useAppShellTheme } from './hooks/useAppShellTheme';
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout';
import { useStudioDisplaySettings } from './hooks/useStudioDisplaySettings';
import { useToastNotifications } from './hooks/useToastNotifications';
import { DioramaCanvas } from './stage/DioramaCanvas';
import { WorkspaceHeader } from './ui/WorkspaceHeader';
import { ResizableSplitWorkspace } from './ui/ResizableSplitWorkspace';
import { UniversalVideoViewport } from './ui/UniversalVideoViewport';
import { VideoWorkspaceSubpanel } from './ui/left-panel/VideoWorkspaceSubpanel';
import { YamlInspectorDrawer } from './ui/YamlInspectorDrawer';
import { ConfirmResetModal } from './ui/ConfirmResetModal';
import { ScoreLibraryModal, type FilterTab } from './ui/ScoreLibraryModal';
import { ToastContainer } from './ui/ToastContainer';
import { DirectorialTransportBar } from './ui/DirectorialTransportBar';
import { DioramaOverlayContainer } from './ui/DioramaOverlayContainer';
import { HeadlessRecorderView } from './recorder/HeadlessRecorderView';

const isHeadlessRender =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mode') === 'headless-render';

const InteractiveStudioApp: React.FC = () => {
  const theme = useAppShellTheme();
  const { toasts, showToast, dismissToast } = useToastNotifications();
  const layout = useWorkspaceLayout({ onNotify: showToast });
  const display = useStudioDisplaySettings();

  const [catalog, setCatalog] = useState<ScoreCatalogItem[]>(
    INITIAL_CATALOG_ITEMS
  );

  // Synchronously hydrate active scene id from localStorage
  const [activeSceneId, setActiveSceneIdState] = useState<string>(() => {
    const stored = loadStoredActiveSceneId();
    return stored || INITIAL_CATALOG_ITEMS[0].id;
  });

  const setActiveSceneId = useCallback((id: string) => {
    setActiveSceneIdState(id);
    saveStoredActiveSceneId(id);
  }, []);

  // Score Library Modal state & initial category tab
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialTab, setLibraryInitialTab] = useState<FilterTab>('all');

  // Measure diorama pane width to toggle between standard and compact header (<580px)
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [dioramaWidth, setDioramaWidth] = useState<number>(1000);

  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDioramaWidth(rect.width);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isNarrowDiorama = dioramaWidth < 580;

  const initialItem =
    INITIAL_CATALOG_ITEMS.find((item) => item.id === activeSceneId) ??
    INITIAL_CATALOG_ITEMS[0];

  const [rawYaml, setRawYaml] = useState<string>(initialItem.rawYaml);
  const [activeScore, setActiveScore] = useState(initialItem.score);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [videoOverrideUrl, setVideoOverrideUrl] = useState<string | null>(null);

  const handleExportScore = useCallback(
    (item: ScoreCatalogItem) => {
      downloadYamlBlob(`${item.id}.yaml`, item.rawYaml);
      showToast(`Exported score "${item.id}.yaml"`, 'success');
    },
    [showToast]
  );

  const handleExportActiveScore = useCallback(() => {
    handleExportScore({
      id: activeSceneId,
      title: activeScore.title,
      rawYaml,
      score: activeScore,
      isCustom: false,
    });
  }, [activeSceneId, activeScore, rawYaml, handleExportScore]);

  // IndexedDB Score Persistence Hook (Hydration, Forking, Draft Auto-saving, Project Lifecycle)
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

  const cameraPresetActionRef = useRef<{
    type: CameraPresetType;
    id: number;
  } | null>(null);

  const handleSelectCameraPreset = useCallback(
    (preset: CameraPresetType) => {
      if (preset === 'reset') {
        stageLoop.setCameraMode('scripted');
      } else {
        stageLoop.setCameraMode('free');
      }
      cameraPresetActionRef.current = { type: preset, id: Date.now() };
    },
    [stageLoop]
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
      setParseWarning(null);
      setVideoOverrideUrl(null);
      mediaClock.seek(0);
    },
    [catalog, mediaClock, setActiveSceneId]
  );

  // Live YAML editing in the Inspector Drawer (custom projects only)
  const handleChangeYaml = useCallback(
    (nextYaml: string) => {
      setRawYaml(nextYaml);
      const result = parseStageScore(nextYaml, activeSceneId);
      if (result.score) {
        setActiveScore(result.score);
        setParseError(null);
        setParseWarning(result.warning ?? null);

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
        setParseWarning(null);
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
        let finalId = parsed.score.id;
        let finalYaml = yamlText;
        let wasBundledConflict = false;

        // Auto-fork collision protection: never overwrite bundled presets
        if (isBundledSceneId(finalId)) {
          wasBundledConflict = true;
          finalId = generateCustomScoreId(fallbackId || finalId);
          finalYaml = updateScoreYamlId(finalYaml, finalId);
        }

        const finalParsed = parseStageScore(finalYaml, finalId);
        const resolvedScore = finalParsed.score ?? parsed.score;

        const newItem: ScoreCatalogItem = {
          id: finalId,
          title: resolvedScore.title,
          subtitle: resolvedScore.subtitle,
          rawYaml: finalYaml,
          score: resolvedScore,
          isCustom: true,
        };

        setCatalog((prev) => {
          const filtered = prev.filter((item) => item.id !== newItem.id);
          return [...filtered, newItem];
        });
        setActiveSceneId(newItem.id);
        setRawYaml(finalYaml);
        setActiveScore(resolvedScore);
        setParseError(null);
        setParseWarning(finalParsed.warning ?? parsed.warning ?? null);
        setVideoOverrideUrl(null);
        mediaClock.seek(0);

        // Persist custom imported score to IndexedDB
        saveStoredScore({
          id: newItem.id,
          title: newItem.title,
          subtitle: newItem.subtitle,
          rawYaml: finalYaml,
          isCustom: true,
          updatedAt: Date.now(),
        });

        if (wasBundledConflict) {
          showToast(
            `Bundled ID detected: imported "${resolvedScore.title}" as new Custom Project`,
            'info'
          );
        } else {
          showToast(
            `Imported "${resolvedScore.title}" into Custom Projects`,
            'success'
          );
        }
      } else {
        setRawYaml(yamlText);
        setParseError(parsed.error);
        setParseWarning(null);
        layout.openEditMode();
        showToast(
          `Failed to parse YAML: ${parsed.error ?? 'Syntax error'}`,
          'error'
        );
      }
    },
    [mediaClock, setActiveSceneId, showToast, layout]
  );

  const handleLoadVideoBlobUrl = useCallback(
    (blobUrl: string) => {
      setVideoOverrideUrl(blobUrl);
      mediaClock.seek(0);
      showToast('Loaded local video override', 'info');
    },
    [mediaClock, showToast]
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
      className="relative w-full h-dvh flex flex-col bg-app text-text-main overflow-hidden"
    >
      {/* Drag-and-Drop Overlay Indicator */}
      {fileDrop.isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-overlay-heavy backdrop-blur-md border-2 border-dashed border-text-main flex flex-col items-center justify-center gap-2 pointer-events-none">
          <span className="text-lg font-mono font-bold text-text-main">
            Drop .MP4 / .WebM Video or .YAML Choreography Score
          </span>
          <span className="text-xs font-mono text-text-muted">
            Videos are held in session memory; YAML scores are saved in IndexedDB
          </span>
        </div>
      )}

      {/* Top Studio Header */}
      <WorkspaceHeader
        catalog={catalog}
        activeSceneId={activeSceneId}
        splitPreset={layout.splitPreset}
        isEditMode={layout.isEditMode}
        storageStatus={scorePersistence.storageStatus}
        isLibraryOpen={isLibraryOpen}
        themeMode={theme.themeMode}
        effectiveThemeCategory={theme.effectiveCategory}
        dioramaThemeMode={theme.dioramaThemeMode}
        effectiveDioramaCategory={theme.effectiveDioramaCategory}
        onSelectScene={handleSelectScene}
        onSelectSplitPreset={layout.handleSelectSplitPreset}
        onToggleEditMode={layout.handleToggleEditMode}
        onResetLayout={layout.handleResetLayout}
        onUploadFiles={fileDrop.processFiles}
        onExportActiveScore={handleExportActiveScore}
        onOpenLibrary={(tab) => {
          setLibraryInitialTab(tab ?? 'all');
          setIsLibraryOpen(true);
        }}
        onSelectThemeMode={theme.setThemeMode}
        onSelectDioramaThemeMode={theme.setDioramaThemeMode}
        onCreateBlankProject={async () => {
          const blank = await scorePersistence.createBlankScore();
          if (blank) {
            showToast(`Created new blank score "${blank.title}"`, 'success');
          }
        }}
      />

      {/* Main Resizable Split Workspace (Video Panel + 3D Blueprint Diorama + YAML Studio) */}
      <ResizableSplitWorkspace
        splitPreset={layout.splitPreset}
        isEditMode={layout.isEditMode}
        leftSplitPct={layout.leftSplitPct}
        onLeftSplitChange={layout.handleLeftSplitChange}
        rightSplitPct={layout.rightSplitPct}
        onRightSplitChange={layout.handleRightSplitChange}
        videoHeightPct={layout.videoHeightPct}
        onVideoHeightChange={layout.handleVideoHeightChange}
        isSubpanelCollapsed={layout.isSubpanelCollapsed}
        leftVideoPane={
          <UniversalVideoViewport
            score={activeScore}
            sourceInfo={mediaClock.sourceInfo}
            html5VideoRef={mediaClock.html5VideoRef}
            youtubeContainerRef={mediaClock.youtubeContainerRef}
            frameRef={stageLoop.frameRef}
            uiFrame={stageLoop.uiSnapshot.frame}
            isPlaying={mediaClock.isPlaying}
            labelMode={display.labelMode}
            showGuides={display.showGuides}
            themeCategory={theme.effectiveDioramaCategory}
            onApplyVideoUrlOverride={(url) => {
              setVideoOverrideUrl(url);
              mediaClock.seek(0);
              showToast('Applied custom video URL override', 'info');
            }}
          />
        }
        leftSubpanelPane={
          <VideoWorkspaceSubpanel
            isCollapsed={layout.isSubpanelCollapsed}
            onToggleCollapse={layout.handleToggleSubpanelCollapse}
            score={activeScore}
            activeShot={stageLoop.uiSnapshot.frame.activeShot}
            shotIndex={stageLoop.uiSnapshot.frame.shotIndex}
          />
        }
        centerStagePane={
          <div
            ref={stageContainerRef}
            className="relative w-full h-full isolate"
          >
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
              labelMode={display.labelMode}
              themeCategory={theme.effectiveDioramaCategory}
              cameraPresetActionRef={cameraPresetActionRef}
            />

            {/* Responsive Diorama HUD Overlays & POV Viewfinder Dock */}
            <DioramaOverlayContainer
              score={activeScore}
              frame={stageLoop.uiSnapshot.frame}
              liveViewportPose={stageLoop.uiSnapshot.liveViewportPose}
              cameraMode={stageLoop.cameraMode}
              isPlaying={mediaClock.isPlaying}
              labelMode={display.labelMode}
              showGuides={display.showGuides}
              isNarrow={isNarrowDiorama}
              onSetCameraMode={stageLoop.setCameraMode}
              onSelectPreset={handleSelectCameraPreset}
              onSelectLabelMode={display.handleSelectLabelMode}
              onToggleGuides={display.handleToggleGuides}
            />
          </div>
        }
        rightEditorPane={
          <YamlInspectorDrawer
            isOpen={layout.isEditMode}
            rawYaml={rawYaml}
            parseError={parseError}
            parseWarning={parseWarning}
            storageStatus={scorePersistence.storageStatus}
            isBundled={isBundledSceneId(activeSceneId)}
            onChangeYaml={handleChangeYaml}
            onForkScore={async () => {
              const forked =
                await scorePersistence.forkScoreAsCustom(activeSceneId);
              if (forked) {
                showToast(`Forked "${forked.title}" as Custom Project`, 'success');
              }
            }}
            onResetDefault={() => scorePersistence.setIsResetModalOpen(true)}
            onClose={layout.handleToggleEditMode}
          />
        }
      />

      {/* Bottom Directorial Transport Deck (Streamlined Timeline Controls) */}
      <DirectorialTransportBar
        score={activeScore}
        frame={stageLoop.uiSnapshot.frame}
        durationSec={mediaClock.durationSec}
        isPlaying={mediaClock.isPlaying}
        playbackRate={mediaClock.playbackRate}
        isMuted={mediaClock.isMuted}
        loopActiveShot={mediaClock.loopActiveShot}
        onTogglePlay={mediaClock.togglePlay}
        onSeek={handleSeekAndSync}
        onStepFrames={handleStepFramesAndSync}
        onSetPlaybackRate={mediaClock.setPlaybackRate}
        onToggleMute={mediaClock.toggleMute}
        onToggleLoopActiveShot={mediaClock.toggleLoopActiveShot}
      />

      {/* Reset Confirmation Dialog Modal */}
      <ConfirmResetModal
        isOpen={scorePersistence.isResetModalOpen}
        sceneTitle={activeScore.title}
        onConfirm={scorePersistence.confirmResetActiveScore}
        onCancel={() => scorePersistence.setIsResetModalOpen(false)}
      />

      {/* Choreography Score Library Modal (2-Column Master-Detail) */}
      <ScoreLibraryModal
        isOpen={isLibraryOpen}
        catalog={catalog}
        activeSceneId={activeSceneId}
        initialTab={libraryInitialTab}
        onSelectScene={handleSelectScene}
        onCreateBlankScore={async () => {
          const blank = await scorePersistence.createBlankScore();
          if (blank) {
            showToast(`Created new blank score "${blank.title}"`, 'success');
          }
        }}
        onForkScore={async (item) => {
          const custom = await scorePersistence.forkScoreAsCustom(item.id);
          if (custom) {
            showToast(
              `Forked "${item.title}" into editable Custom Project`,
              'success'
            );
          }
        }}
        onDuplicateScore={async (id) => {
          const item = catalog.find((c) => c.id === id);
          if (item) {
            const dupe = await scorePersistence.forkScoreAsCustom(item.id);
            if (dupe) {
              showToast(`Duplicated "${item.title}"`, 'success');
            }
          }
        }}
        onExportScore={handleExportScore}
        onRenameScore={async (id, newTitle) => {
          const ok = await scorePersistence.renameCustomScore(id, newTitle);
          if (ok) {
            showToast(`Renamed score to "${newTitle}"`, 'success');
          }
          return ok;
        }}
        onDeleteScore={async (id) => {
          const ok = await scorePersistence.deleteCustomScore(id);
          if (ok) {
            showToast('Custom project deleted', 'info');
          }
          return ok;
        }}
        onClose={() => setIsLibraryOpen(false)}
      />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const App: React.FC = () => {
  if (isHeadlessRender) {
    return <HeadlessRecorderView />;
  }
  return <InteractiveStudioApp />;
};

export default App;
