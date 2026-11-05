/**
 * Accessible Score Library Modal for StageFlow.
 * Displays bundled factory blueprints and custom user scores with rich metadata
 * (duration, shot count, aspect ratio, persistence status) and 1-click loading.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Plus,
  FolderKanban,
  X,
  Search,
} from 'lucide-react';
import type { ScoreCatalogItem } from '../core/scoreCatalog';
import { ScoreLibraryCard } from './library/ScoreLibraryCard';

export interface ScoreLibraryModalProps {
  isOpen: boolean;
  catalog: ScoreCatalogItem[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onCreateBlankScore?: () => void;
  onOpenManageScores?: () => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'bundled' | 'custom';

export const ScoreLibraryModal: React.FC<ScoreLibraryModalProps> = ({
  isOpen,
  catalog,
  activeSceneId,
  onSelectScene,
  onCreateBlankScore,
  onOpenManageScores,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const bundledScores = useMemo(
    () => catalog.filter((item) => !item.isCustom),
    [catalog]
  );
  const customScores = useMemo(
    () => catalog.filter((item) => item.isCustom),
    [catalog]
  );

  const filteredScores = useMemo(() => {
    let list = catalog;
    if (activeTab === 'bundled') list = bundledScores;
    if (activeTab === 'custom') list = customScores;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
    );
  }, [catalog, activeTab, bundledScores, customScores, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-library-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0a0f1d] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="score-library-title"
                className="text-base font-semibold font-sans text-slate-100 tracking-tight"
              >
                Choreography Score Library
              </h2>
              <span className="text-xs font-sans text-slate-400 truncate block mt-0.5">
                Explore bundled blueprint scores and custom saved scenes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onCreateBlankScore && (
              <button
                type="button"
                onClick={() => {
                  onCreateBlankScore();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Create a new blank choreography score"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline font-medium">New Blank</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close score library"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs font-sans">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bundled')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'bundled'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bundled ({bundledScores.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom ({customScores.length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scores by title, note..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-sans text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
            />
          </div>
        </div>

        {/* Scores Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScores.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 font-sans text-sm">
              No choreography scores found matching your criteria.
            </div>
          ) : (
            filteredScores.map((item) => (
              <ScoreLibraryCard
                key={item.id}
                item={item}
                isActive={item.id === activeSceneId}
                onSelect={() => {
                  onSelectScene(item.id);
                  onClose();
                }}
              />
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/90 bg-slate-950/70 flex items-center justify-between gap-3 text-xs font-sans">
          {onOpenManageScores && customScores.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onOpenManageScores();
                onClose();
              }}
              className="text-slate-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Custom Scores ({customScores.length})</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              YAML is the Single Source of Truth
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer font-mono text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
