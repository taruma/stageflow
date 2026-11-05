/**
 * Slide-Out Right-Hand YAML Score Inspector & Live Editor Drawer.
 * Re-evaluates the 3D choreography diorama in real time as valid YAML edits are made.
 * Enforces Read-Only protection for bundled presets with 1-click Forking into Custom Projects.
 * Styled with SceneFlow tactile design tokens.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  Copy,
  GitFork,
  Lock,
  RotateCcw,
  X,
} from 'lucide-react';
import yamlAuthoringGuideRaw from '../../docs/YAML_AUTHORING_GUIDE.md?raw';
import {
  StorageStatusBadge,
  type StoragePersistenceStatus,
} from './StorageStatusBadge';
import { UI_TOKENS } from './tokens/ui';

function openGuideInNewTab() {
  const blob = new Blob([yamlAuthoringGuideRaw], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export interface YamlInspectorDrawerProps {
  isOpen: boolean;
  rawYaml: string;
  parseError: string | null;
  parseWarning?: string | null;
  storageStatus?: StoragePersistenceStatus;
  isBundled?: boolean;
  onChangeYaml: (newYaml: string) => void;
  onForkScore?: () => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const YamlInspectorDrawer: React.FC<YamlInspectorDrawerProps> = ({
  isOpen,
  rawYaml,
  parseError,
  parseWarning,
  storageStatus = 'bundled',
  isBundled = false,
  onChangeYaml,
  onForkScore,
  onResetDefault,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    navigator.clipboard.writeText(rawYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <aside className="w-full h-full bg-surface border-l border-border-main flex flex-col text-text-main overflow-hidden">
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-border-main flex items-center justify-between gap-2 select-none bg-surface-subtle">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-text-main flex items-center gap-1.5 leading-none">
              <span>Live YAML Score</span>
              {isBundled && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-400/30">
                  Read-Only
                </span>
              )}
            </span>
            <span className="text-[10px] font-mono text-text-muted mt-1 leading-none">
              Meters (m) · Degrees (deg) · Lens (mm)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openGuideInNewTab}
            className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border-main text-[10px] font-mono text-text-body hover:text-text-main flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Open StageFlow YAML Authoring Manual in new tab"
          >
            <BookOpen className="w-3 h-3 text-text-muted" />
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border-main text-[10px] font-mono text-text-body hover:text-text-main flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Copy full YAML score"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-text-muted" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Fork Button for Bundled presets vs. Duplicate for Custom projects */}
          {onForkScore && (
            <button
              type="button"
              onClick={onForkScore}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                isBundled
                  ? 'bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover font-semibold'
                  : 'bg-surface hover:bg-surface-hover border border-border-main text-text-body'
              }`}
              title={
                isBundled
                  ? 'Fork this bundled blueprint into an editable Custom Project'
                  : 'Duplicate this custom project into a new copy'
              }
            >
              <GitFork className="w-3 h-3" />
              <span>{isBundled ? 'Fork to Edit' : 'Duplicate'}</span>
            </button>
          )}

          {!isBundled && (
            <button
              type="button"
              onClick={onResetDefault}
              className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border-main text-[10px] font-mono text-text-muted hover:text-text-main flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
              title="Reset YAML score"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.button.iconClose}
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bundled Read-Only Banner */}
      {isBundled && (
        <div className="px-4 py-2 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between text-xs font-mono text-sky-700 dark:text-sky-300 select-none">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="text-[11px]">Bundled Preset (Read-Only)</span>
          </div>
          {onForkScore && (
            <button
              type="button"
              onClick={onForkScore}
              className="text-[10px] text-sky-600 dark:text-sky-300 hover:underline cursor-pointer font-bold"
            >
              Fork as Custom Project →
            </button>
          )}
        </div>
      )}

      {/* Syntax Status / Error / Warning Banner */}
      {parseError ? (
        <div className="px-4 py-2.5 bg-rose-500/15 border-b border-rose-500/30 flex items-start gap-2 text-xs font-mono text-rose-700 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 break-words text-[11px]">
            {parseError}
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-1.5 bg-surface-subtle border-b border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-muted select-none">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">● Live Sync Active</span>
              <StorageStatusBadge status={storageStatus} />
            </div>
            <span className="text-text-faint">Frame_t = f(t)</span>
          </div>
          {parseWarning && (
            <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-start gap-2 text-[11px] font-mono text-amber-700 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 break-words">
                {parseWarning}
              </div>
            </div>
          )}
        </>
      )}

      {/* Monospace Textarea (readOnly for bundled, editable for custom) */}
      <textarea
        value={rawYaml}
        onChange={(e) => {
          if (!isBundled) {
            onChangeYaml(e.target.value);
          }
        }}
        readOnly={isBundled}
        spellCheck={false}
        className={`flex-1 w-full p-4 bg-app font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar ${
          isBundled
            ? 'text-text-muted cursor-default select-text'
            : 'text-text-main cursor-text'
        }`}
      />
    </aside>
  );
};
