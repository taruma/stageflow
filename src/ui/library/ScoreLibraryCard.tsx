/**
 * ScoreLibraryCard Component for ScoreLibraryModal.
 * Renders an individual choreography score list item for the Master-Detail library,
 * featuring un-truncated titles, media engine badges, color-coded blueprint tags,
 * and clear active/selected state styling.
 */

import React from 'react';
import { Check, Clock, Layers, Video, Users, ArrowRight, Film, Camera } from 'lucide-react';
import type { ScoreCatalogItem } from '../../core/scoreCatalog';

export interface ScoreLibraryCardProps {
  item: ScoreCatalogItem;
  isActive: boolean;
  isSelected?: boolean;
  onSelect: () => void;
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

interface BlueprintBadgeInfo {
  tag: string;
  badgeClass: string;
  accentBorder: string;
}

function getScoreBadgeInfo(item: ScoreCatalogItem): BlueprintBadgeInfo {
  if (item.id === 'demo-blueprint') {
    return {
      tag: 'BP 01',
      badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-400/30',
      accentBorder: 'border-l-sky-500',
    };
  }
  if (item.id === 'blueprint-02-dialogue' || item.id === 'blueprint_02_dialogue') {
    return {
      tag: 'BP 02',
      badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400/30',
      accentBorder: 'border-l-indigo-500',
    };
  }
  if (item.id === 'blueprint-03-ball-pass' || item.id === 'blueprint_03_ball_pass') {
    return {
      tag: 'BP 03',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
      accentBorder: 'border-l-emerald-500',
    };
  }
  if (item.id === 'blueprint-04-cinematography-tutorial' || item.id === 'blueprint_04_cinematography_tutorial') {
    return {
      tag: 'BP 04',
      badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-400/30',
      accentBorder: 'border-l-violet-500',
    };
  }
  if (item.id === 'blueprint-05-two-rooms' || item.id === 'blueprint_05_two_rooms') {
    return {
      tag: 'BP 05',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/30',
      accentBorder: 'border-l-amber-500',
    };
  }
  return {
    tag: item.isCustom ? 'CUSTOM' : 'SCORE',
    badgeClass: item.isCustom
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-400/30'
      : 'bg-surface-muted text-text-muted border-border-main',
    accentBorder: item.isCustom ? 'border-l-rose-500' : 'border-l-border-main',
  };
}

function getMediaSourceBadge(videoUrl?: string) {
  if (!videoUrl || videoUrl.startsWith('procedural://')) {
    return {
      label: 'Simulator',
      icon: Camera,
      className: 'text-cyan-600 dark:text-cyan-400',
    };
  }
  if (videoUrl.startsWith('youtube://') || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    return {
      label: 'YouTube',
      icon: Film,
      className: 'text-rose-600 dark:text-rose-400',
    };
  }
  return {
    label: 'Video',
    icon: Video,
    className: 'text-amber-600 dark:text-amber-400',
  };
}

export const ScoreLibraryCard: React.FC<ScoreLibraryCardProps> = ({
  item,
  isActive,
  isSelected = false,
  onSelect,
}) => {
  const durationSec = item.score?.durationSec ?? 0;
  const shotCount = item.score?.shots?.length ?? 0;
  const entityCount = item.score?.entities?.length ?? 0;
  const aspectRatio = item.score?.aspectRatio ?? '16:9';
  const badgeInfo = getScoreBadgeInfo(item);
  const mediaBadge = getMediaSourceBadge(item.score?.videoUrl);
  const MediaIcon = mediaBadge.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group relative select-none shadow-2xs border-l-4 ${badgeInfo.accentBorder} ${
        isSelected
          ? 'border-border-main bg-surface-subtle ring-2 ring-text-main/25 shadow-sm'
          : 'border-border-main bg-surface hover:bg-surface-subtle'
      }`}
    >
      {/* Card Header & Content */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Tag & Media Source */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${badgeInfo.badgeClass}`}
            >
              {badgeInfo.tag}
            </span>

            <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${mediaBadge.className}`}>
              <MediaIcon className="w-2.5 h-2.5" />
              <span>{mediaBadge.label}</span>
            </span>
          </div>

          {/* Active or Selected Marker */}
          {isActive ? (
            <span className="text-[9.5px] font-mono bg-btn-primary-bg text-btn-primary-text border border-btn-primary-bg px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 font-bold shadow-2xs">
              <Check className="w-2.5 h-2.5" />
              <span>Active</span>
            </span>
          ) : isSelected ? (
            <span className="text-[10px] font-mono text-text-faint flex items-center gap-1">
              <span>Selected</span>
              <ArrowRight className="w-2.5 h-2.5 text-text-main" />
            </span>
          ) : null}
        </div>

        {/* Un-truncated Title with Natural Wrap */}
        <h3 className="text-sm font-semibold font-sans text-text-main group-hover:text-text-main leading-snug">
          {item.title}
        </h3>

        {item.subtitle && (
          <p className="text-xs font-sans text-text-muted group-hover:text-text-body line-clamp-2 leading-relaxed">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Card Footer: Telemetry Pill Strip */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle text-[10px] font-mono text-text-muted">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border-subtle text-text-body">
          <Clock className="w-2.5 h-2.5 text-text-faint" />
          <span>{durationSec.toFixed(1)}s</span>
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border-subtle text-text-body">
          <Layers className="w-2.5 h-2.5 text-text-faint" />
          <span>{shotCount} {shotCount === 1 ? 'Shot' : 'Shots'}</span>
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border-subtle text-text-body">
          <Video className="w-2.5 h-2.5 text-text-faint" />
          <span>{formatAspectRatio(aspectRatio)}</span>
        </span>
        {entityCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted border border-border-subtle text-text-muted">
            <Users className="w-2.5 h-2.5 text-text-faint" />
            <span>{entityCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};
