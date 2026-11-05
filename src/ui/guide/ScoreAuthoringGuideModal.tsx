/**
 * Interactive In-App Score Authoring Guide Modal for StageFlow.
 * Renders docs/YAML_AUTHORING_GUIDE.md with Markdown tables, code blocks,
 * and KaTeX LaTeX math support without external tab redirects.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { BookOpen, Search, X } from 'lucide-react';
import 'katex/dist/katex.min.css';
import yamlAuthoringGuideRaw from '../../../docs/YAML_AUTHORING_GUIDE.md?raw';
import { UI_TOKENS } from '../tokens/ui';

export interface ScoreAuthoringGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_SHORTCUTS = [
  { label: 'Rules', id: 'the-5-golden-rules-of-stageflow-yaml' },
  { label: 'Coordinates', id: '2-3d-stage-coordinate-system--compass' },
  { label: 'Schema', id: '3-root-header--stage-setup-schema' },
  { label: 'Optics & Maneuvers', id: '4-camera-optics-lenses--shot-cues' },
  { label: 'Blocking', id: '5-entity-blocking--spatial-staging' },
  { label: 'Recipes', id: '8-copy-paste-cinematography-recipes' },
];

export const ScoreAuthoringGuideModal: React.FC<ScoreAuthoringGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const displayedContent = useMemo(() => {
    if (!filterQuery.trim()) return yamlAuthoringGuideRaw;
    const query = filterQuery.toLowerCase();
    const lines = yamlAuthoringGuideRaw.split('\n');
    const matchedIndices: number[] = [];

    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(query)) matchedIndices.push(idx);
    });

    if (matchedIndices.length === 0) {
      return `_No matches found for **"${filterQuery}"**. Try searching for coordinate axes, maneuver names, or lenses._`;
    }

    const contextLines = new Set<number>();
    matchedIndices.forEach((idx) => {
      for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 2); i++) {
        contextLines.add(i);
      }
    });

    const sorted = Array.from(contextLines).sort((a, b) => a - b);
    const result: string[] = [`_Found ${matchedIndices.length} matches for **"${filterQuery}"**:_\n\n---`];
    let lastIdx = -1;

    sorted.forEach((idx) => {
      if (lastIdx !== -1 && idx > lastIdx + 1) result.push('\n`...`\n');
      result.push(lines[idx]);
      lastIdx = idx;
    });

    return result.join('\n');
  }, [filterQuery]);

  const handleJumpToSection = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className={UI_TOKENS.modal.overlay}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl h-[92vh] sm:h-[88vh] bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-main text-text-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={UI_TOKENS.modal.header}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="guide-modal-title" className="text-sm font-bold font-sans text-text-main leading-tight truncate">
                Choreography Score Authoring Manual
              </h2>
              <span className="text-[11px] font-sans text-text-muted truncate block">
                Coordinate rules, lens optics, camera trajectories, and YAML syntax
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className={UI_TOKENS.button.iconClose} title="Close Guide (Esc)">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Search & Quick Section Jump Bar */}
        <div className="px-4 py-2 border-b border-border-subtle bg-surface flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search guide (e.g. arc, roll, 85mm)..."
              className="w-full pl-8 pr-2.5 py-1 text-xs font-mono bg-surface-subtle border border-border-main rounded-md text-text-main placeholder-text-muted focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar text-[10px] font-mono">
            {SECTION_SHORTCUTS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleJumpToSection(sec.id)}
                className="px-2 py-0.5 rounded bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-main transition-colors shrink-0 cursor-pointer active:scale-95"
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Markdown Document Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar bg-surface select-text">
          <div className="max-w-none text-text-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold font-sans text-text-main mt-6 mb-3 pb-2 border-b border-border-subtle flex items-center gap-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return (
                    <h2 id={id} className="text-sm font-bold font-sans text-text-main mt-5 mb-2 pb-1 border-b border-border-subtle/40">
                      {children}
                    </h2>
                  );
                },
                h3: ({ children }) => (
                  <h3 className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 mt-4 mb-1.5 uppercase tracking-wide">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-xs font-sans text-text-body leading-relaxed my-2">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2 text-xs text-text-body pl-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2 text-xs text-text-body pl-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-xs text-text-body leading-relaxed">{children}</li>,
                table: ({ children }) => (
                  <div className="w-full overflow-x-auto my-3 rounded-lg border border-border-main bg-surface-subtle">
                    <table className="w-full text-left border-collapse text-xs font-mono">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-surface-muted text-text-main text-[11px] border-b border-border-main">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 font-bold text-text-main">{children}</th>,
                td: ({ children }) => <td className="px-3 py-1.5 border-b border-border-subtle/50 text-[11px] text-text-body">{children}</td>,
                code: ({ className, children }) => {
                  const isBlock = Boolean(className);
                  if (isBlock) {
                    return (
                      <pre className="p-3 my-2.5 rounded-xl bg-app border border-border-main font-mono text-[11px] text-text-main overflow-x-auto leading-relaxed shadow-inner">
                        <code>{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.2 rounded bg-surface-subtle text-amber-600 dark:text-amber-400 font-mono text-[11px] border border-border-subtle">
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-r-md my-2 text-xs italic text-text-body">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-5 border-t border-border-subtle" />,
              }}
            >
              {displayedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
