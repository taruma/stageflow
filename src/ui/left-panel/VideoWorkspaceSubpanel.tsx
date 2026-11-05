/**
 * VideoWorkspaceSubpanel Component.
 * Modular, decoupled subpanel mounted directly beneath the reference video in the left column.
 * Provides a dedicated directorial workspace for active shot context, notes, and an optional Stage Cam monitor.
 * Supports independent collapse/expand states with SceneFlow tactile tokens.
 */

import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Film,
  Sparkles,
  Camera,
  FileText,
} from 'lucide-react';
import type { ShotCue, StageScore } from '../../core/types';

export type SubpanelViewMode = 'notes' | 'stage-cam';

export interface VideoWorkspaceSubpanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  score: StageScore;
  activeShot?: ShotCue | null;
  shotIndex?: number;
  hasVideoAttached?: boolean;
  viewMode?: SubpanelViewMode;
  onSelectViewMode?: (mode: SubpanelViewMode) => void;
  stageCamSlot?: React.ReactNode;
}

export const VideoWorkspaceSubpanel: React.FC<VideoWorkspaceSubpanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  score,
  activeShot,
  shotIndex = 0,
  hasVideoAttached = false,
  viewMode = 'notes',
  onSelectViewMode,
  stageCamSlot,
}) => {
  const shotNum = String(shotIndex + 1).padStart(2, '0');
  const shotLabel = activeShot?.label || 'Directorial Workspace';
  const maneuver =
    activeShot?.stageCamera?.maneuver?.toUpperCase() || 'HOLD';
  const startSec = activeShot?.startSec ?? 0;
  const endSec = activeShot?.endSec ?? 0;
  const durationSec = Math.max(0, endSec - startSec);
  const targetLabel =
    typeof activeShot?.stageCamera?.target === 'string'
      ? activeShot.stageCamera.target
      : 'stage';

  return (
    <div className="w-full h-full flex flex-col bg-surface border-t border-border-main overflow-hidden text-text-main select-none">
      {/* Subpanel Header Bar (click anywhere outside buttons to toggle collapse/expand) */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
        className="h-9 px-3 bg-surface-subtle hover:bg-surface border-b border-border-subtle flex items-center justify-between gap-2 shrink-0 cursor-pointer select-none transition-colors group focus:outline-none focus:ring-1 focus:ring-accent-primary/40"
        title={
          isCollapsed
            ? 'Click to expand Directorial Workspace'
            : 'Click to collapse Subpanel'
        }
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-accent-primary shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-text-main uppercase truncate group-hover:text-accent-primary transition-colors">
            Directorial Workspace
          </span>

          {/* Source/View Toggle Pill — Only visible when a video is attached */}
          {hasVideoAttached && onSelectViewMode && (
            <div
              role="group"
              aria-label="Directorial View Mode"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center p-0.5 rounded-lg bg-surface border border-border-main text-[9px] font-mono font-bold shrink-0 ml-1"
            >
              <button
                type="button"
                role="button"
                aria-pressed={viewMode === 'notes'}
                onClick={() => onSelectViewMode('notes')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'notes'
                    ? 'bg-surface-muted text-text-main shadow-2xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
                title="Show Directorial Notes & Cue Context"
              >
                <FileText className="w-2.5 h-2.5" />
                <span>Notes</span>
              </button>

              <button
                type="button"
                role="button"
                aria-pressed={viewMode === 'stage-cam'}
                onClick={() => onSelectViewMode('stage-cam')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'stage-cam'
                    ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-2xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
                title="Show 3D Stage Camera POV Simulator"
              >
                <Camera className="w-2.5 h-2.5" />
                <span>Stage Cam</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="p-1 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text-main transition-colors shrink-0 cursor-pointer"
          title={
            isCollapsed
              ? 'Expand Directorial Workspace'
              : 'Collapse Subpanel'
          }
          aria-expanded={!isCollapsed}
          aria-label={
            isCollapsed
              ? 'Expand Directorial Workspace'
              : 'Collapse Subpanel'
          }
        >
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Subpanel Content Body (visible when not collapsed) */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-app">
          {viewMode === 'stage-cam' && stageCamSlot ? (
            /* Mode A: True 3D Stage Cam POV Simulator */
            <div className="w-full h-full flex flex-col items-center justify-center p-2 min-h-0 overflow-hidden">
              {stageCamSlot}
            </div>
          ) : (
            /* Mode B: Directorial Notes & Telemetry */
            <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5 custom-scrollbar">
              {/* Active Shot Directorial Card */}
              <div className="p-3 rounded-xl bg-surface border border-border-main shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-accent-primary">
                    #{shotNum} · {shotLabel}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-faint uppercase font-bold tracking-wider">
                    {maneuver}
                  </span>
                </div>

                {activeShot?.description ? (
                  <p className="text-xs text-text-body font-sans leading-relaxed">
                    {activeShot.description}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted font-sans italic leading-relaxed">
                    Scene: &ldquo;{score.title}&rdquo; · Total shots: {score.shots.length}
                  </p>
                )}

                {/* Cue Telemetry Summary Bar */}
                <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-faint">
                  <span className="flex items-center gap-1">
                    <Film className="w-3 h-3 text-text-muted" />
                    <span>Start: {startSec.toFixed(1)}s</span>
                  </span>
                  <span>Dur: {durationSec.toFixed(1)}s</span>
                  <span>Target: {targetLabel}</span>
                </div>
              </div>

              {/* Scaffolded Container Ready for Next Design Phase */}
              <div className="p-3 rounded-xl border border-dashed border-border-main bg-surface/50 flex flex-col items-center justify-center text-center gap-1.5 py-4">
                <Sparkles className="w-4 h-4 text-text-faint" />
                <span className="text-[11px] font-medium text-text-muted">
                  Directorial Subpanel Container
                </span>
                <span className="text-[9px] text-text-faint font-mono max-w-[260px]">
                  Ready for customizable shot cue cards, timeline markers, or cast blocking inspector.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
