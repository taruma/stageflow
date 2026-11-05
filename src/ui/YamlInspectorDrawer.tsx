/**
 * Slide-Out Right-Hand YAML Score Inspector & Live Editor Drawer.
 * Re-evaluates the 3D choreography diorama in real time as valid YAML edits are made.
 * Enforces Read-Only protection for bundled presets with 1-click Forking into Custom Projects.
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
    <aside className="fixed top-12 bottom-0 right-0 w-[440px] max-w-[calc(100vw-1rem)] bg-[#070b16]/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col z-40">
      {/* Drawer Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-slate-100 flex items-center gap-1.5">
              <span>Live YAML Choreography Score</span>
              {isBundled && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Read-Only
                </span>
              )}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Meters (m) · Degrees (deg) · Lens (mm)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openGuideInNewTab}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-sky-500/20 border border-slate-800 hover:border-sky-500/40 text-[10px] font-mono text-sky-300 hover:text-white flex items-center gap-1 cursor-pointer"
            title="Open StageFlow YAML Authoring Manual in new tab"
          >
            <BookOpen className="w-3 h-3 text-sky-400" />
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
            title="Copy full YAML score"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-amber-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Fork Button for Bundled presets vs. Duplicate for Custom projects */}
          {onForkScore && (
            <button
              type="button"
              onClick={onForkScore}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                isBundled
                  ? 'bg-sky-600 hover:bg-sky-500 border border-sky-400/40 text-white shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
              }`}
              title={
                isBundled
                  ? 'Fork this bundled blueprint into an editable Custom Project'
                  : 'Duplicate this custom project into a new copy'
              }
            >
              <GitFork className="w-3 h-3 text-sky-300" />
              <span>{isBundled ? 'Fork to Edit' : 'Duplicate'}</span>
            </button>
          )}

          {!isBundled && (
            <button
              type="button"
              onClick={onResetDefault}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              title="Reset YAML score"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bundled Read-Only Banner */}
      {isBundled && (
        <div className="px-3.5 py-2 bg-sky-950/40 border-b border-sky-500/30 flex items-center justify-between text-xs font-mono text-sky-200 select-none">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px]">Bundled Preset (Read-Only)</span>
          </div>
          {onForkScore && (
            <button
              type="button"
              onClick={onForkScore}
              className="text-[10px] text-sky-300 hover:text-white underline cursor-pointer font-bold"
            >
              Fork as Custom Project →
            </button>
          )}
        </div>
      )}

      {/* Syntax Status / Error / Warning Banner */}
      {parseError ? (
        <div className="px-3.5 py-2 bg-rose-950/80 border-b border-rose-500/40 flex items-start gap-2 text-xs font-mono text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 break-words text-[11px]">
            {parseError}
          </div>
        </div>
      ) : (
        <>
          <div className="px-3.5 py-1.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-300/90 select-none">
            <div className="flex items-center gap-2">
              <span>● Live Sync Active</span>
              <StorageStatusBadge status={storageStatus} />
            </div>
            <span className="text-slate-500">Frame_t = f(t)</span>
          </div>
          {parseWarning && (
            <div className="px-3.5 py-1.5 bg-amber-950/40 border-b border-amber-500/30 flex items-start gap-2 text-[11px] font-mono text-amber-200/90">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
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
        className={`flex-1 w-full p-3.5 bg-[#050811] font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar ${
          isBundled
            ? 'text-slate-300 cursor-default select-text'
            : 'text-slate-100 cursor-text'
        }`}
      />
    </aside>
  );
};
