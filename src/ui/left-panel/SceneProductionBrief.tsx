/**
 * SceneProductionBrief Component.
 * Executive Scene Production Sheet & Call Sheet for the Directorial Workspace.
 * Displays scene premise & directorial notes, optical & production specs grid,
 * lens & camera maneuver packages, and categorized cast & prop lineup.
 * Layer 5 UI Component.
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Clock,
  Layers,
  Video,
  Camera,
  Film,
  Aperture,
  Compass,
} from 'lucide-react';
import type { StageScore } from '../../core/types';
import { SceneEntityRoster } from './SceneEntityRoster';

export interface SceneProductionBriefProps {
  score: StageScore;
}

function formatAspectRatio(ratio: number | string | undefined): string {
  if (typeof ratio === 'string') return ratio;
  if (!ratio || Number.isNaN(ratio)) return '16:9';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 2.39) < 0.08 || Math.abs(ratio - 2.35) < 0.08) return '2.39:1';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
  return `${ratio.toFixed(2)}:1`;
}

function getMediaSourceBadge(videoUrl?: string): {
  label: string;
  icon: React.FC<{ className?: string }>;
} {
  if (!videoUrl || videoUrl.startsWith('procedural://')) {
    return { label: 'Simulator', icon: Camera };
  }
  if (
    videoUrl.startsWith('youtube://') ||
    videoUrl.includes('youtube.com') ||
    videoUrl.includes('youtu.be')
  ) {
    return { label: 'YouTube Sync', icon: Film };
  }
  return { label: 'Video Player', icon: Video };
}

export const SceneProductionBrief: React.FC<SceneProductionBriefProps> = ({
  score,
}) => {
  const durationSec = score.durationSec ?? 0;
  const shotCount = score.shots?.length ?? 0;
  const mediaBadge = getMediaSourceBadge(score.videoUrl);
  const MediaIcon = mediaBadge.icon;

  // Extract unique prime lenses and camera maneuvers across the scene
  const { lenses, maneuvers } = useMemo(() => {
    const lensSet = new Set<string>();
    const maneuverSet = new Set<string>();

    (score.shots ?? []).forEach((shot) => {
      if (shot.stageCamera?.focalLengthMm) {
        lensSet.add(`${Math.round(shot.stageCamera.focalLengthMm)}mm`);
      }
      if (shot.stageCamera?.maneuver) {
        maneuverSet.add(shot.stageCamera.maneuver.toUpperCase());
      }
    });

    return {
      lenses: Array.from(lensSet),
      maneuvers: Array.from(maneuverSet),
    };
  }, [score]);

  return (
    <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-3.5 custom-scrollbar text-text-main select-text">
      {/* 1. Scene Title & Directorial Premise Card */}
      <div className="p-3.5 rounded-2xl bg-surface border border-border-main shadow-xs space-y-2">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent-primary font-bold">
            Scene Brief
          </span>
          <h2 className="text-base font-bold font-sans text-text-main leading-snug">
            {score.title}
          </h2>
          {score.subtitle && (
            <p className="text-xs font-sans text-text-muted leading-relaxed">
              {score.subtitle}
            </p>
          )}
        </div>

        {score.description ? (
          <div className="pt-2 border-t border-border-subtle text-xs text-text-body font-sans leading-relaxed space-y-1.5 prose dark:prose-invert max-w-none text-[11.5px]">
            <ReactMarkdown>{score.description}</ReactMarkdown>
          </div>
        ) : null}
      </div>

      {/* 2. Optical & Production Specs Grid */}
      <div className="p-3 rounded-2xl bg-surface border border-border-main shadow-xs space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted font-bold block">
          Production Specifications
        </span>

        {/* 4-Stat Metric Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Duration
            </span>
            <span className="font-bold text-text-main">
              {durationSec.toFixed(1)}s
            </span>
          </div>

          <div className="p-2 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> Shots
            </span>
            <span className="font-bold text-text-main">{shotCount}</span>
          </div>

          <div className="p-2 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Video className="w-2.5 h-2.5" /> Film Gate
            </span>
            <span className="font-bold text-text-main">
              {formatAspectRatio(score.aspectRatio)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-0.5">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <MediaIcon className="w-2.5 h-2.5" /> Engine
            </span>
            <span className="font-bold text-text-main truncate">
              {mediaBadge.label}
            </span>
          </div>
        </div>

        {/* Prime Lens Package */}
        {lenses.length > 0 && (
          <div className="space-y-1 pt-1.5 border-t border-border-subtle">
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1 font-semibold">
              <Aperture className="w-2.5 h-2.5 text-amber-500" />
              <span>Prime Lens Package</span>
            </span>
            <div className="flex flex-wrap gap-1 text-[10.5px] font-mono">
              {lenses.map((lens) => (
                <span
                  key={lens}
                  className="px-2 py-0.5 rounded-lg bg-surface-subtle border border-border-main text-text-main font-semibold"
                >
                  {lens}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Camera Maneuver Repertoire */}
        {maneuvers.length > 0 && (
          <div className="space-y-1 pt-1.5 border-t border-border-subtle">
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1 font-semibold">
              <Compass className="w-2.5 h-2.5 text-sky-500" />
              <span>Camera Maneuvers</span>
            </span>
            <div className="flex flex-wrap gap-1 text-[10.5px] font-mono">
              {maneuvers.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-lg bg-surface-subtle border border-border-main text-text-muted"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Categorized Cast & Props Lineup */}
      <div className="p-3 rounded-2xl bg-surface border border-border-main shadow-xs">
        <SceneEntityRoster entities={score.entities} />
      </div>
    </div>
  );
};

