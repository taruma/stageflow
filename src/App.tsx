/**
 * Root Application Component for StageFlow.
 * Connects the Scene Catalog, Universal Media Clock, 60fps Dual-Tier Frame Loop,
 * Resizable Split Workspace, 3D Blueprint Diorama, Live YAML Score Drawer,
 * and Persistent Storage (IndexedDB scores + localStorage UI preferences).
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { LabelDisplayMode, ToastNotification } from './core/types';
import {
  INITIAL_CATALOG_ITEMS,
  isBundledSceneId,
  type ScoreCatalogItem,
} from './core/scoreCatalog';
import { parseStageScore } from './core/scoreParser';
import {
  loadStoredActiveSceneId,
  loadStoredLabelMode,
  loadStoredSplitPreset,
  loadStoredViewfinderGuides,
  loadStoredYamlDrawerOpen,
  saveStoredActiveSceneId,
  saveStoredLabelMode,
  saveStoredSplitPreset,
  saveStoredViewfinderGuides,
  saveStoredYamlDrawerOpen,
} from './core/storage/localStorageUi';
import { saveStoredScore } from './core/storage/scoreDb';
import { useMediaClock } from './hooks/useMediaClock';
import { useStageFrameLoop } from './hooks/useStageFrameLoop';
import { useFileDropLoader } from './hooks/useFileDropLoader';
import { useScorePersistence } from './hooks/useScorePersistence';
import { useAppShellTheme } from './hooks/useAppShellTheme';
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
import { ManageProjectsModal } from './ui/ManageProjectsModal';
import { ScoreLibraryModal } from './ui/ScoreLibraryModal';
import { ToastContainer } from './ui/ToastContainer';
import { LabelDisplayModeToggle } from './ui/LabelDisplayModeToggle';
import { StageCamViewfinderOverlay } from './ui/StageCamViewfinderOverlay';
import { HeadlessRecorderView } from './recorder/HeadlessRecorderView';

const isHeadlessRender =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mode') === 'headless-render';

const InteractiveStudioApp: React.FC = () => {
  const theme = useAppShellTheme();

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
    () => loadStoredSplitPreset() ?? 'split'
  );

  const [isYamlDrawerOpen, setIsYamlDrawerOpenState] = useState<boolean>(
    () => loadStoredYamlDrawerOpen() ?? false
  );

  const [labelMode, setLabelModeState] = useState<LabelDisplayMode>(
    () => loadStoredLabelMode() ?? 'all'
  );

  const [showGuides, setShowGuidesState] = useState<boolean>(
    () => loadStoredViewfinderGuides() ?? true
  );

  // Manage Projects Dialog state
  const [isManageProjectsOpen, setIsManageProjectsOpen] = useState(false);

  // Score Library Modal state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Floating Toast Notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastNotification['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const initialItem =
    INITIAL_CATALOG_ITEMS.find((item) => item.id === activeSceneId) ??
    INITIAL_CATALOG_ITEMS[0];

  const [rawYaml, setRawYaml] = useState<string>(initialItem.rawYaml);
  const [activeScore, setActiveScore] = useState(initialItem.score);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
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

  const handleSelectLabelMode = useCallback((mode: LabelDisplayMode) => {
    setLabelModeState(mode);
    saveStoredLabelMode(mode);
  }, []);

  const handleCycleLabelMode = useCallback(() => {
    setLabelModeState((prev) => {
      const next: LabelDisplayMode =
        prev === 'all' ? 'camera-only' : prev === 'camera-only' ? 'off' : 'all';
      saveStoredLabelMode(next);
      return next;
    });
  }, []);

  const handleToggleGuides = useCallback(() => {
    setShowGuidesState((prev) => {
      const next = !prev;
      saveStoredViewfinderGuides(next);
      return next;
    });
  }, []);

  const handleExportActiveScore = useCallback(() => {
    const blob = new Blob([rawYaml], {
      type: 'text/yaml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSceneId}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported score "${activeSceneId}.yaml"`, 'success');
  }, [rawYaml, activeSceneId, showToast]);

  // Global hotkeys: 'L' cycles label modes, 'G' toggles composition guides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleCycleLabelMode();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleToggleGuides();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCycleLabelMode, handleToggleGuides]);

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
          const timestamp = Date.now().toString(36);
          const safeSlug = (fallbackId || finalId || 'scene')
            .replace(/[^a-z0-9]+/gi, '-')
            .toLowerCase();
          finalId = `custom-${safeSlug}-${timestamp}`;

          if (/^id:\s*["']?[^"'\n\r]+["']?/m.test(finalYaml)) {
            finalYaml = finalYaml.replace(
              /^id:\s*["']?[^"'\n\r]+["']?/m,
              `id: "${finalId}"`
            );
          } else {
            finalYaml = `id: "${finalId}"\n${finalYaml}`;
          }
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
        setIsYamlDrawerOpenState(true);
        showToast(
          `Failed to parse YAML: ${parsed.error ?? 'Syntax error'}`,
          'error'
        );
      }
    },
    [mediaClock, setActiveSceneId, showToast]
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
        splitPreset={splitPreset}
        isYamlDrawerOpen={isYamlDrawerOpen}
        storageStatus={scorePersistence.storageStatus}
        isLibraryOpen={isLibraryOpen}
        themeMode={theme.themeMode}
        effectiveThemeCategory={theme.effectiveCategory}
        dioramaThemeMode={theme.dioramaThemeMode}
        effectiveDioramaCategory={theme.effectiveDioramaCategory}
        onSelectScene={handleSelectScene}
        onSelectSplitPreset={handleSelectSplitPreset}
        onToggleYamlDrawer={handleToggleYamlDrawer}
        onUploadFiles={fileDrop.processFiles}
        onExportActiveScore={handleExportActiveScore}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onSelectThemeMode={theme.setThemeMode}
        onSelectDioramaThemeMode={theme.setDioramaThemeMode}
        onOpenManageProjects={() => setIsManageProjectsOpen(true)}
        onCreateBlankProject={async () => {
          const blank = await scorePersistence.createBlankScore();
          if (blank) {
            showToast(`Created new blank score "${blank.title}"`, 'success');
          }
        }}
      />

      {/* Main Resizable Split Workspace (Video Panel + 3D Blueprint Diorama) */}
      <ResizableSplitWorkspace
        splitPreset={splitPreset}
        onCustomDragSplit={() => {
          if (splitPreset !== 'split') {
            handleSelectSplitPreset('split');
          }
        }}
        leftVideoPane={
          <UniversalVideoViewport
            score={activeScore}
            sourceInfo={mediaClock.sourceInfo}
            html5VideoRef={mediaClock.html5VideoRef}
            youtubeContainerRef={mediaClock.youtubeContainerRef}
            frameRef={stageLoop.frameRef}
            uiFrame={stageLoop.uiSnapshot.frame}
            isPlaying={mediaClock.isPlaying}
            labelMode={labelMode}
            showGuides={showGuides}
            themeCategory={theme.effectiveDioramaCategory}
            onApplyVideoUrlOverride={(url) => {
              setVideoOverrideUrl(url);
              mediaClock.seek(0);
              showToast('Applied custom video URL override', 'info');
            }}
          />
        }
        rightStagePane={
          <div className="relative w-full h-full isolate">
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
              labelMode={labelMode}
              themeCategory={theme.effectiveDioramaCategory}
            />

            {/* Stage Camera POV Director's Optical Viewfinder Overlay */}
            {stageLoop.cameraMode === 'stage-pov' && (
              <StageCamViewfinderOverlay
                score={activeScore}
                frame={stageLoop.uiSnapshot.frame}
                showGuides={showGuides}
              />
            )}

            {/* Top-Left Shot & Lens Breakdown HUD */}
            <ShotBreakdownHud
              score={activeScore}
              frame={stageLoop.uiSnapshot.frame}
              cameraMode={stageLoop.cameraMode}
              isPlaying={mediaClock.isPlaying}
            />

            {/* Top-Right Label & Guides Viewport Overlay Controls (Hotkeys: L, G) */}
            <LabelDisplayModeToggle
              labelMode={labelMode}
              onSelectLabelMode={handleSelectLabelMode}
              showGuides={showGuides}
              onToggleGuides={handleToggleGuides}
              cameraMode={stageLoop.cameraMode}
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
        parseWarning={parseWarning}
        storageStatus={scorePersistence.storageStatus}
        isBundled={isBundledSceneId(activeSceneId)}
        onChangeYaml={handleChangeYaml}
        onForkScore={async () => {
          const forked = await scorePersistence.forkScoreAsCustom(activeSceneId);
          if (forked) {
            showToast(`Forked "${forked.title}" as Custom Project`, 'success');
          }
        }}
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

      {/* Manage Custom Projects Dialog Modal */}
      <ManageProjectsModal
        isOpen={isManageProjectsOpen}
        customProjects={catalog.filter((item) => item.isCustom)}
        activeSceneId={activeSceneId}
        onSelectProject={(id) => handleSelectScene(id)}
        onRenameProject={async (id, newTitle) => {
          const ok = await scorePersistence.renameCustomScore(id, newTitle);
          if (ok) {
            showToast(`Score renamed to "${newTitle}"`, 'success');
          }
          return ok;
        }}
        onDeleteProject={async (id) => {
          const ok = await scorePersistence.deleteCustomScore(id);
          if (ok) {
            showToast('Custom score deleted', 'info');
          }
          return ok;
        }}
        onCreateBlankProject={async () => {
          const blank = await scorePersistence.createBlankScore();
          if (blank) {
            showToast(`Created new blank score "${blank.title}"`, 'success');
          }
        }}
        onClose={() => setIsManageProjectsOpen(false)}
      />

      {/* Choreography Score Library Modal */}
      <ScoreLibraryModal
        isOpen={isLibraryOpen}
        catalog={catalog}
        activeSceneId={activeSceneId}
        onSelectScene={handleSelectScene}
        onCreateBlankScore={async () => {
          const blank = await scorePersistence.createBlankScore();
          if (blank) {
            showToast(`Created new blank score "${blank.title}"`, 'success');
          }
        }}
        onOpenManageScores={() => setIsManageProjectsOpen(true)}
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
