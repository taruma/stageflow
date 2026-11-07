/**
 * Dedicated Full-Page Markdown + LaTeX Documentation Viewer.
 * Mounted when ?mode=guide or ?mode=spec is present in the URL.
 * Renders docs/YAML_AUTHORING_GUIDE.md or docs/STAGEFLOW_SCRIPT_SPECIFICATION.md
 * with zero WebGL diorama, video player, or transport deck overhead.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ArrowLeft, BookOpen, Compass, FileText, Search } from 'lucide-react';
import 'katex/dist/katex.min.css';
import yamlAuthoringGuideRaw from '../../../docs/YAML_AUTHORING_GUIDE.md?raw';
import scriptSpecificationRaw from '../../../docs/STAGEFLOW_SCRIPT_SPECIFICATION.md?raw';
import { useAppShellTheme } from '../../hooks/useAppShellTheme';
import { ThemeSelectorDropdown } from '../header/ThemeSelectorDropdown';
import {
  GUIDE_DOC_SHORTCUTS,
  type GuideDocType,
} from './guideUtils';
import { createGuideMarkdownComponents } from './guideMarkdownComponents';

export interface ScoreAuthoringGuideViewProps {
  initialDoc?: GuideDocType;
}

export const ScoreAuthoringGuideView: React.FC<ScoreAuthoringGuideViewProps> = ({
  initialDoc,
}) => {
  const theme = useAppShellTheme();
  const [activeDoc, setActiveDoc] = useState<GuideDocType>(() => {
    if (initialDoc) return initialDoc;
    if (typeof window !== 'undefined') {
      const mode = new URLSearchParams(window.location.search).get('mode');
      if (mode === 'spec') return 'spec';
    }
    return 'guide';
  });
  const [filterQuery, setFilterQuery] = useState('');

  const currentRawDoc = activeDoc === 'spec' ? scriptSpecificationRaw : yamlAuthoringGuideRaw;

  const displayedContent = useMemo(() => {
    if (!filterQuery.trim()) return currentRawDoc;
    const query = filterQuery.toLowerCase();
    const lines = currentRawDoc.split('\n');
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
  }, [currentRawDoc, filterQuery]);

  const handleSwitchDoc = (nextDoc?: GuideDocType, anchor?: string) => {
    if (nextDoc && nextDoc !== activeDoc) {
      setActiveDoc(nextDoc);
      setFilterQuery('');
      const url = new URL(window.location.href);
      url.searchParams.set('mode', nextDoc);
      window.history.replaceState({}, '', url.pathname + url.search);
    }
    if (anchor) {
      setTimeout(() => {
        handleJumpToSection(anchor);
      }, 50);
    } else if (nextDoc && nextDoc !== activeDoc) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleJumpToSection = (targetId: string) => {
    const jump = () => {
      const el =
        document.getElementById(targetId) ||
        document.querySelector(`[data-slug="${targetId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (filterQuery.trim()) {
      setFilterQuery('');
      setTimeout(jump, 60);
    } else {
      jump();
    }
  };

  const handleCloseOrReturn = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.location.href = url.pathname + url.search;
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', 'guide');
    document.body.classList.remove('overflow-hidden');
    return () => {
      document.documentElement.removeAttribute('data-mode');
      document.body.classList.add('overflow-hidden');
    };
  }, []);

  const markdownComponents = useMemo(
    () => createGuideMarkdownComponents({ onSwitchDoc: handleSwitchDoc }),
    [activeDoc]
  );
  const currentShortcuts = GUIDE_DOC_SHORTCUTS[activeDoc];

  return (
    <div className="min-h-screen w-full bg-app text-text-main flex flex-col font-sans selection:bg-amber-500/20 select-text">
      {/* 1. Directorial Header Bar */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border-main flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            {activeDoc === 'spec' ? <FileText className="w-4 h-4 text-sky-400" /> : <Compass className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-text-main leading-tight truncate">
              {activeDoc === 'spec' ? 'StageFlow Script Technical Specification' : 'StageFlow YAML Score Authoring Manual'}
            </h1>
            <span className="text-[10px] font-mono text-text-muted truncate block">
              {activeDoc === 'spec' ? 'docs/STAGEFLOW_SCRIPT_SPECIFICATION.md · Mathematical Model' : 'docs/YAML_AUTHORING_GUIDE.md · Standalone Reference'}
            </span>
          </div>
        </div>

        {/* Center/Right Actions: Doc Switcher, Theme Switcher, Studio Return */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Document Switcher Segmented Control */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-muted border border-border-main text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleSwitchDoc('spec')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeDoc === 'spec'
                  ? 'bg-surface text-sky-400 font-bold shadow-2xs border border-border-main'
                  : 'text-text-muted hover:text-text-main'
              }`}
              title="View StageFlow Script Technical & Mathematical Specification"
            >
              <FileText className="w-3 h-3" />
              <span>SPEC</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDoc('guide')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeDoc === 'guide'
                  ? 'bg-surface text-amber-500 font-bold shadow-2xs border border-border-main'
                  : 'text-text-muted hover:text-text-main'
              }`}
              title="View YAML Score Authoring Manual & Recipes"
            >
              <BookOpen className="w-3 h-3" />
              <span>Guide</span>
            </button>
          </div>

          <ThemeSelectorDropdown
            themeMode={theme.themeMode}
            effectiveCategory={theme.effectiveCategory}
            onSelectThemeMode={theme.setThemeMode}
          />

          <button
            type="button"
            onClick={handleCloseOrReturn}
            className="px-3 py-1.5 rounded-xl border border-border-main bg-surface hover:bg-surface-hover text-text-body hover:text-text-main text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Return to StageFlow Studio or close tab"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Studio</span>
          </button>
        </div>
      </header>

      {/* 2. Tactical Quick Jump & Search Sticky Rail */}
      <div className="sticky top-14 z-20 px-4 sm:px-6 py-2.5 bg-surface-subtle/95 backdrop-blur-md border-b border-border-subtle flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={`Search ${activeDoc === 'spec' ? 'spec' : 'guide'} (e.g. arc, roll, 85mm)...`}
            className="w-full pl-8 pr-2.5 py-1 text-xs font-mono bg-surface border border-border-main rounded-md text-text-main placeholder-text-muted focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar text-[11px] font-mono">
          {currentShortcuts.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleJumpToSection(sec.id)}
              className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-hover border border-border-main text-text-muted hover:text-text-main transition-all shrink-0 cursor-pointer active:scale-95 shadow-2xs"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Centered Markdown Reading Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 select-text">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {displayedContent}
        </ReactMarkdown>
      </main>
    </div>
  );
};
