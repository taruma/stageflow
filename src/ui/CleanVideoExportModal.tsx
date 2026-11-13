/**
 * Directorial Clean Film Gate MP4 Export Modal.
 * Configures resolution tier, framerate, time range, and stage theme (default: Light),
 * inherits Stage Cam [BLUR] state, mounts the offscreen WebGL canvas only while encoding,
 * and displays live deterministic frame progress.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Film, Download, X, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { computeStageFrame } from '../core/frameEngine';
import {
  computeExportDimensions,
  computeExportTimeRange,
  formatExportMp4Filename,
  type ExportFps,
  type ExportRangeMode,
  type ExportResolutionTier,
} from '../core/exportMath';
import type {
  AppThemeCategory,
  ShotCue,
  StageScore,
  ToastNotification,
} from '../core/types';
import {
  CleanStageCamExportCanvas,
  type CleanStageCamExportHandle,
} from '../stage/CleanStageCamExportCanvas';
import { useWebVideoExport } from '../hooks/useWebVideoExport';
import { UI_TOKENS } from './tokens/ui';

export interface CleanVideoExportModalProps {
  isOpen: boolean;
  score: StageScore;
  activeShot?: ShotCue | null;
  dofBlurEnabled: boolean;
  onNotify?: (message: string, type?: ToastNotification['type']) => void;
  onClose: () => void;
}

export const CleanVideoExportModal: React.FC<CleanVideoExportModalProps> = ({
  isOpen,
  score,
  activeShot,
  dofBlurEnabled,
  onNotify,
  onClose,
}) => {
  const [tier, setTier] = useState<ExportResolutionTier>(1080);
  const [fps, setFps] = useState<ExportFps>(60);
  const [rangeMode, setRangeMode] = useState<ExportRangeMode>('scene');
  const [exportTheme, setExportTheme] = useState<AppThemeCategory>('light');
  const [exportDofBlur, setExportDofBlur] = useState<boolean>(dofBlurEnabled);
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);

  // Sync initial DoF blur option from active Stage Cam [BLUR] state when modal opens
  useEffect(() => {
    if (isOpen && !isCanvasMounted) {
      setExportDofBlur(dofBlurEnabled);
    }
  }, [isOpen, dofBlurEnabled, isCanvasMounted]);

  const exportCanvasRef = useRef<CleanStageCamExportHandle | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { isExporting, progress, error, isSupported, startExport, cancelExport } =
    useWebVideoExport({ onNotify });

  const hasValidShot =
    activeShot != null && activeShot.endSec > activeShot.startSec;

  const effectiveRangeMode: ExportRangeMode =
    rangeMode === 'shot' && hasValidShot ? 'shot' : 'scene';

  const dims = useMemo(
    () => computeExportDimensions(tier, score.aspectRatio),
    [tier, score.aspectRatio]
  );

  const timeRange = useMemo(
    () => computeExportTimeRange(score, effectiveRangeMode, fps, activeShot),
    [score, effectiveRangeMode, fps, activeShot]
  );

  const filename = useMemo(
    () =>
      formatExportMp4Filename(
        score.id || score.title,
        tier,
        fps,
        timeRange.shotId
      ),
    [score.id, score.title, tier, fps, timeRange.shotId]
  );

  const initialFrame = useMemo(
    () => computeStageFrame(timeRange.startSec, score),
    [timeRange.startSec, score]
  );

  const previewDims = useMemo(() => {
    const maxW = 280;
    const maxH = 140;
    const ratio = dims.width / Math.max(1, dims.height);
    let w = maxW;
    let h = Math.round(w / ratio);
    if (h > maxH) {
      h = maxH;
      w = Math.round(h * ratio);
    }
    return { width: Math.max(80, w), height: Math.max(48, h) };
  }, [dims.width, dims.height]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExporting) {
          cancelExport();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, cancelExport, onClose]);

  useEffect(() => {
    if (!isOpen && isExporting) {
      cancelExport();
      setIsCanvasMounted(false);
    }
  }, [isOpen, isExporting, cancelExport]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsCanvasMounted(true);
    // Allow React to mount the offscreen WebGL canvas before stepping frame 0
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const success = await startExport({
      score,
      tier,
      fps,
      rangeMode: effectiveRangeMode,
      activeShot,
      previewCanvasRef,
      renderFrame: async (frame) => {
        if (!exportCanvasRef.current) {
          throw new Error('Offscreen Stage Cam canvas is not mounted.');
        }
        return exportCanvasRef.current.renderFrame(frame);
      },
    });

    setIsCanvasMounted(false);
    if (success) {
      onClose();
    }
  };

  const handleCancelOrClose = () => {
    if (isExporting) {
      cancelExport();
      setIsCanvasMounted(false);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clean-video-export-title"
      className={UI_TOKENS.modal.overlay}
      onClick={() => {
        if (!isExporting) onClose();
      }}
    >
      <div
        className="bg-surface w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border-main text-text-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={UI_TOKENS.modal.header}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="clean-video-export-title"
                className="text-sm font-bold font-sans text-text-main"
              >
                Export Clean Stage Cam (.mp4)
              </h2>
              <span className="text-[11px] font-mono text-text-muted">
                {score.title} · {dims.width}×{dims.height}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelOrClose}
            aria-label={isExporting ? 'Cancel export' : 'Close dialog'}
            className={UI_TOKENS.button.iconClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isSupported && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                WebCodecs <code>VideoEncoder</code> is unavailable in this browser
                or context. Use Chrome, Edge, or Safari 16.4+ over HTTPS or
                localhost.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Optical Plate Summary */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-text-main">
                Stage Cam POV · Clean Gate (1:1)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setExportDofBlur((prev) => !prev)}
                title="Toggle Thin-Lens Optical Depth-of-Field Blur for this export"
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                  isExporting
                    ? 'cursor-default opacity-80'
                    : 'cursor-pointer active:scale-95'
                } ${
                  exportDofBlur
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-surface text-text-muted border-border-main hover:text-text-main'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                BLUR {exportDofBlur ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {!isExporting ? (
            <div className="space-y-3.5">
              {/* Resolution & Framerate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className={UI_TOKENS.input.label}>Resolution</span>
                  <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
                    {([1080, 720] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTier(opt)}
                        className={`flex-1 justify-center ${
                          tier === opt
                            ? UI_TOKENS.button.segmentedItemActive
                            : UI_TOKENS.button.segmentedItem
                        }`}
                      >
                        {opt}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className={UI_TOKENS.input.label}>Frame Rate</span>
                  <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
                    {([60, 24] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFps(opt)}
                        className={`flex-1 justify-center ${
                          fps === opt
                            ? UI_TOKENS.button.segmentedItemActive
                            : UI_TOKENS.button.segmentedItem
                        }`}
                      >
                        {opt} fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-1.5">
                <span className={UI_TOKENS.input.label}>Time Range</span>
                <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
                  <button
                    type="button"
                    onClick={() => setRangeMode('scene')}
                    className={`flex-1 justify-center ${
                      effectiveRangeMode === 'scene'
                        ? UI_TOKENS.button.segmentedItemActive
                        : UI_TOKENS.button.segmentedItem
                    }`}
                  >
                    Entire Scene ({score.durationSec.toFixed(1)}s)
                  </button>
                  <button
                    type="button"
                    disabled={!hasValidShot}
                    onClick={() => setRangeMode('shot')}
                    className={`flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                      effectiveRangeMode === 'shot'
                        ? UI_TOKENS.button.segmentedItemActive
                        : UI_TOKENS.button.segmentedItem
                    }`}
                  >
                    Current Shot{activeShot ? ` (${activeShot.id})` : ''}
                  </button>
                </div>
              </div>

              {/* Stage Palette & Optical DoF Blur */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className={UI_TOKENS.input.label}>Stage Palette</span>
                  <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
                    {(
                      [
                        { id: 'light', label: 'Light' },
                        { id: 'warm', label: 'Warm' },
                        { id: 'dark', label: 'Dark' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExportTheme(opt.id)}
                        className={`flex-1 justify-center ${
                          exportTheme === opt.id
                            ? UI_TOKENS.button.segmentedItemActive
                            : UI_TOKENS.button.segmentedItem
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className={UI_TOKENS.input.label}>Optical DoF Blur</span>
                  <div className={`${UI_TOKENS.button.segmentedGroup} w-full`}>
                    {(
                      [
                        { value: true, label: 'On' },
                        { value: false, label: 'Off' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setExportDofBlur(opt.value)}
                        className={`flex-1 justify-center ${
                          exportDofBlur === opt.value
                            ? UI_TOKENS.button.segmentedItemActive
                            : UI_TOKENS.button.segmentedItem
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Summary */}
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-mono text-text-muted space-y-1">
                <div className="flex justify-between gap-2">
                  <span>Output File</span>
                  <span className="text-text-main font-semibold truncate">
                    {filename}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Cadence & Frames</span>
                  <span className="text-text-body">
                    {timeRange.totalFrames} frames · {timeRange.durationSec.toFixed(2)}s · Silent MP4
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Live Preview Thumbnail */}
              <div className="flex items-center justify-center rounded-xl bg-app border border-border-main p-2 overflow-hidden">
                <canvas
                  ref={previewCanvasRef}
                  width={previewDims.width}
                  height={previewDims.height}
                  className="rounded-lg shadow-sm bg-black/10"
                />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-100"
                    style={{ width: `${progress?.percent ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>
                    Frame {progress?.frameIndex ?? 0} /{' '}
                    {progress?.totalFrames ?? timeRange.totalFrames} (
                    {progress?.percent ?? 0}%)
                  </span>
                  <span>
                    {progress?.shotId ? `[${progress.shotId}] · ` : ''}
                    {progress?.encodingFps ?? 0} fps
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border-subtle bg-surface-subtle flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancelOrClose}
            className={UI_TOKENS.button.secondary}
          >
            {isExporting ? 'Cancel Export' : 'Cancel'}
          </button>

          {!isExporting && (
            <button
              type="button"
              disabled={!isSupported}
              onClick={handleStartExport}
              className={`${UI_TOKENS.button.primary} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Download className="w-4 h-4" />
              <span>Export MP4</span>
            </button>
          )}

          {isExporting && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Encoding…</span>
            </div>
          )}
        </div>
      </div>

      {/* Offscreen Clean Film Gate Canvas (Mounted Strictly During Active Export) */}
      {isCanvasMounted && (
        <CleanStageCamExportCanvas
          ref={exportCanvasRef}
          score={score}
          initialFrame={initialFrame}
          width={dims.width}
          height={dims.height}
          dofBlurEnabled={exportDofBlur}
          themeCategory={exportTheme}
        />
      )}
    </div>
  );
};
