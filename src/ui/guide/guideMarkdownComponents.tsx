/**
 * Custom ReactMarkdown component renderers for ScoreAuthoringGuideView.
 * Provides accessible typography, LaTeX styling, theme-aware code blocks,
 * and deterministic section jump targets.
 */

import type { Components } from 'react-markdown';
import { BookOpen } from 'lucide-react';
import { getNodeText, slugify } from './guideUtils';

export const createGuideMarkdownComponents = (): Components => ({
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
  li: ({ children }) => (
    <li className="text-sm text-text-body leading-relaxed">{children}</li>
  ),
  table: ({ children }) => (
    <div className="w-full overflow-x-auto custom-scrollbar my-5 rounded-xl border border-border-main bg-surface shadow-2xs">
      <table className="w-full text-left border-collapse text-xs font-mono">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-muted text-text-main text-xs border-b border-border-main">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 font-bold text-text-main">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 border-b border-border-subtle/60 text-xs text-text-body">{children}</td>
  ),
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
});
