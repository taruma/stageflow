/**
 * In-Browser Deterministic WebCodecs (H.264) + mp4-muxer Export Hook.
 * Steps computeStageFrame(t_i, score) in discrete increments (t_i = start + i / fps),
 * renders via an injected offscreen Stage Cam callback, encodes VideoFrames with
 * queue backpressure control, and triggers an instant MP4 download.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { computeStageFrame } from '../core/frameEngine';
import {
  computeExportBitrate,
  computeExportDimensions,
  computeExportFrameTimestampSec,
  computeExportTimeRange,
  formatExportMp4Filename,
  resolveExportAspectRatio,
  type ExportFps,
  type ExportRangeMode,
  type ExportResolutionTier,
  type ExportTargetCamera,
} from '../core/exportMath';
import type { ShotCue, StageFrame, StageScore, ToastNotification } from '../core/types';

export type RenderExportFrameFn = (frame: StageFrame) => Promise<HTMLCanvasElement>;

export interface WebVideoExportProgress {
  frameIndex: number;
  totalFrames: number;
  percent: number;
  shotId: string | null;
  encodingFps: number;
}

export interface StartWebVideoExportParams {
  score: StageScore;
  tier: ExportResolutionTier;
  fps: ExportFps;
  rangeMode: ExportRangeMode;
  targetCamera?: ExportTargetCamera;
  activeShot?: ShotCue | null;
  renderFrame: RenderExportFrameFn;
  previewCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export interface UseWebVideoExportOptions {
  onNotify?: (message: string, type?: ToastNotification['type']) => void;
}

const H264_CODEC_CANDIDATES = [
  'avc1.640028', // High Profile Level 4.0 (1080p)
  'avc1.640033', // High Profile Level 5.1 (1080p60+)
  'avc1.4d002a', // Main Profile Level 4.2
  'avc1.42001f', // Baseline Profile Level 3.1
] as const;

export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.VideoEncoder === 'function' &&
    typeof window.VideoFrame === 'function'
  );
}

async function resolveSupportedVideoEncoderConfig(
  width: number,
  height: number,
  fps: ExportFps,
  bitrate: number
): Promise<VideoEncoderConfig | null> {
  for (const codec of H264_CODEC_CANDIDATES) {
    const candidate: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      hardwareAcceleration: 'no-preference',
      latencyMode: 'quality',
    };
    try {
      const support = await VideoEncoder.isConfigSupported(candidate);
      if (support.supported) {
        return support.config ?? candidate;
      }
    } catch {
      // Try next H.264 profile candidate
    }
  }
  return null;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function triggerMp4Download(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function drawPreviewThumbnail(
  sourceCanvas: HTMLCanvasElement,
  previewCanvas: HTMLCanvasElement | null | undefined
): void {
  if (!previewCanvas) return;
  const ctx = previewCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
}

export function useWebVideoExport({ onNotify }: UseWebVideoExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<WebVideoExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const activeEncoderRef = useRef<VideoEncoder | null>(null);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
    const encoder = activeEncoderRef.current;
    if (encoder && encoder.state !== 'closed') {
      try {
        encoder.close();
      } catch {
        // Ignore close errors during abort
      }
    }
    activeEncoderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelExport();
    };
  }, [cancelExport]);

  const startExport = useCallback(
    async ({
      score,
      tier,
      fps,
      rangeMode,
      targetCamera = 'stage-cam',
      activeShot,
      renderFrame,
      previewCanvasRef,
    }: StartWebVideoExportParams): Promise<boolean> => {
      if (!isWebCodecsSupported()) {
        const msg =
          'WebCodecs VideoEncoder is not available in this browser or context (requires HTTPS/localhost in Chrome, Edge, or Safari 16.4+).';
        setError(msg);
        onNotify?.(msg, 'error');
        return false;
      }

      abortRef.current = false;
      setError(null);
      setIsExporting(true);

      const effectiveAspectRatio = resolveExportAspectRatio(
        score.aspectRatio,
        targetCamera
      );
      const dims = computeExportDimensions(tier, effectiveAspectRatio);
      const timeRange = computeExportTimeRange(score, rangeMode, fps, activeShot);
      const bitrate = computeExportBitrate(dims.width, dims.height, fps);
      const filename = formatExportMp4Filename(
        score.id || score.title,
        tier,
        fps,
        timeRange.shotId,
        targetCamera
      );

      setProgress({
        frameIndex: 0,
        totalFrames: timeRange.totalFrames,
        percent: 0,
        shotId: timeRange.shotId,
        encodingFps: 0,
      });

      let encoder: VideoEncoder | null = null;

      try {
        const encoderConfig = await resolveSupportedVideoEncoderConfig(
          dims.width,
          dims.height,
          fps,
          bitrate
        );
        if (!encoderConfig) {
          throw new Error(
            'Hardware or software H.264 video encoding is not supported on this device/browser.'
          );
        }

        const target = new ArrayBufferTarget();
        const muxer = new Muxer({
          target,
          video: {
            codec: 'avc',
            width: dims.width,
            height: dims.height,
          },
          fastStart: 'in-memory',
        });

        let encoderFailure: Error | null = null;
        encoder = new VideoEncoder({
          output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta);
          },
          error: (err) => {
            encoderFailure = err instanceof Error ? err : new Error(String(err));
          },
        });
        activeEncoderRef.current = encoder;
        encoder.configure(encoderConfig);

        const frameDurationUs = Math.round(1_000_000 / fps);
        const startPerf = performance.now();

        for (let i = 0; i < timeRange.totalFrames; i++) {
          if (abortRef.current) {
            return false;
          }
          if (encoderFailure) {
            throw encoderFailure;
          }

          const tSec = computeExportFrameTimestampSec(
            timeRange.startSec,
            timeRange.endSec,
            i,
            fps
          );
          const frame = computeStageFrame(tSec, score);
          const canvas = await renderFrame(frame);

          if (abortRef.current) {
            return false;
          }

          // Update live preview thumbnail periodically without stalling GPU pipeline
          if (i <= 2 || i === timeRange.totalFrames - 1 || i % 10 === 0) {
            drawPreviewThumbnail(canvas, previewCanvasRef?.current);
          }

          const timestampUs = Math.round((i / fps) * 1_000_000);
          const videoFrame = new VideoFrame(canvas, {
            timestamp: timestampUs,
            duration: frameDurationUs,
          });

          const isKeyFrame = i % (fps * 2) === 0;
          encoder.encode(videoFrame, { keyFrame: isKeyFrame });
          videoFrame.close();

          // Backpressure guard so GPU memory does not queue unbounded VideoFrames
          while (encoder.encodeQueueSize > 6 && !abortRef.current) {
            await yieldToEventLoop();
          }

          const elapsedSec = Math.max(0.001, (performance.now() - startPerf) / 1000);
          const currentShotId = frame.activeShot?.id ?? timeRange.shotId;

          if (i % 2 === 0 || i === timeRange.totalFrames - 1) {
            setProgress({
              frameIndex: i + 1,
              totalFrames: timeRange.totalFrames,
              percent: Math.round(((i + 1) / timeRange.totalFrames) * 100),
              shotId: currentShotId,
              encodingFps: Math.round((i + 1) / elapsedSec),
            });
            await yieldToEventLoop();
          }
        }

        if (abortRef.current) {
          return false;
        }
        if (encoderFailure) {
          throw encoderFailure;
        }

        await encoder.flush();
        muxer.finalize();

        triggerMp4Download(target.buffer, filename);
        onNotify?.(`Exported "${filename}"`, 'success');
        return true;
      } catch (err) {
        if (!abortRef.current) {
          const message =
            err instanceof Error ? err.message : 'Failed to export MP4 video.';
          setError(message);
          onNotify?.(message, 'error');
        }
        return false;
      } finally {
        if (encoder && encoder.state !== 'closed') {
          try {
            encoder.close();
          } catch {
            // Ignore close errors on cleanup
          }
        }
        activeEncoderRef.current = null;
        setIsExporting(false);
      }
    },
    [onNotify]
  );

  return {
    isExporting,
    progress,
    error,
    isSupported: isWebCodecsSupported(),
    startExport,
    cancelExport,
  };
}
