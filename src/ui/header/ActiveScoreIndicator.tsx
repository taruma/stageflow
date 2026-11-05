/**
 * ActiveScoreIndicator Component for StageFlow Studio Header.
 * Displays the currently loaded score title and persistence status in an interactive pill.
 * Clicking opens the Score Library modal (Option A).
 */

import React from 'react';
import { Film } from 'lucide-react';
import type { ScoreCatalogItem } from '../../core/scoreCatalog';
import type { StoragePersistenceStatus } from '../../core/types';
import { StorageStatusBadge } from '../StorageStatusBadge';

export interface ActiveScoreIndicatorProps {
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  storageStatus?: StoragePersistenceStatus;
  onOpenLibrary: () => void;
}

export const ActiveScoreIndicator: React.FC<ActiveScoreIndicatorProps> = ({
  catalog,
  activeSceneId,
  storageStatus = 'bundled',
  onOpenLibrary,
}) => {
  const activeItem = catalog.find((item) => item.id === activeSceneId);
  const activeTitle = activeItem?.title || activeSceneId;

  return (
    <button
      type="button"
      onClick={onOpenLibrary}
      className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-sky-500/40 transition-colors cursor-pointer min-w-0 max-w-[240px] sm:max-w-[320px] text-left group"
      title={`Active Score: "${activeTitle}" — Click to open Score Library`}
    >
      <Film className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover:text-sky-300 transition-colors" />
      <span className="text-xs font-mono text-slate-200 group-hover:text-white truncate">
        {activeTitle}
      </span>
      <StorageStatusBadge
        status={storageStatus}
        className="hidden sm:inline-flex shrink-0"
      />
    </button>
  );
};
