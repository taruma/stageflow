/**
 * Slide-Out Right-Hand YAML Score Inspector & Live Editor Drawer.
 * Re-evaluates the 3D choreography diorama in real time as valid YAML edits are made,
 * while surfacing clear syntax diagnostics without crashing on mid-keystroke typos.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  Copy,
  RotateCcw,
  X,
} from 'lucide-react';
import yamlAuthoringGuideRaw from '../../docs/YAML_AUTHORING_GUIDE.md?raw';

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
  onChangeYaml: (newYaml: string) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const YamlInspectorDrawer: React.FC<YamlInspectorDrawerProps> = ({
  isOpen,
  rawYaml,
  parseError,
  onChangeYaml,
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
            <span className="text-xs font-mono font-bold text-slate-100">
              Live YAML Choreography Score
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
            title="Open Stageplay YAML Authoring Manual in new tab"
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

          <button
            type="button"
            onClick={onResetDefault}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            title="Reset YAML score to initial scene preset"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

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

      {/* Syntax Status / Error Banner */}
      {parseError ? (
        <div className="px-3.5 py-2 bg-rose-950/80 border-b border-rose-500/40 flex items-start gap-2 text-xs font-mono text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 break-words text-[11px]">
            {parseError}
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-1.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-300/90 select-none">
          <span>● Live Sync Active — Edits immediately update 3D stage</span>
          <span className="text-slate-500">Frame_t = f(t)</span>
        </div>
      )}

      {/* Monospace Editable Textarea */}
      <textarea
        value={rawYaml}
        onChange={(e) => onChangeYaml(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full p-3.5 bg-[#050811] text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none custom-scrollbar"
      />
    </aside>
  );
};
