/**
 * Streamlined Header Toolbar for the YAML Score Editor Studio.
 * Houses title, status indicators, and essential editorial utilities (Guide, Copy, Close).
 * Redundant project-level actions (Duplicate, Reset) are omitted as they reside in the Score Library.
 */

import React, { useState, useCallback } from 'react';
import { BookOpen, Check, Code2, Copy, WrapText, X } from 'lucide-react';
import yamlAuthoringGuideRaw from '../../../docs/YAML_AUTHORING_GUIDE.md?raw';
import { UI_TOKENS } from '../tokens/ui';

export interface YamlEditorHeaderProps {
  rawYaml: string;
  isBundled: boolean;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  onClose: () => void;
}

function openGuideInNewTab() {
  const blob = new Blob([yamlAuthoringGuideRaw], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export const YamlEditorHeader: React.FC<YamlEditorHeaderProps> = React.memo(
  ({ rawYaml, isBundled, wordWrap, onToggleWordWrap, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyAll = useCallback(() => {
      navigator.clipboard.writeText(rawYaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }, [rawYaml]);

    return (
      <div className="px-4 py-3 border-b border-border-main flex items-center justify-between gap-2 select-none bg-surface-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-amber-500 shrink-0" />
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
            onClick={onToggleWordWrap}
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 ${
              wordWrap
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium'
                : 'bg-surface hover:bg-surface-hover border-border-main text-text-body hover:text-text-main'
            }`}
            title={wordWrap ? 'Disable soft line-wrapping' : 'Enable soft line-wrapping'}
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap</span>
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
                <span className="text-emerald-600 dark:text-emerald-300">
                  Copied
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-text-muted" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={UI_TOKENS.button.iconClose}
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);
