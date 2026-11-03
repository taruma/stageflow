/**
 * Visual badge indicating score persistence state (Bundled baseline vs. IndexedDB draft).
 */

import React from 'react';
import { Database, FileCode2, Sparkles, RefreshCw } from 'lucide-react';

export type StoragePersistenceStatus =
  | 'bundled'
  | 'draft-saved'
  | 'custom'
  | 'saving';

export interface StorageStatusBadgeProps {
  status: StoragePersistenceStatus;
  className?: string;
}

export const StorageStatusBadge: React.FC<StorageStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  if (status === 'saving') {
    return (
      <span
        title="Auto-saving score draft to browser IndexedDB"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse ${className}`}
      >
        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        <span>Saving Draft...</span>
      </span>
    );
  }

  if (status === 'draft-saved') {
    return (
      <span
        title="Custom edits are safely stored in browser IndexedDB"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 ${className}`}
      >
        <Database className="w-2.5 h-2.5 text-emerald-400" />
        <span>Draft (IndexedDB)</span>
      </span>
    );
  }

  if (status === 'custom') {
    return (
      <span
        title="Custom imported scene saved in browser IndexedDB"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 border border-sky-500/30 text-sky-300 ${className}`}
      >
        <FileCode2 className="w-2.5 h-2.5 text-sky-400" />
        <span>Custom (IndexedDB)</span>
      </span>
    );
  }

  return (
    <span
      title="Unmodified pristine bundled score preset"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800/60 border border-slate-700/60 text-slate-400 ${className}`}
    >
      <Sparkles className="w-2.5 h-2.5 text-slate-500" />
      <span>Bundled Baseline</span>
    </span>
  );
};
