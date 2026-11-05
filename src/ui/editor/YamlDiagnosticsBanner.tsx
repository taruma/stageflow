/**
 * Sticky Status & Diagnostics Banner for the YAML Score Editor.
 * Displays Read-Only notifications for bundled presets, syntax diagnostics with exact
 * line/column locations and 1-click jump actions, and live synchronization status.
 */

import React from 'react';
import { AlertTriangle, ArrowRight, CornerDownRight, Lock } from 'lucide-react';
import type { ScoreDiagnostic } from '../../core/types';
import {
  StorageStatusBadge,
  type StoragePersistenceStatus,
} from '../StorageStatusBadge';

export interface YamlDiagnosticsBannerProps {
  isBundled: boolean;
  parseError: string | null;
  parseWarning?: string | null;
  diagnostics?: ScoreDiagnostic[];
  storageStatus?: StoragePersistenceStatus;
  onForkScore?: () => void;
  onJumpToLine?: (line: number, column?: number) => void;
}

export const YamlDiagnosticsBanner: React.FC<YamlDiagnosticsBannerProps> =
  React.memo(
    ({
      isBundled,
      parseError,
      parseWarning,
      diagnostics,
      storageStatus = 'bundled',
      onForkScore,
      onJumpToLine,
    }) => {
      const primaryDiagnostic = diagnostics?.[0];

      return (
        <div className="flex flex-col shrink-0 select-none">
          {/* 1. Bundled Read-Only Alert Banner */}
          {isBundled && (
            <div className="px-4 py-2 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between text-xs font-mono text-sky-700 dark:text-sky-300">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="text-[11px] font-medium">
                  Bundled Preset (Read-Only)
                </span>
              </div>
              {onForkScore && (
                <button
                  type="button"
                  onClick={onForkScore}
                  className="text-[10px] text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-200 underline underline-offset-2 cursor-pointer font-bold flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span>Fork to Edit</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 2. Syntax Diagnostics or Live Status */}
          {parseError ? (
            <div className="px-4 py-2.5 bg-rose-500/15 border-b border-rose-500/30 flex items-start gap-2.5 text-xs font-mono text-rose-700 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-[11px] text-rose-800 dark:text-rose-300">
                    Syntax Error
                  </span>
                  {primaryDiagnostic && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-200 border border-rose-500/30 font-semibold">
                      Line {primaryDiagnostic.line}
                      {primaryDiagnostic.column
                        ? `, Col ${primaryDiagnostic.column}`
                        : ''}
                    </span>
                  )}
                  {primaryDiagnostic && onJumpToLine && (
                    <button
                      type="button"
                      onClick={() =>
                        onJumpToLine(
                          primaryDiagnostic.line,
                          primaryDiagnostic.column
                        )
                      }
                      className="px-1.5 py-0.2 rounded text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs active:scale-95"
                      title="Jump cursor to this line in CodeMirror"
                    >
                      <CornerDownRight className="w-2.5 h-2.5" />
                      <span>Jump</span>
                    </button>
                  )}
                </div>
                <div className="break-words text-[11px] leading-relaxed opacity-90 line-clamp-3">
                  {parseError}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-1.5 bg-surface-subtle border-b border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Sync Active</span>
                  </span>
                  <StorageStatusBadge status={storageStatus} />
                </div>
                <span className="text-text-faint text-[9px]">Frame_t = f(t)</span>
              </div>
              {parseWarning && (
                <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-start gap-2 text-[11px] font-mono text-amber-700 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 break-words leading-relaxed">
                    {parseWarning}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
  );
