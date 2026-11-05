/**
 * Root Application Component for StageFlow.
 * Connects the Scene Catalog, Universal Media Clock, 60fps Dual-Tier Frame Loop,
 * Resizable Split Workspace, 3D Blueprint Diorama, Live YAML Score Drawer,
 * and Persistent Storage (IndexedDB scores + localStorage UI preferences).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { LabelDisplayMode, ToastNotification } from './core/types';
import {
  INITIAL_CATALOG_ITEMS,
  isBundledSceneId,
  type ScoreCatalogItem,
} from './core/scoreCatalog';
import { parseStageScore } from './core/scoreParser';
import {
  loadStoredActiveSceneId,
  loadStoredEditMode,
  loadStoredLabelMode,
  loadStoredLeftSplitPct,
  loadStoredRightSplitPct,
  loadStoredSplitPreset,
  loadStoredSubpanelCollapsed,
  loadStoredVideoHeightPct,
  loadStoredViewfinderGuides,
  saveStoredActiveSceneId,
  saveStoredEditMode,
  saveStoredLabelMode,
  saveStoredLeftSplitPct,
  saveStoredRightSplitPct,
  saveStoredSplitPreset,
  saveStoredSubpanelCollapsed,
  saveStoredVideoHeightPct,
  saveStoredViewfinderGuides,
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
import { VideoWorkspaceSubpanel } from './ui/left-panel/VideoWorkspaceSubpanel';
import { ShotBreakdownHud } from './ui/ShotBreakdownHud';
import { CameraTelemetryCapsule } from './ui/CameraTelemetryCapsule';
import { DirectorialTransportBar } from './ui/DirectorialTransportBar';
import { YamlInspectorDrawer } from './ui/YamlInspectorDrawer';
import { ConfirmResetModal } from './ui/ConfirmResetModal';
import { ScoreLibraryModal, type FilterTab } from './ui/ScoreLibraryModal';
import { ToastContainer } from './ui/ToastContainer';
import { LabelDisplayModeToggle } from './ui/LabelDisplayModeToggle';
import { StageCamViewfinderOverlay } from './ui/StageCamViewfinderOverlay';
import { CameraModeSwitcher } from './ui/CameraModeSwitcher';
import { CameraPresetControls } from './ui/CameraPresetControls';
import { CompactDioramaHeader } from './ui/CompactDioramaHeader';
import type { CameraPresetType } from './stage/cameraPresets';
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

  const [isEditMode, setIsEditModeState] = useState<boolean>(
    () => loadStoredEditMode() ?? false
  );

  const [leftSplitPct, setLeftSplitPctState] = useState<number>(
    () => loadStoredLeftSplitPct() ?? 30
  );

  const [rightSplitPct, setRightSplitPctState] = useState<number>(
    () => loadStoredRightSplitPct() ?? 30
  );

  const [videoHeightPct, setVideoHeightPctState] = useState<number>(
    () => loadStoredVideoHeightPct() ?? 45
  );

  const [isSubpanelCollapsed, setIsSubpanelCollapsedState] = useState<boolean>(
    () => loadStoredSubpanelCollapsed() ?? false
  );

  const [labelMode, setLabelModeState] = useState<LabelDisplayMode>(
    () => loadStoredLabelMode() ?? 'all'
  );

  const [showGuides, setShowGuidesState] = useState<boolean>(
    () => loadStoredViewfinderGuides() ?? true
  );

  // Score Library Modal state & initial category tab
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialTab, setLibraryInitialTab] = useState<FilterTab>('all');

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

  // Sync wrappers that persist UI preferences to localStorage
  const setActiveSceneId = useCallback((id: string) => {
    setActiveSceneIdState(id);
    saveStoredActiveSceneId(id);
  }, []);

  const handleSelectSplitPreset = useCallback((preset: SplitPreset) => {
    setSplitPresetState(preset);
    saveStoredSplitPreset(preset);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditModeState((prev) => {
      const next = !prev;
      saveStoredEditMode(next);
      if (next) {
        setIsSubpanelCollapsedState(false);
        saveStoredSubpanelCollapsed(false);
      }
      return next;
    });
  }, []);

  const handleToggleSubpanelCollapse = useCallback(() => {
    setIsSubpanelCollapsedState((prev) => {
      const next = !prev;
      saveStoredSubpanelCollapsed(next);
      return next;
    });
  }, []);

  const handleLeftSplitChange = useCallback((pct: number) => {
    setLeftSplitPctState(pct);
    saveStoredLeftSplitPct(pct);
  }, []);

  const handleRightSplitChange = useCallback((pct: number) => {
    setRightSplitPctState(pct);
    saveStoredRightSplitPct(pct);
  }, []);

  const handleVideoHeightChange = useCallback((pct: number) => {
    setVideoHeightPctState(pct);
    saveStoredVideoHeightPct(pct);
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

  const handleExportScore = useCallback(
    (item: ScoreCatalogItem) => {
      const blob = new Blob([item.rawYaml], {
        type: 'text/yaml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.id}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
        setIsEditModeState(true);
        saveStoredEditMode(true);
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
        isEditMode={isEditMode}
        storageStatus={scorePersistence.storageStatus}
        isLibraryOpen={isLibraryOpen}
        themeMode={theme.themeMode}
        effectiveThemeCategory={theme.effectiveCategory}
        dioramaThemeMode={theme.dioramaThemeMode}
        effectiveDioramaCategory={theme.effectiveDioramaCategory}
        onSelectScene={handleSelectScene}
        onSelectSplitPreset={handleSelectSplitPreset}
        onToggleEditMode={handleToggleEditMode}
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
        splitPreset={splitPreset}
        isEditMode={isEditMode}
        leftSplitPct={leftSplitPct}
        onLeftSplitChange={handleLeftSplitChange}
        rightSplitPct={rightSplitPct}
        onRightSplitChange={handleRightSplitChange}
        videoHeightPct={videoHeightPct}
        onVideoHeightChange={handleVideoHeightChange}
        isSubpanelCollapsed={isSubpanelCollapsed}
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
        leftSubpanelPane={
          <VideoWorkspaceSubpanel
            isCollapsed={isSubpanelCollapsed}
            onToggleCollapse={handleToggleSubpanelCollapse}
            score={activeScore}
            activeShot={stageLoop.uiSnapshot.frame.activeShot}
            shotIndex={stageLoop.uiSnapshot.frame.shotIndex}
          />
        }
        centerStagePane={
          <div ref={stageContainerRef} className="relative w-full h-full isolate">
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
              cameraPresetActionRef={cameraPresetActionRef}
            />

            {/* Stage Camera POV Director's Optical Viewfinder Overlay */}
            {stageLoop.cameraMode === 'stage-pov' && (
              <StageCamViewfinderOverlay
                score={activeScore}
                frame={stageLoop.uiSnapshot.frame}
                showGuides={showGuides}
              />
            )}

            {/* Narrow Viewport: Dedicated Unified Compact Header (<580px) */}
            {isNarrowDiorama ? (
              <CompactDioramaHeader
                score={activeScore}
                frame={stageLoop.uiSnapshot.frame}
                cameraMode={stageLoop.cameraMode}
                onSetCameraMode={stageLoop.setCameraMode}
                onSelectPreset={handleSelectCameraPreset}
                labelMode={labelMode}
                onSelectLabelMode={handleSelectLabelMode}
                showGuides={showGuides}
                onToggleGuides={handleToggleGuides}
              />
            ) : (
              <>
                {/* 1. TOP-LEFT: Shot & Lens Breakdown HUD (Defaults to 2-line Collapsed Pill) */}
                <ShotBreakdownHud
                  score={activeScore}
                  frame={stageLoop.uiSnapshot.frame}
                  cameraMode={stageLoop.cameraMode}
                  isPlaying={mediaClock.isPlaying}
                />

                {/* 2. TOP-RIGHT: 3D Stage Labels & Viewfinder Guides */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto select-none">
                  <LabelDisplayModeToggle
                    labelMode={labelMode}
                    onSelectLabelMode={handleSelectLabelMode}
                    showGuides={showGuides}
                    onToggleGuides={handleToggleGuides}
                    cameraMode={stageLoop.cameraMode}
                  />
                </div>

                {/* 3. BOTTOM-LEFT: Directorial Camera Workstation Dock (ViewCube Presets + Camera POV Modes) */}
                <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-none select-none">
                  {/* Tier 1: View Angle Presets (3D ViewCube Icons) */}
                  <CameraPresetControls onSelectPreset={handleSelectCameraPreset} />

                  {/* Tier 2: Camera POV Mode Switcher (Scripted, Free Orbit, Stage Cam) */}
                  <CameraModeSwitcher
                    cameraMode={stageLoop.cameraMode}
                    onSetCameraMode={stageLoop.setCameraMode}
                  />
                </div>
              </>
            )}

            {/* 4. BOTTOM-RIGHT: Authoring Telemetry Capsule + 1-Click YAML Copy (Hidden when narrow) */}
            {!isNarrowDiorama && (
              <CameraTelemetryCapsule
                pose={stageLoop.uiSnapshot.liveViewportPose}
              />
            )}
          </div>
        }
        rightEditorPane={
          <YamlInspectorDrawer
            isOpen={isEditMode}
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
            onClose={handleToggleEditMode}
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
            showToast(`Forked "${item.title}" into editable Custom Project`, 'success');
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
