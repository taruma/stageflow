/**
 * ScoreLibraryCard Component for ScoreLibraryModal.
 * Renders an individual choreography score card with cinematic metadata,
 * color-coded blueprint tags, formatted aspect ratio, and interactive hover states.
 * Styled with SceneFlow tactile card design tokens.
 */

import React from 'react';
import { Check, Clock, Layers, Video, Users, ArrowRight } from 'lucide-react';
import type { ScoreCatalogItem } from '../../core/scoreCatalog';

export interface ScoreLibraryCardProps {
  item: ScoreCatalogItem;
  isActive: boolean;
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
}

function getScoreBadgeInfo(item: ScoreCatalogItem): BlueprintBadgeInfo {
  if (item.id === 'demo-blueprint') {
    return {
      tag: 'BP 01',
      badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-400/30',
    };
  }
  if (item.id === 'blueprint-02-dialogue' || item.id === 'blueprint_02_dialogue') {
    return {
      tag: 'BP 02',
      badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400/30',
    };
  }
  if (item.id === 'blueprint-03-ball-pass' || item.id === 'blueprint_03_ball_pass') {
    return {
      tag: 'BP 03',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
    };
  }
  if (item.id === 'blueprint-04-cinematography-tutorial' || item.id === 'blueprint_04_cinematography_tutorial') {
    return {
      tag: 'BP 04',
      badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-400/30',
    };
  }
  if (item.id === 'blueprint-05-two-rooms' || item.id === 'blueprint_05_two_rooms') {
    return {
      tag: 'BP 05',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/30',
    };
  }
  return {
    tag: item.isCustom ? 'CUSTOM' : 'SCORE',
    badgeClass: item.isCustom
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-400/30'
      : 'bg-surface-muted text-text-muted border-border-main',
  };
}

export const ScoreLibraryCard: React.FC<ScoreLibraryCardProps> = ({
  item,
  isActive,
  onSelect,
}) => {
  const durationSec = item.score?.durationSec ?? 0;
  const shotCount = item.score?.shots?.length ?? 0;
  const entityCount = item.score?.entities?.length ?? 0;
  const aspectRatio = item.score?.aspectRatio ?? '16:9';
  const badgeInfo = getScoreBadgeInfo(item);

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
      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group relative select-none shadow-xs hover:shadow-md ${
        isActive
          ? 'border-border-main bg-surface-subtle ring-2 ring-text-main/20'
          : 'border-border-main bg-surface hover:bg-surface-subtle'
      }`}
    >
      {/* Card Header & Content */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 uppercase tracking-wider ${badgeInfo.badgeClass}`}
            >
              {badgeInfo.tag}
            </span>
            <h3 className="text-sm font-semibold font-sans text-text-main group-hover:text-text-main transition-colors truncate">
              {item.title}
            </h3>
          </div>

          {isActive ? (
            <span className="text-[10px] font-mono bg-btn-primary-bg text-btn-primary-text border border-btn-primary-bg px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 font-bold shadow-xs">
              <Check className="w-3 h-3" />
              <span>Active</span>
            </span>
          ) : (
            <span className="text-[11px] font-sans text-text-faint group-hover:text-text-main flex items-center gap-1 transition-colors shrink-0">
              <span className="hidden sm:inline">Open</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>

        {item.subtitle && (
          <p className="text-xs font-sans text-text-muted group-hover:text-text-body line-clamp-2 leading-relaxed">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Card Footer: Telemetry Pill Strip */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-border-subtle text-[10px] font-mono text-text-muted">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted border border-border-main text-text-body">
          <Clock className="w-3 h-3 text-text-faint" />
          <span>{durationSec.toFixed(1)}s</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted border border-border-main text-text-body">
          <Layers className="w-3 h-3 text-text-faint" />
          <span>
            {shotCount} {shotCount === 1 ? 'Shot' : 'Shots'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted border border-border-main text-text-body">
          <Video className="w-3 h-3 text-text-faint" />
          <span>{formatAspectRatio(aspectRatio)}</span>
        </span>
        {entityCount > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted border border-border-main text-text-muted">
            <Users className="w-3 h-3 text-text-faint" />
            <span>
              {entityCount} {entityCount === 1 ? 'Entity' : 'Entities'}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
