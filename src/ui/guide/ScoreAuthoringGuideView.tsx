/**
 * Dedicated Full-Page Markdown + LaTeX Score Authoring Guide View.
 * Mounted when ?mode=guide is present in the URL.
 * Renders docs/YAML_AUTHORING_GUIDE.md with zero WebGL diorama, video player,
 * or transport deck overhead.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ArrowLeft, BookOpen, Compass, Search } from 'lucide-react';
import 'katex/dist/katex.min.css';
import yamlAuthoringGuideRaw from '../../../docs/YAML_AUTHORING_GUIDE.md?raw';
import { useAppShellTheme } from '../../hooks/useAppShellTheme';
import { ThemeSelectorDropdown } from '../header/ThemeSelectorDropdown';
import {
  SECTION_SHORTCUTS,
  getNodeText,
  slugify,
} from './guideUtils';

export const ScoreAuthoringGuideView: React.FC = () => {
  const theme = useAppShellTheme();
  const [filterQuery, setFilterQuery] = useState('');

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

  return (
    <div className="min-h-screen w-full bg-app text-text-main flex flex-col font-sans selection:bg-amber-500/20 select-text">
      {/* 1. Directorial Header Bar */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border-main flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-text-main leading-tight truncate">
              StageFlow YAML Score Authoring Manual
            </h1>
            <span className="text-[10px] font-mono text-text-muted truncate block">
              docs/YAML_AUTHORING_GUIDE.md · Standalone Reference
            </span>
          </div>
        </div>

        {/* Action Controls: Theme Switcher & Studio Return */}
        <div className="flex items-center gap-2 shrink-0">
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
            placeholder="Search guide (e.g. arc, roll, 85mm)..."
            className="w-full pl-8 pr-2.5 py-1 text-xs font-mono bg-surface border border-border-main rounded-md text-text-main placeholder-text-muted focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar text-[11px] font-mono">
          {SECTION_SHORTCUTS.map((sec) => (
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
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold font-sans text-text-main mt-8 mb-4 pb-2 border-b border-border-main flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-500 inline shrink-0" />
                <span>{children}</span>
              </h1>
            ),
            h2: ({ children }) => {
              const text = getNodeText(children);
              const slug = slugify(text);
              const match = text.match(/^(\d+)\./);
              const sectionId = match ? `section-${match[1]}` : slug;
              return (
                <h2
                  id={sectionId}
                  data-slug={slug}
                  className="text-lg font-bold font-sans text-text-main mt-8 mb-3 pb-1.5 border-b border-border-subtle scroll-mt-32"
                >
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => (
              <h3 className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-6 mb-2 uppercase tracking-wide">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-sm font-sans text-text-body leading-relaxed my-3">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-1.5 my-3 text-sm text-text-body pl-3">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-1.5 my-3 text-sm text-text-body pl-3">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="text-sm text-text-body leading-relaxed">{children}</li>,
            table: ({ children }) => (
              <div className="w-full overflow-x-auto custom-scrollbar my-5 rounded-xl border border-border-main bg-surface shadow-2xs">
                <table className="w-full text-left border-collapse text-xs font-mono">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-surface-muted text-text-main text-xs border-b border-border-main">{children}</thead>,
            th: ({ children }) => <th className="px-4 py-2.5 font-bold text-text-main">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2 border-b border-border-subtle/60 text-xs text-text-body">{children}</td>,
            pre: ({ children }) => (
              <pre className="p-4 my-4 rounded-xl bg-surface-muted border border-border-main font-mono text-xs text-text-main overflow-x-auto custom-scrollbar leading-relaxed shadow-inner">
                {children}
              </pre>
            ),
            code: ({ className, children }) => {
              if (!className) {
                return (
                  <code className="px-1.5 py-0.5 rounded bg-surface-subtle text-amber-600 dark:text-amber-400 font-mono text-xs border border-border-subtle">
                    {children}
                  </code>
                );
              }
              return <code>{children}</code>;
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-amber-500 bg-amber-500/10 px-4 py-2.5 rounded-r-lg my-4 text-sm italic text-text-body">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-8 border-t border-border-subtle" />,
          }}
        >
          {displayedContent}
        </ReactMarkdown>
      </main>
    </div>
  );
};
